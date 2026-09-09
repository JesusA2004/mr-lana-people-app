import { zodResolver } from '@hookform/resolvers/zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { z } from 'zod';

import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { MascotBubble } from '@/components/mascot/MascotBubble';
import { PressableScale } from '@/components/PressableScale';
import { Stepper } from '@/components/Stepper';
import { SuccessCheck } from '@/components/SuccessCheck';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { MascotMessages } from '@/constants/mascotMessages';
import { useCreateSolicitud } from '@/hooks/queries/useSolicitudes';
import { REQUEST_TYPES_WITH_DATE_RANGE, type RequestType, type Solicitud } from '@/types/request';
import { formatDateLong, isDateBefore, toApiDateString } from '@/utils/dates';
import { getErrorMessage, getValidationErrors, logError } from '@/utils/errors';

interface RequestTypeOption {
  tipo: RequestType;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
}

/** Catálogo confirmado contra App\Enums\TipoSolicitudInterna (ver capacitaciones). */
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

/** "Archivos" no es un paso real: la API de solicitudes (Api\V1\SolicitudController) no tiene ruta de adjuntos hoy — no se inventa esa capacidad en el cliente. */
const STEPS = ['Tipo', 'Información', 'Revisar'] as const;

export default function NuevaSolicitudScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tipo?: string }>();
  const [step, setStep] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [sentSolicitud, setSentSolicitud] = useState<Solicitud | null>(null);
  const createMutation = useCreateSolicitud();

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
  const needsDateRange = REQUEST_TYPES_WITH_DATE_RANGE.includes(selectedTipo as RequestType);
  const selectedOption = REQUEST_TYPE_OPTIONS.find((option) => option.tipo === selectedTipo);
  const [activePicker, setActivePicker] = useState<'inicio' | 'fin' | null>(null);

  const fechasResumen = useMemo(
    () =>
      [formValues.fechaInicio, formValues.fechaFin]
        .filter((date): date is Date => Boolean(date))
        .map((date) => formatDateLong(toApiDateString(date)))
        .join(' — '),
    [formValues.fechaInicio, formValues.fechaFin],
  );

  const goNext = async () => {
    if (step === 0) {
      const valid = await trigger('tipo');
      if (!valid) return;
      setStep(1);
      return;
    }
    if (step === 1) {
      const fields: (keyof FormValues)[] = needsDateRange ? ['motivo', 'fechaInicio', 'fechaFin'] : ['motivo'];
      const valid = await trigger(fields);
      if (!valid) return;
      setStep(2);
      return;
    }
  };

  const goBack = () => {
    if (step === 0) {
      router.back();
      return;
    }
    setStep((current) => current - 1);
  };

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    try {
      const solicitud = await createMutation.mutateAsync({
        tipo: values.tipo,
        motivo: values.motivo.trim(),
        observaciones: values.observaciones?.trim() || undefined,
        fecha_inicio: values.fechaInicio ? toApiDateString(values.fechaInicio) : undefined,
        fecha_fin: values.fechaFin ? toApiDateString(values.fechaFin) : undefined,
      });
      setSentSolicitud(solicitud);
    } catch (error) {
      logError('solicitudes.create', error);
      const validation = getValidationErrors(error);
      const firstValidationMessage = validation ? Object.values(validation)[0]?.[0] : undefined;
      setFormError(firstValidationMessage ?? getErrorMessage(error));
    }
  };

  if (sentSolicitud) {
    return <SuccessScreen solicitud={sentSolicitud} />;
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Nueva solicitud" showBack onBackPress={goBack} />

      <View style={styles.stepperWrapper}>
        <Stepper steps={[...STEPS]} currentIndex={step} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 0 ? (
          <Animated.View key="step-0" entering={FadeInRight.duration(240)} exiting={FadeOutLeft.duration(160)} style={styles.stepBlock}>
            <MascotBubble message={MascotMessages.wizardTipo} />
            <Text style={styles.title}>¿Qué necesitas solicitar?</Text>
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
            {errors.tipo ? <Text style={styles.formError}>{errors.tipo.message}</Text> : null}
          </Animated.View>
        ) : null}

        {step === 1 ? (
          <Animated.View key="step-1" entering={FadeInRight.duration(240)} exiting={FadeOutLeft.duration(160)} style={styles.stepBlock}>
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

        {step === 2 ? (
          <Animated.View key="step-2" entering={FadeInRight.duration(240)} exiting={FadeOutLeft.duration(160)} style={styles.stepBlock}>
            <MascotBubble message={MascotMessages.wizardRevision} />
            <Text style={styles.title}>Revisa tu solicitud</Text>

            <Card style={{ gap: Spacing.md }}>
              <SummaryRow icon="pricetag-outline" label="Tipo" value={selectedOption?.label ?? '—'} />
              <SummaryRow icon="chatbox-ellipses-outline" label="Motivo" value={formValues.motivo || '—'} />
              {formValues.observaciones ? <SummaryRow icon="reader-outline" label="Observaciones" value={formValues.observaciones} /> : null}
              {needsDateRange ? <SummaryRow icon="calendar-outline" label="Fechas" value={fechasResumen || '—'} /> : null}
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
          title={step === 2 ? 'Enviar solicitud' : 'Siguiente'}
          rightIcon={step === 2 ? undefined : 'arrow-forward'}
          onPress={step === 2 ? handleSubmit(onSubmit) : () => void goNext()}
          loading={createMutation.isPending}
          disabled={createMutation.isPending}
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
    </View>
  );
}

/** Pantalla de éxito: check animado + "Ver solicitud" / "Volver al inicio" (sección 18 del encargo V3). */
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
