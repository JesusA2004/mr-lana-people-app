import { zodResolver } from '@hookform/resolvers/zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { BackHandler, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { z } from 'zod';

import { solicitudesApi } from '@/api/solicitudes';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ExitConfirmSheet } from '@/components/ExitConfirmSheet';
import { Input } from '@/components/Input';
import { MascotBubble } from '@/components/mascot/MascotBubble';
import { PermissionPrimerSheet, type PermissionPrimerKind } from '@/components/PermissionPrimerSheet';
import { PressableScale } from '@/components/PressableScale';
import { Stepper } from '@/components/Stepper';
import { SuccessCheck } from '@/components/SuccessCheck';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { MascotMessages } from '@/constants/mascotMessages';
import { useSolicitudesConfiguracion } from '@/hooks/queries/useSolicitudesConfiguracion';
import { useCreateSolicitud } from '@/hooks/queries/useSolicitudes';
import { toast } from '@/store/toastStore';
import { REQUEST_TYPES_WITH_DATE_RANGE, type RequestType, type Solicitud } from '@/types/request';
import { formatDateLong, isDateBefore, toApiDateString } from '@/utils/dates';
import { getErrorMessage, getValidationErrors, logError } from '@/utils/errors';
import { haptics } from '@/utils/haptics';

interface RequestTypeOption {
  tipo: RequestType;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
}

/** Catálogo cosmético (ícono/descripción) confirmado contra App\Enums\TipoSolicitudInterna — las reglas reales (fechas/adjuntos) vienen de `solicitudesApi.getConfiguracion()`. */
const REQUEST_TYPE_OPTIONS: RequestTypeOption[] = [
  { tipo: 'permiso_con_goce', icon: 'checkmark-done-outline', label: 'Permiso con goce', description: 'Solicita ausencia manteniendo tu sueldo.' },
  { tipo: 'permiso_sin_goce', icon: 'exit-outline', label: 'Permiso sin goce', description: 'Solicita una ausencia sin percepción salarial.' },
  { tipo: 'incapacidad', icon: 'medkit-outline', label: 'Incapacidad', description: 'Registra una incapacidad médica.' },
  { tipo: 'constancia_laboral', icon: 'document-text-outline', label: 'Constancia laboral', description: 'Solicita una constancia emitida por RH.' },
  { tipo: 'actualizacion_datos', icon: 'person-outline', label: 'Actualización de datos', description: 'Solicita cambios en tu información.' },
  { tipo: 'actualizacion_bancaria', icon: 'card-outline', label: 'Actualización bancaria', description: 'Actualiza tus datos de pago.' },
  { tipo: 'reposicion_documental', icon: 'reader-outline', label: 'Reposición documental', description: 'Solicita apoyo con documentación.' },
  { tipo: 'prestamo_interno', icon: 'cash-outline', label: 'Préstamo interno', description: 'Solicita un préstamo interno.' },
  { tipo: 'general', icon: 'chatbubble-ellipses-outline', label: 'Solicitud general', description: '¿Necesitas algo diferente? Escríbenos.' },
];

const schema = z
  .object({
    tipo: z.string().min(1, 'Selecciona un tipo de solicitud'),
    motivo: z.string().min(1, 'Cuéntanos el motivo de tu solicitud').max(2000),
    observaciones: z.string().max(2000).optional(),
    fechaInicio: z.date().optional(),
    fechaFin: z.date().optional(),
  })
  .refine((data) => !data.fechaFin || !data.fechaInicio || !isDateBefore(data.fechaFin, data.fechaInicio), {
    message: 'La fecha de fin no puede ser anterior a la fecha de inicio',
    path: ['fechaFin'],
  });

type FormValues = z.infer<typeof schema>;

interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}

const MAX_ATTACHMENT_MB = 20;

export default function NuevaSolicitudScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tipo?: string }>();
  const [step, setStep] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [sentSolicitud, setSentSolicitud] = useState<Solicitud | null>(null);
  const [exitConfirmVisible, setExitConfirmVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<PickedFile[]>([]);
  const [permissionPrimer, setPermissionPrimer] = useState<{ kind: PermissionPrimerKind; blocked: boolean } | null>(null);
  const createMutation = useCreateSolicitud();
  const { data: configuracion } = useSolicitudesConfiguracion();

  const {
    control,
    handleSubmit,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { tipo: params.tipo ?? '', motivo: '', observaciones: '', fechaInicio: undefined, fechaFin: undefined },
  });

  const formValues = useWatch({ control });
  const selectedTipo = formValues.tipo ?? '';
  const selectedConfig = configuracion?.find((item) => item.tipo === selectedTipo);
  // Mientras la configuración remota carga, el catálogo local de tipos con
  // rango de fechas sigue siendo un respaldo 100% funcional (AGENTS.md
  // sección 45) — nunca bloquea el wizard.
  const needsDateRange = selectedConfig ? selectedConfig.requires_dates : REQUEST_TYPES_WITH_DATE_RANGE.includes(selectedTipo as RequestType);
  const allowsAttachments = selectedConfig?.allows_attachments ?? false;
  const attachmentRequired = selectedConfig?.attachment_required ?? false;
  const selectedOption = REQUEST_TYPE_OPTIONS.find((option) => option.tipo === selectedTipo);
  const [activePicker, setActivePicker] = useState<'inicio' | 'fin' | null>(null);

  const stepKeys = useMemo(
    () => ['tipo', 'informacion', ...(allowsAttachments ? (['adjuntos'] as const) : []), 'revisar'] as const,
    [allowsAttachments],
  );
  const stepLabels = useMemo(
    () => ['Tipo', 'Información', ...(allowsAttachments ? ['Adjuntos'] : []), 'Revisar'],
    [allowsAttachments],
  );
  // Si el tipo cambia y el paso "Adjuntos" deja de existir (o aparece), el
  // índice se acota en el propio render — nunca queda apuntando fuera de
  // rango sin necesidad de sincronizarlo con un efecto.
  const clampedStep = Math.min(step, stepKeys.length - 1);
  const currentStepKey = stepKeys[clampedStep];

  const fechasResumen = useMemo(
    () =>
      [formValues.fechaInicio, formValues.fechaFin]
        .filter((date): date is Date => Boolean(date))
        .map((date) => formatDateLong(toApiDateString(date)))
        .join(' — '),
    [formValues.fechaInicio, formValues.fechaFin],
  );

  const goNext = async () => {
    if (currentStepKey === 'tipo') {
      const valid = await trigger('tipo');
      if (!valid) {
        haptics.warning();
        toast.warning('Selecciona un tipo de solicitud para continuar.');
        return;
      }
      setStep((current) => current + 1);
      return;
    }
    if (currentStepKey === 'informacion') {
      const fields: (keyof FormValues)[] = needsDateRange ? ['motivo', 'fechaInicio', 'fechaFin'] : ['motivo'];
      const valid = await trigger(fields);
      if (!valid) {
        haptics.warning();
        return;
      }
      setStep((current) => current + 1);
      return;
    }
    if (currentStepKey === 'adjuntos') {
      if (attachmentRequired && attachments.length === 0) {
        haptics.warning();
        toast.warning('Este tipo de solicitud requiere al menos un adjunto.');
        return;
      }
      setStep((current) => current + 1);
    }
  };

  const hasUnsavedChanges = Boolean(formValues.tipo) || Boolean(formValues.motivo?.trim());

  const goBack = () => {
    if (step === 0) {
      if (hasUnsavedChanges) {
        setExitConfirmVisible(true);
        return;
      }
      router.back();
      return;
    }
    setStep((current) => current - 1);
  };

  useEffect(() => {
    // Botón físico "atrás" de Android: mismo criterio que el back del
    // header — nunca perder el formulario por un back accidental. El
    // swipe-to-dismiss de iOS ya está desactivado para esta ruta
    // (`gestureEnabled: false` en `(app)/_layout.tsx`).
    if (Platform.OS !== 'android' || sentSolicitud) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      goBack();
      return true;
    });
    return () => subscription.remove();
  });

  const validateSize = (size?: number): boolean => {
    if (!size) return true;
    if (size > MAX_ATTACHMENT_MB * 1024 * 1024) {
      toast.error(`El archivo supera el límite de ${MAX_ATTACHMENT_MB} MB.`);
      return false;
    }
    return true;
  };

  const launchCamera = async () => {
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (!validateSize(asset.fileSize)) return;
    setAttachments((current) => [
      ...current,
      { uri: asset.uri, name: asset.fileName ?? `foto-${Date.now()}.jpg`, mimeType: asset.mimeType ?? 'image/jpeg', size: asset.fileSize },
    ]);
  };

  const launchGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, mediaTypes: ['images'] });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (!validateSize(asset.fileSize)) return;
    setAttachments((current) => [
      ...current,
      { uri: asset.uri, name: asset.fileName ?? `imagen-${Date.now()}.jpg`, mimeType: asset.mimeType ?? 'image/jpeg', size: asset.fileSize },
    ]);
  };

  const pickFromCamera = async () => {
    const current = await ImagePicker.getCameraPermissionsAsync();
    if (current.granted) {
      await launchCamera();
      return;
    }
    setPermissionPrimer({ kind: 'camera', blocked: current.status === 'denied' && !current.canAskAgain });
  };

  const pickFromGallery = async () => {
    const current = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (current.granted) {
      await launchGallery();
      return;
    }
    setPermissionPrimer({ kind: 'gallery', blocked: current.status === 'denied' && !current.canAskAgain });
  };

  const handlePermissionConfirm = async () => {
    if (!permissionPrimer) return;
    const { kind } = permissionPrimer;
    setPermissionPrimer(null);

    if (kind === 'camera') {
      const result = await ImagePicker.requestCameraPermissionsAsync();
      if (result.granted) await launchCamera();
      else if (!result.canAskAgain) setPermissionPrimer({ kind: 'camera', blocked: true });
    } else {
      const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (result.granted) await launchGallery();
      else if (!result.canAskAgain) setPermissionPrimer({ kind: 'gallery', blocked: true });
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (!validateSize(asset.size ?? undefined)) return;
    setAttachments((current) => [
      ...current,
      { uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? 'application/pdf', size: asset.size ?? undefined },
    ]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((current) => current.filter((_, i) => i !== index));
  };

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    setSubmitting(true);
    try {
      // Flujo transaccional (AGENTS.md sección 45): crear primero → obtener
      // id → adjuntar cada archivo. Un fallo parcial de adjuntos NUNCA
      // pierde la solicitud ya creada — solo se avisa al usuario.
      const solicitud = await createMutation.mutateAsync({
        tipo: values.tipo,
        motivo: values.motivo.trim(),
        observaciones: values.observaciones?.trim() || undefined,
        fecha_inicio: values.fechaInicio ? toApiDateString(values.fechaInicio) : undefined,
        fecha_fin: values.fechaFin ? toApiDateString(values.fechaFin) : undefined,
      });

      if (attachments.length > 0) {
        let failedCount = 0;
        for (const file of attachments) {
          try {
            // Subidas en orden, no en paralelo, para no saturar la conexión del colaborador.
            await solicitudesApi.addAttachment(solicitud.id, file);
          } catch (attachmentError) {
            failedCount += 1;
            logError('solicitudes.addAttachment', attachmentError);
          }
        }
        if (failedCount > 0) {
          toast.warning(
            failedCount === attachments.length
              ? 'Enviamos tu solicitud, pero no pudimos subir tus adjuntos. Intenta agregarlos más tarde.'
              : `Enviamos tu solicitud, pero ${failedCount} de ${attachments.length} adjuntos no se subieron.`,
          );
        }
      }

      setSentSolicitud(solicitud);
    } catch (error) {
      logError('solicitudes.create', error);
      const validation = getValidationErrors(error);
      const firstValidationMessage = validation ? Object.values(validation)[0]?.[0] : undefined;
      setFormError(firstValidationMessage ?? getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (sentSolicitud) {
    return <SuccessScreen solicitud={sentSolicitud} />;
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Nueva solicitud" showBack onBackPress={goBack} />

      <View style={styles.stepperWrapper}>
        <Stepper steps={stepLabels} currentIndex={clampedStep} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {currentStepKey === 'tipo' ? (
          <Animated.View key="step-tipo" entering={FadeInRight.duration(240)} exiting={FadeOutLeft.duration(160)} style={styles.stepBlock}>
            <MascotBubble message={MascotMessages.wizardTipo} />
            <Text style={styles.title}>¿Qué necesitas solicitar?</Text>
            {errors.tipo ? (
              <View style={styles.inlineErrorBanner}>
                <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                <Text style={styles.inlineErrorText}>{errors.tipo.message}</Text>
              </View>
            ) : null}
            <View style={styles.typeList}>
              {REQUEST_TYPE_OPTIONS.map((option) => {
                const active = selectedTipo === option.tipo;
                return (
                  <PressableScale
                    key={option.tipo}
                    onPress={() => setValue('tipo', option.tipo, { shouldValidate: true })}
                    style={[styles.typeCard, active && styles.typeCardActive] as object}>
                    <View style={[styles.typeIcon, active && styles.typeIconActive]}>
                      <Ionicons name={option.icon} size={22} color={active ? Colors.white : Colors.primaryDark} />
                    </View>
                    <View style={styles.typeText}>
                      <Text style={styles.typeLabel}>{option.label}</Text>
                      <Text style={styles.typeDescription}>{option.description}</Text>
                    </View>
                    {active ? <Ionicons name="checkmark-circle" size={22} color={Colors.primary} /> : null}
                  </PressableScale>
                );
              })}
            </View>
          </Animated.View>
        ) : null}

        {currentStepKey === 'informacion' ? (
          <Animated.View key="step-informacion" entering={FadeInRight.duration(240)} exiting={FadeOutLeft.duration(160)} style={styles.stepBlock}>
            <MascotBubble message={MascotMessages.wizardMotivo} orientation="left" />
            <Text style={styles.title}>{selectedOption?.label ?? 'Cuéntanos más'}</Text>

            <Controller
              control={control}
              name="motivo"
              render={({ field: { value, onChange, onBlur } }) => (
                <Input
                  label="Motivo"
                  placeholder="Describe brevemente tu solicitud"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.motivo?.message}
                  multiline
                  style={styles.multilineInput}
                />
              )}
            />

            <Controller
              control={control}
              name="observaciones"
              render={({ field: { value, onChange, onBlur } }) => (
                <Input
                  label="Observaciones (opcional)"
                  placeholder="Detalle adicional para Recursos Humanos"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  multiline
                  style={styles.multilineInputSmall}
                />
              )}
            />

            {needsDateRange ? (
              <>
                <Controller
                  control={control}
                  name="fechaInicio"
                  render={({ field: { value } }) => (
                    <DateField label="Fecha de inicio" value={value} onPress={() => setActivePicker('inicio')} error={errors.fechaInicio?.message} />
                  )}
                />
                <Controller
                  control={control}
                  name="fechaFin"
                  render={({ field: { value } }) => (
                    <DateField label="Fecha de fin" value={value} onPress={() => setActivePicker('fin')} error={errors.fechaFin?.message} />
                  )}
                />
              </>
            ) : null}
          </Animated.View>
        ) : null}

        {currentStepKey === 'adjuntos' ? (
          <Animated.View key="step-adjuntos" entering={FadeInRight.duration(240)} exiting={FadeOutLeft.duration(160)} style={styles.stepBlock}>
            <Text style={styles.title}>Adjuntos</Text>
            <Text style={styles.stepHelper}>
              {attachmentRequired ? 'Este tipo de solicitud requiere al menos un archivo.' : 'Puedes adjuntar evidencia si lo necesitas (opcional).'}
            </Text>

            <View style={styles.attachmentPickRow}>
              <PressableScale onPress={() => void pickFromCamera()} style={styles.attachmentPickButton}>
                <Ionicons name="camera-outline" size={20} color={Colors.primaryDark} />
                <Text style={styles.attachmentPickLabel}>Cámara</Text>
              </PressableScale>
              <PressableScale onPress={() => void pickFromGallery()} style={styles.attachmentPickButton}>
                <Ionicons name="image-outline" size={20} color={Colors.primaryDark} />
                <Text style={styles.attachmentPickLabel}>Galería</Text>
              </PressableScale>
              <PressableScale onPress={() => void pickDocument()} style={styles.attachmentPickButton}>
                <Ionicons name="document-attach-outline" size={20} color={Colors.primaryDark} />
                <Text style={styles.attachmentPickLabel}>Archivo</Text>
              </PressableScale>
            </View>

            {attachments.length > 0 ? (
              <View style={styles.attachmentList}>
                {attachments.map((file, index) => (
                  <View key={`${file.uri}-${index}`} style={styles.attachmentRow}>
                    <Ionicons name="document-text-outline" size={18} color={Colors.primaryDark} />
                    <Text style={styles.attachmentName} numberOfLines={1}>
                      {file.name}
                    </Text>
                    <PressableScale haptic={false} accessibilityLabel={`Quitar ${file.name}`} onPress={() => removeAttachment(index)}>
                      <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
                    </PressableScale>
                  </View>
                ))}
              </View>
            ) : null}
          </Animated.View>
        ) : null}

        {currentStepKey === 'revisar' ? (
          <Animated.View key="step-revisar" entering={FadeInRight.duration(240)} exiting={FadeOutLeft.duration(160)} style={styles.stepBlock}>
            <MascotBubble message={MascotMessages.wizardRevision} />
            <Text style={styles.title}>Revisa tu solicitud</Text>

            <Card style={{ gap: Spacing.md }}>
              <SummaryRow icon="pricetag-outline" label="Tipo" value={selectedOption?.label ?? '—'} />
              <SummaryRow icon="chatbox-ellipses-outline" label="Motivo" value={formValues.motivo || '—'} />
              {formValues.observaciones ? <SummaryRow icon="reader-outline" label="Observaciones" value={formValues.observaciones} /> : null}
              {needsDateRange ? <SummaryRow icon="calendar-outline" label="Fechas" value={fechasResumen || '—'} /> : null}
              {allowsAttachments ? (
                <SummaryRow icon="attach-outline" label="Adjuntos" value={attachments.length > 0 ? `${attachments.length} archivo(s)` : 'Ninguno'} />
              ) : null}
            </Card>

            <PressableScale haptic={false} onPress={() => setStep(0)} style={styles.editRow}>
              <Ionicons name="create-outline" size={16} color={Colors.primaryDark} />
              <Text style={styles.editText}>Editar</Text>
            </PressableScale>

            {formError ? <Text style={styles.formError}>{formError}</Text> : null}
          </Animated.View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={currentStepKey === 'revisar' ? 'Enviar solicitud' : 'Siguiente'}
          rightIcon={currentStepKey === 'revisar' ? undefined : 'arrow-forward'}
          onPress={currentStepKey === 'revisar' ? handleSubmit(onSubmit) : () => void goNext()}
          loading={submitting}
          disabled={submitting}
        />
      </View>

      {activePicker ? (
        <Controller
          control={control}
          name={activePicker === 'inicio' ? 'fechaInicio' : 'fechaFin'}
          render={({ field: { value, onChange } }) => (
            <DateTimePicker
              value={value ?? new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={(event, selectedDate) => {
                if (Platform.OS !== 'ios') setActivePicker(null);
                if (event.type === 'set' && selectedDate) onChange(selectedDate);
              }}
            />
          )}
        />
      ) : null}
      {activePicker && Platform.OS === 'ios' ? (
        <Button title="Listo" onPress={() => setActivePicker(null)} variant="ghost" style={styles.doneButton} />
      ) : null}

      <PermissionPrimerSheet
        visible={Boolean(permissionPrimer)}
        kind={permissionPrimer?.kind ?? 'camera'}
        blocked={permissionPrimer?.blocked ?? false}
        onClose={() => setPermissionPrimer(null)}
        onConfirm={() => void handlePermissionConfirm()}
      />

      <ExitConfirmSheet
        visible={exitConfirmVisible}
        onContinueEditing={() => setExitConfirmVisible(false)}
        onExit={() => {
          setExitConfirmVisible(false);
          router.back();
        }}
      />
    </View>
  );
}

/** Pantalla de éxito: check animado + "Ver solicitud" / "Volver al inicio". */
function SuccessScreen({ solicitud }: { solicitud: Solicitud }) {
  const router = useRouter();

  return (
    <View style={styles.successContainer}>
      <View style={styles.successBody}>
        <SuccessCheck size={104} />
        <Text style={styles.successTitle}>Solicitud enviada</Text>
        <Text style={styles.successSubtitle}>Te avisaremos cuando haya cambios en tu solicitud.</Text>
        {solicitud.folio ? <Text style={styles.successFolio}>Folio {solicitud.folio}</Text> : null}

        <MascotBubble message={MascotMessages.solicitudEnviada} />
      </View>

      <View style={styles.successActions}>
        <Button
          title="Ver solicitud"
          leftIcon="document-text-outline"
          onPress={() => router.replace({ pathname: '/solicitud/[id]', params: { id: String(solicitud.id) } })}
        />
        <Button title="Volver al inicio" variant="ghost" onPress={() => router.replace('/(app)/(tabs)')} />
      </View>
    </View>
  );
}

function SummaryRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <View style={styles.summaryIcon}>
        <Ionicons name={icon} size={16} color={Colors.primaryDark} />
      </View>
      <View style={styles.summaryText}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={styles.summaryValue}>{value}</Text>
      </View>
    </View>
  );
}

function DateField({
  label,
  value,
  onPress,
  error,
}: {
  label: string;
  value?: Date;
  onPress: () => void;
  error?: string;
}) {
  return (
    <View style={{ gap: Spacing.xs }}>
      <Text style={styles.dateLabel}>{label}</Text>
      <PressableScale haptic={false} onPress={onPress} style={[styles.dateInput, error && styles.dateInputError] as object}>
        <Ionicons name="calendar-outline" size={18} color={Colors.textMuted} />
        <Text style={styles.dateValue}>{value ? formatDateLong(toApiDateString(value)) : 'Selecciona una fecha'}</Text>
      </PressableScale>
      {error ? <Text style={styles.formError}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  stepperWrapper: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: 0,
    gap: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  stepBlock: {
    gap: Spacing.lg,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
  },
  stepHelper: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: -Spacing.md,
  },
  inlineErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.dangerSoft,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  inlineErrorText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.danger,
  },
  typeList: {
    gap: Spacing.sm,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  typeCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
  },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIconActive: {
    backgroundColor: Colors.primary,
  },
  typeText: {
    flex: 1,
  },
  typeLabel: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  typeDescription: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  multilineInput: {
    minHeight: 110,
    textAlignVertical: 'top',
    paddingTop: Spacing.sm,
  },
  multilineInputSmall: {
    minHeight: 70,
    textAlignVertical: 'top',
    paddingTop: Spacing.sm,
  },
  dateLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 52,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  dateInputError: {
    borderColor: Colors.danger,
  },
  dateValue: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
  attachmentPickRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  attachmentPickButton: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
  },
  attachmentPickLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.text,
  },
  attachmentList: {
    gap: Spacing.sm,
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
  },
  attachmentName: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  summaryIcon: {
    width: 30,
    height: 30,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  summaryValue: {
    fontSize: FontSize.md,
    color: Colors.text,
    marginTop: 2,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  editText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  formError: {
    fontSize: FontSize.xs,
    color: Colors.danger,
    fontWeight: '600',
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  doneButton: {
    margin: Spacing.lg,
  },
  successContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'space-between',
    padding: Spacing.xl,
    paddingTop: Spacing.xxxl,
  },
  successBody: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  successTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  successSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  successFolio: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.primaryDark,
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  successActions: {
    gap: Spacing.md,
  },
});
