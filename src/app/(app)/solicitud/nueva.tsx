import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { BackHandler, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';

import { solicitudesApi } from '@/api/solicitudes';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { ExitConfirmSheet } from '@/components/ExitConfirmSheet';
import { DynamicRequestField } from '@/components/forms/DynamicRequestField';
import { MascotBubble } from '@/components/mascot/MascotBubble';
import { PermissionPrimerSheet, type PermissionPrimerKind } from '@/components/PermissionPrimerSheet';
import { PressableScale } from '@/components/PressableScale';
import { SkeletonBlock } from '@/components/SkeletonBlock';
import { Stepper } from '@/components/Stepper';
import { SuccessCheck } from '@/components/SuccessCheck';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { MascotMessages } from '@/constants/mascotMessages';
import { requestFieldCopy, requestTypePresentation, SPECIAL_LEAVE_COPY } from '@/constants/requestTypes';
import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';
import { useCreateSolicitud } from '@/hooks/queries/useSolicitudes';
import { useSolicitudesConfiguracion } from '@/hooks/queries/useSolicitudesConfiguracion';
import { useVacacionesSaldo } from '@/hooks/queries/useVacaciones';
import { toast } from '@/store/toastStore';
import type { KnownRequestType, Solicitud, SolicitudTipoConfig } from '@/types/request';
import { diffInDaysInclusive, formatDateLong, fromApiDateString } from '@/utils/dates';
import { getErrorMessage, getValidationErrors, logError } from '@/utils/errors';
import { haptics } from '@/utils/haptics';
import { buildCreatePayload, findTipoConfig, visibleRequestTypes, type DynamicFormValues } from '@/utils/solicitudesConfig';

interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}

const MAX_ATTACHMENT_MB = 20;

/**
 * Wizard ÚNICO de "Nueva solicitud" — vacaciones incluidas.
 *
 * El formulario se construye recorriendo `campos[]` de
 * `GET /api/v1/solicitudes/configuracion`: no hay un formulario hardcodeado
 * por tipo ni una lista local de tipos. Si el backend agrega un tipo o un
 * campo, aparece aquí sin tocar la app (secciones 5/6/7 del encargo).
 *
 * `?tipo=vacaciones` lo usa la pantalla "Mis vacaciones" para entrar directo
 * al paso de información sin duplicar un segundo formulario (sección 3).
 */
export default function NuevaSolicitudScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tipo?: string }>();

  const configuracion = useSolicitudesConfiguracion();
  const bootstrap = useMobileBootstrap(true);
  const createMutation = useCreateSolicitud();

  const tipos = useMemo(
    () => visibleRequestTypes(configuracion.data, bootstrap.data?.user.permissions),
    [configuracion.data, bootstrap.data?.user.permissions],
  );

  const [selectedTipo, setSelectedTipo] = useState<string>(params.tipo ?? '');
  const [values, setValues] = useState<DynamicFormValues>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedEmployeeName, setSelectedEmployeeName] = useState<string | undefined>();
  const [step, setStep] = useState(params.tipo ? 1 : 0);
  const [attachments, setAttachments] = useState<PickedFile[]>([]);
  const [permissionPrimer, setPermissionPrimer] = useState<{ kind: PermissionPrimerKind; blocked: boolean } | null>(null);
  const [exitConfirmVisible, setExitConfirmVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [sentSolicitud, setSentSolicitud] = useState<Solicitud | null>(null);

  const config = findTipoConfig(tipos, selectedTipo);
  const presentation = requestTypePresentation(selectedTipo);

  // El saldo solo importa para vacaciones; se consulta siempre (es barato y
  // suele estar en caché por la pantalla de Vacaciones) pero solo se pinta
  // cuando el tipo elegido lo necesita.
  const saldoQuery = useVacacionesSaldo();
  const diasDisponibles = saldoQuery.data?.dias_disponibles;
  const esVacaciones = selectedTipo === 'vacaciones';

  const stepKeys = useMemo(
    () => ['tipo', 'informacion', ...(config?.permite_adjuntos ? (['adjuntos'] as const) : []), 'revisar'] as const,
    [config?.permite_adjuntos],
  );
  const stepLabels = useMemo(
    () => ['Tipo', 'Información', ...(config?.permite_adjuntos ? ['Adjuntos'] : []), 'Revisar'],
    [config?.permite_adjuntos],
  );
  const clampedStep = Math.min(step, stepKeys.length - 1);
  const currentStepKey = stepKeys[clampedStep];

  /**
   * Estimación de días para vacaciones: se prellena `dias_solicitados` en
   * cuanto hay rango, pero el colaborador puede corregirlo y el backend es
   * quien valida contra el saldo real.
   */
  const estimatedDays = useMemo(() => {
    const inicio = fromApiDateString(typeof values.fecha_inicio === 'string' ? values.fecha_inicio : undefined);
    const fin = fromApiDateString(typeof values.fecha_fin === 'string' ? values.fecha_fin : undefined);
    if (!inicio || !fin || fin < inicio) return undefined;
    return diffInDaysInclusive(inicio, fin);
  }, [values.fecha_inicio, values.fecha_fin]);

  const setValue = (name: string, value: string | number | undefined) => {
    setValues((current) => {
      const next = { ...current, [name]: value };

      // Prellenado de `dias_solicitados` al completar el rango: se hace aquí,
      // al capturar la fecha, y no en un efecto — así no hay un render extra
      // en cascada. Solo se rellena si el campo sigue vacío: si el
      // colaborador ya escribió un número, manda el suyo.
      if (config?.requiere_dias && (name === 'fecha_inicio' || name === 'fecha_fin') && next.dias_solicitados === undefined) {
        const inicio = fromApiDateString(typeof next.fecha_inicio === 'string' ? next.fecha_inicio : undefined);
        const fin = fromApiDateString(typeof next.fecha_fin === 'string' ? next.fecha_fin : undefined);
        if (inicio && fin && fin >= inicio) next.dias_solicitados = diffInDaysInclusive(inicio, fin);
      }

      return next;
    });

    setFieldErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  };

  const selectTipo = (clave: string) => {
    if (clave === selectedTipo) return;
    // Cambiar de tipo cambia los campos: arrastrar valores de otro tipo solo
    // produciría un 422 con claves que este tipo ni pide.
    setSelectedTipo(clave);
    setValues({});
    setFieldErrors({});
    setSelectedEmployeeName(undefined);
    setAttachments([]);
    setFormError(null);
  };

  /** Validación de presencia únicamente — las reglas de negocio las manda el backend. */
  const validateInformacion = (): boolean => {
    if (!config) return false;
    const errors: Record<string, string> = {};

    for (const campo of config.campos) {
      if (!campo.required) continue;
      const value = values[campo.name];
      if (value === undefined || value === null || String(value).trim() === '') {
        errors[campo.name] = `${requestFieldCopy(campo.name).label} es obligatorio`;
      }
    }

    const inicio = fromApiDateString(typeof values.fecha_inicio === 'string' ? values.fecha_inicio : undefined);
    const fin = fromApiDateString(typeof values.fecha_fin === 'string' ? values.fecha_fin : undefined);
    if (inicio && fin && fin < inicio) {
      errors.fecha_fin = 'La fecha de fin no puede ser anterior a la fecha de inicio';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const goNext = () => {
    if (currentStepKey === 'tipo') {
      if (!config) {
        haptics.warning();
        toast.warning('Selecciona un tipo de solicitud para continuar.');
        return;
      }
      setStep((current) => current + 1);
      return;
    }
    if (currentStepKey === 'informacion') {
      if (!validateInformacion()) {
        haptics.warning();
        return;
      }
      setStep((current) => current + 1);
      return;
    }
    if (currentStepKey === 'adjuntos') {
      setStep((current) => current + 1);
    }
  };

  const hasUnsavedChanges = Boolean(selectedTipo) || Object.values(values).some((value) => value !== undefined && value !== '');

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
    // Botón físico "atrás" de Android: mismo criterio que el back del header.
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

  const onSubmit = async () => {
    if (!config || submitting) return;
    setFormError(null);
    setSubmitting(true);

    try {
      // Transaccional: crear primero → obtener id → adjuntar. Un fallo de
      // adjuntos nunca pierde la solicitud ya creada.
      const solicitud = await createMutation.mutateAsync(buildCreatePayload(config, values));

      if (attachments.length > 0) {
        let failedCount = 0;
        for (const file of attachments) {
          try {
            // En orden, no en paralelo, para no saturar la conexión.
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

      if (validation) {
        // El backend responde 422 con las claves EXACTAS del payload, así
        // que cada mensaje se puede anclar a su campo.
        const mapped: Record<string, string> = {};
        for (const [key, messages] of Object.entries(validation)) {
          const first = messages?.[0];
          if (first) mapped[key] = first;
        }
        setFieldErrors(mapped);
        setFormError(Object.values(mapped)[0] ?? getErrorMessage(error));
        setStep(stepKeys.indexOf('informacion'));
        return;
      }

      // Timeout/red caída DESPUÉS del POST: el servidor pudo haberla creado.
      // Nunca se reintenta solo — eso duplicaría la solicitud (sección 43).
      if (isInconclusive(error)) {
        setUnconfirmed(true);
        return;
      }

      setFormError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (sentSolicitud) return <SuccessScreen solicitud={sentSolicitud} />;
  if (unconfirmed) return <UnconfirmedScreen />;

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

            {configuracion.isLoading ? (
              <View style={{ gap: Spacing.md }}>
                <SkeletonBlock height={72} radius={Radius.lg} />
                <SkeletonBlock height={72} radius={Radius.lg} />
                <SkeletonBlock height={72} radius={Radius.lg} />
              </View>
            ) : configuracion.isError ? (
              <ErrorState message={getErrorMessage(configuracion.error)} onRetry={() => void configuracion.refetch()} />
            ) : tipos.length === 0 ? (
              <Text style={styles.stepHelper}>Tu empresa todavía no tiene tipos de solicitud habilitados.</Text>
            ) : (
              <View style={styles.typeList}>
                {tipos.map((tipo) => (
                  <TypeCard key={tipo.clave} tipo={tipo} active={selectedTipo === tipo.clave} onPress={() => selectTipo(tipo.clave)} />
                ))}
              </View>
            )}
          </Animated.View>
        ) : null}

        {currentStepKey === 'informacion' && config ? (
          <Animated.View key="step-informacion" entering={FadeInRight.duration(240)} exiting={FadeOutLeft.duration(160)} style={styles.stepBlock}>
            <MascotBubble message={MascotMessages.wizardMotivo} orientation="left" />
            <Text style={styles.title}>{config.nombre}</Text>

            {SPECIAL_LEAVE_COPY[config.clave as KnownRequestType] ? (
              <View style={styles.noteBanner}>
                <Ionicons name="information-circle-outline" size={18} color={Colors.primaryDark} />
                <Text style={styles.noteText}>{SPECIAL_LEAVE_COPY[config.clave as KnownRequestType]}</Text>
              </View>
            ) : null}

            {esVacaciones ? (
              <View style={styles.balanceBanner}>
                <Ionicons name="airplane-outline" size={18} color={Colors.primaryDark} />
                <Text style={styles.balanceText}>
                  {typeof diasDisponibles === 'number'
                    ? `Tienes ${diasDisponibles} ${diasDisponibles === 1 ? 'día disponible' : 'días disponibles'}. Recursos Humanos valida el saldo final.`
                    : 'Recursos Humanos valida tu saldo disponible al revisar la solicitud.'}
                </Text>
              </View>
            ) : null}

            {config.requiere_horario ? (
              <View style={styles.noteBanner}>
                <Ionicons name="time-outline" size={18} color={Colors.primaryDark} />
                {/* El backend solo pide `fecha_inicio` para los tipos por horas
                    (no hay campo de hora en `tiposConFormulario`), así que la
                    hora exacta se acuerda en el motivo — la app no inventa un
                    campo que la API rechazaría (sección 8). */}
                <Text style={styles.noteText}>Indica el horario exacto dentro del motivo: el formato oficial se genera con ese detalle.</Text>
              </View>
            ) : null}

            <View style={styles.fieldList}>
              {config.campos.map((campo) => (
                <DynamicRequestField
                  key={campo.name}
                  campo={campo}
                  value={values[campo.name]}
                  onChange={(value) => setValue(campo.name, value)}
                  error={fieldErrors[campo.name]}
                  selectedEmployeeName={selectedEmployeeName}
                  onSelectEmployee={(_id, nombre) => setSelectedEmployeeName(nombre)}
                />
              ))}
            </View>

            {config.requiere_dias && estimatedDays !== undefined ? (
              <Text style={styles.stepHelper}>
                Estimamos {estimatedDays} {estimatedDays === 1 ? 'día' : 'días'} naturales en ese rango.
              </Text>
            ) : null}
          </Animated.View>
        ) : null}

        {currentStepKey === 'adjuntos' ? (
          <Animated.View key="step-adjuntos" entering={FadeInRight.duration(240)} exiting={FadeOutLeft.duration(160)} style={styles.stepBlock}>
            <Text style={styles.title}>Adjuntos</Text>
            <Text style={styles.stepHelper}>
              {selectedTipo === 'incapacidad'
                ? 'Adjunta tu certificado o incapacidad. Solo Recursos Humanos puede verlo.'
                : 'Puedes adjuntar evidencia si lo necesitas (opcional).'}
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

        {currentStepKey === 'revisar' && config ? (
          <Animated.View key="step-revisar" entering={FadeInRight.duration(240)} exiting={FadeOutLeft.duration(160)} style={styles.stepBlock}>
            <MascotBubble message={MascotMessages.wizardRevision} />
            <Text style={styles.title}>Revisa tu solicitud</Text>

            <Card style={{ gap: Spacing.md }}>
              <SummaryRow icon={presentation.icon} label="Tipo" value={config.nombre} />
              {config.campos.map((campo) => (
                <SummaryRow
                  key={campo.name}
                  icon="ellipse-outline"
                  label={requestFieldCopy(campo.name).label}
                  value={summaryValue(campo.name, values[campo.name], selectedEmployeeName)}
                />
              ))}
              {config.permite_adjuntos ? (
                <SummaryRow icon="attach-outline" label="Adjuntos" value={attachments.length > 0 ? `${attachments.length} archivo(s)` : 'Ninguno'} />
              ) : null}
            </Card>

            <PressableScale haptic={false} onPress={() => setStep(stepKeys.indexOf('informacion'))} style={styles.editRow}>
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
          onPress={currentStepKey === 'revisar' ? () => void onSubmit() : goNext}
          loading={submitting}
          // Mientras el POST está en vuelo el botón queda inerte: doble toque
          // = doble solicitud (sección 43).
          disabled={submitting || (currentStepKey === 'tipo' && !config)}
        />
      </View>

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

/** ¿El error dejó la solicitud en un estado desconocido (timeout/red) en vez de un rechazo claro del servidor? */
function isInconclusive(error: unknown): boolean {
  const candidate = error as { response?: unknown } | null | undefined;
  return !candidate?.response;
}

function summaryValue(name: string, value: string | number | undefined, employeeName?: string): string {
  if (value === undefined || value === null || value === '') return '—';
  if (name === 'colaborador_objetivo_id') return employeeName ?? `#${value}`;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDateLong(value);
  return String(value);
}

function TypeCard({ tipo, active, onPress }: { tipo: SolicitudTipoConfig; active: boolean; onPress: () => void }) {
  const presentation = requestTypePresentation(tipo.clave);

  return (
    <PressableScale onPress={onPress} style={[styles.typeCard, active && styles.typeCardActive] as object}>
      <View style={[styles.typeIcon, active && styles.typeIconActive]}>
        <Ionicons name={presentation.icon} size={22} color={active ? Colors.white : Colors.primaryDark} />
      </View>
      <View style={styles.typeText}>
        <Text style={styles.typeLabel}>{tipo.nombre}</Text>
        <Text style={styles.typeDescription}>{presentation.description}</Text>
      </View>
      {active ? <Ionicons name="checkmark-circle" size={22} color={Colors.primary} /> : null}
    </PressableScale>
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

/**
 * El POST salió pero nunca llegó la respuesta. Reenviar automáticamente
 * crearía un duplicado, así que la app se detiene y manda al usuario a
 * revisar su lista antes de volver a intentar (sección 43).
 */
function UnconfirmedScreen() {
  const router = useRouter();

  return (
    <View style={styles.successContainer}>
      <View style={styles.successBody}>
        <View style={styles.unconfirmedIcon}>
          <Ionicons name="help-circle-outline" size={56} color={Colors.warning} />
        </View>
        <Text style={styles.successTitle}>No pudimos confirmar el envío</Text>
        <Text style={styles.successSubtitle}>
          No pudimos confirmar si la solicitud fue enviada. Actualiza tu lista antes de volver a intentarlo.
        </Text>
      </View>

      <View style={styles.successActions}>
        <Button title="Ver mis solicitudes" leftIcon="list-outline" onPress={() => router.replace('/(app)/(tabs)/solicitudes')} />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  stepperWrapper: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  content: { padding: Spacing.lg, paddingTop: 0, paddingBottom: Spacing.xxl, gap: Spacing.lg },
  stepBlock: { gap: Spacing.lg },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text },
  stepHelper: { fontSize: FontSize.sm, color: Colors.textMuted },
  fieldList: { gap: Spacing.lg },
  typeList: { gap: Spacing.md },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  typeCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIconActive: { backgroundColor: Colors.primary },
  typeText: { flex: 1 },
  typeLabel: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  typeDescription: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  noteBanner: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'flex-start',
  },
  noteText: { flex: 1, fontSize: FontSize.xs, color: Colors.text, lineHeight: 18 },
  balanceBanner: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.infoSoft,
    alignItems: 'flex-start',
  },
  balanceText: { flex: 1, fontSize: FontSize.xs, color: Colors.text, lineHeight: 18 },
  attachmentPickRow: { flexDirection: 'row', gap: Spacing.sm },
  attachmentPickButton: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  attachmentPickLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primaryDark },
  attachmentList: { gap: Spacing.sm },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  attachmentName: { flex: 1, fontSize: FontSize.sm, color: Colors.text },
  summaryRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: { flex: 1 },
  summaryLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600' },
  summaryValue: { fontSize: FontSize.md, color: Colors.text, marginTop: 2 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, alignSelf: 'flex-start' },
  editText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primaryDark },
  formError: { fontSize: FontSize.sm, color: Colors.danger, fontWeight: '600' },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  successContainer: { flex: 1, backgroundColor: Colors.background, justifyContent: 'space-between', padding: Spacing.lg },
  successBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  successTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  successSubtitle: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: Spacing.lg },
  successFolio: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primaryDark },
  successActions: { gap: Spacing.md },
  unconfirmedIcon: {
    width: 104,
    height: 104,
    borderRadius: Radius.full,
    backgroundColor: Colors.warningSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
