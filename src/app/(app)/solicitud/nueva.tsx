import { zodResolver } from '@hookform/resolvers/zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { z } from 'zod';

import { AnimatedProgressBar } from '@/components/AnimatedProgressBar';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { MascotBubble } from '@/components/mascot/MascotBubble';
import { PressableScale } from '@/components/PressableScale';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { MascotMessages } from '@/constants/mascotMessages';
import { useCreateSolicitud } from '@/hooks/queries/useSolicitudes';
import { toast } from '@/store/toastStore';
import { REQUEST_TYPES_WITH_DATE_RANGE, type RequestType } from '@/types/request';
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

const STEPS = ['Tipo', 'Información', 'Revisar'] as const;

export default function NuevaSolicitudScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tipo?: string }>();
  const [step, setStep] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
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

  const stepProgress = useMemo(() => Math.round(((step + 1) / STEPS.length) * 100), [step]);

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
      toast.success(MascotMessages.solicitudEnviada);
      router.replace({ pathname: '/solicitud/[id]', params: { id: String(solicitud.id) } });
    } catch (error) {
      logError('solicitudes.create', error);
      const validation = getValidationErrors(error);
      const firstValidationMessage = validation ? Object.values(validation)[0]?.[0] : undefined;
      setFormError(firstValidationMessage ?? getErrorMessage(error));
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Nueva solicitud" showBack onBackPress={goBack} />

      <View style={styles.progressWrapper}>
        <View style={styles.stepLabels}>
          {STEPS.map((label, index) => (
            <Text key={label} style={[styles.stepLabel, index === step && styles.stepLabelActive]}>
              {index + 1}. {label}
            </Text>
          ))}
        </View>
        <AnimatedProgressBar percent={stepProgress} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 0 ? (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(120)} style={styles.stepBlock}>
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
                      <Ionicons name={option.icon} size={20} color={active ? Colors.white : Colors.primaryDark} />
                    </View>
                    <View style={styles.typeText}>
                      <Text style={styles.typeLabel}>{option.label}</Text>
                      <Text style={styles.typeDescription}>{option.description}</Text>
                    </View>
                    {active ? <Ionicons name="checkmark-circle" size={20} color={Colors.primary} /> : null}
                  </PressableScale>
                );
              })}
            </View>
            {errors.tipo ? <Text style={styles.formError}>{errors.tipo.message}</Text> : null}
          </Animated.View>
        ) : null}

        {step === 1 ? (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(120)} style={styles.stepBlock}>
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
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(120)} style={styles.stepBlock}>
            <MascotBubble message={MascotMessages.wizardRevision} />
            <Text style={styles.title}>Revisa tu solicitud</Text>

            <Card style={{ gap: Spacing.md }}>
              <SummaryRow label="Tipo" value={selectedOption?.label ?? '—'} />
              <SummaryRow label="Motivo" value={formValues.motivo || '—'} />
              {formValues.observaciones ? <SummaryRow label="Observaciones" value={formValues.observaciones} /> : null}
              {needsDateRange ? (
                <SummaryRow
                  label="Fechas"
                  value={
                    [formValues.fechaInicio, formValues.fechaFin]
                      .filter((date): date is Date => Boolean(date))
                      .map((date) => formatDateLong(toApiDateString(date)))
                      .join(' — ') || '—'
                  }
                />
              ) : null}
            </Card>

            {formError ? <Text style={styles.formError}>{formError}</Text> : null}
          </Animated.View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={step === 2 ? 'Enviar solicitud' : 'Siguiente'}
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
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
  progressWrapper: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  stepLabelActive: {
    color: Colors.primaryDark,
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
    width: 40,
    height: 40,
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
});
