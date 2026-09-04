import { zodResolver } from '@hookform/resolvers/zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Modal, Platform, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { vacacionesApi } from '@/api/vacaciones';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { FadeInView } from '@/components/FadeInView';
import { Input } from '@/components/Input';
import { MascotAssistant } from '@/components/mascot/MascotAssistant';
import { PressableScale } from '@/components/PressableScale';
import { SkeletonBlock, SkeletonCardList } from '@/components/SkeletonBlock';
import { VacationCard } from '@/components/VacationCard';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { MascotMessages } from '@/constants/mascotMessages';
import { toast } from '@/store/toastStore';
import type { VacationBalance, VacationRequest } from '@/types/vacation';
import { diffInDaysInclusive, formatDateLong, isDateBefore, toApiDateString } from '@/utils/dates';
import { getErrorMessage, getValidationErrors, logError } from '@/utils/errors';

type ViewState = 'loading' | 'success' | 'error';

const vacationFormSchema = z
  .object({
    fechaInicio: z.date({ error: 'Selecciona la fecha de inicio' }),
    fechaFin: z.date({ error: 'Selecciona la fecha de fin' }),
    comentario: z.string().optional(),
  })
  .refine((data) => !isDateBefore(data.fechaFin, data.fechaInicio), {
    message: 'La fecha de fin no puede ser anterior a la fecha de inicio',
    path: ['fechaFin'],
  });

type VacationFormValues = z.infer<typeof vacationFormSchema>;

export default function VacacionesScreen() {
  const [saldo, setSaldo] = useState<VacationBalance | null>(null);
  const [historial, setHistorial] = useState<VacationRequest[]>([]);
  const [state, setState] = useState<ViewState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setState('loading');
    setErrorMessage(null);
    try {
      const [saldoResult, historialResult] = await Promise.all([
        vacacionesApi.getSaldo(),
        vacacionesApi.getSolicitudes(),
      ]);
      setSaldo(saldoResult);
      setHistorial(historialResult);
      setState('success');
    } catch (error) {
      logError('vacaciones.load', error);
      setErrorMessage(getErrorMessage(error));
      setState('error');
    } finally {
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  const generados = saldo?.dias_generados;
  const usados = saldo?.dias_usados;
  const disponibles = saldo?.dias_disponibles;
  const enSolicitud = saldo?.dias_en_solicitud;

  return (
    <View style={styles.container}>
      <AppHeader title="Mis vacaciones" />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={Colors.primary} />}>
        {state === 'loading' ? (
          <View style={{ gap: Spacing.lg }}>
            <SkeletonBlock height={120} radius={Radius.lg} />
            <SkeletonCardList count={3} />
          </View>
        ) : state === 'error' ? (
          <ErrorState message={errorMessage ?? undefined} onRetry={() => void load()} />
        ) : (
          <>
            {saldo?.vigencia_fin ? (
              <Text style={styles.vigenciaText}>Vigencia hasta {formatDateLong(saldo.vigencia_fin)}</Text>
            ) : null}

            <View style={styles.balanceGrid}>
              <FadeInView index={0} style={styles.tileFlex}>
                <BalanceTile label="Generados" value={generados} icon="trending-up-outline" />
              </FadeInView>
              <FadeInView index={1} style={styles.tileFlex}>
                <BalanceTile label="Usados" value={usados} icon="checkmark-done-outline" />
              </FadeInView>
              <FadeInView index={2} style={styles.tileFlex}>
                <BalanceTile label="Disponibles" value={disponibles} icon="airplane-outline" highlight />
              </FadeInView>
              <FadeInView index={3} style={styles.tileFlex}>
                <BalanceTile label="En solicitud" value={enSolicitud} icon="hourglass-outline" />
              </FadeInView>
            </View>

            <Button title="Solicitar vacaciones" onPress={() => setModalVisible(true)} />

            <Text style={styles.sectionTitle}>Historial</Text>
            {historial.length === 0 ? (
              <MascotAssistant
                message={MascotMessages.vacaciones}
                type="tip"
                dismissible={false}
                actionLabel="Solicitar vacaciones"
                onAction={() => setModalVisible(true)}
              />
            ) : (
              <View style={styles.list}>
                {historial.map((item, index) => (
                  <FadeInView key={String(item.id)} index={index}>
                    <VacationCard request={item} />
                  </FadeInView>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <VacationRequestModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onCreated={() => {
          setModalVisible(false);
          toast.success('Solicitud de vacaciones enviada.');
          void load(true);
        }}
      />
    </View>
  );
}

function BalanceTile({
  label,
  value,
  icon,
  highlight = false,
}: {
  label: string;
  value?: number;
  icon: keyof typeof Ionicons.glyphMap;
  highlight?: boolean;
}) {
  return (
    <Card style={[styles.tile, highlight && styles.tileHighlight]} padded>
      <Ionicons name={icon} size={20} color={highlight ? Colors.primaryDark : Colors.textMuted} />
      <Text style={[styles.tileValue, highlight && styles.tileValueHighlight]}>
        {typeof value === 'number' ? value : '—'}
      </Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </Card>
  );
}

function VacationRequestModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [activePicker, setActivePicker] = useState<'inicio' | 'fin' | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VacationFormValues>({
    resolver: zodResolver(vacationFormSchema),
    defaultValues: { fechaInicio: undefined, fechaFin: undefined, comentario: '' },
  });

  const watchedValues = useWatch({ control });
  const fechaInicio = watchedValues.fechaInicio;
  const fechaFin = watchedValues.fechaFin;
  const diasSolicitados = fechaInicio && fechaFin && !isDateBefore(fechaFin, fechaInicio) ? diffInDaysInclusive(fechaInicio, fechaFin) : null;

  // El formulario se reinicia al cerrar (por acción del usuario, no en un
  // efecto) para no disparar setState de forma síncrona durante el render.
  const resetForm = () => {
    reset({ fechaInicio: undefined, fechaFin: undefined, comentario: '' });
    setFormError(null);
    setActivePicker(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const onSubmit = async (values: VacationFormValues) => {
    setFormError(null);
    setSubmitting(true);
    try {
      await vacacionesApi.createSolicitud({
        fecha_inicio: toApiDateString(values.fechaInicio),
        fecha_fin: toApiDateString(values.fechaFin),
        dias_solicitados: diffInDaysInclusive(values.fechaInicio, values.fechaFin),
        comentario: values.comentario?.trim() || undefined,
      });
      resetForm();
      onCreated();
    } catch (error) {
      logError('vacaciones.createSolicitud', error);
      const validation = getValidationErrors(error);
      const firstValidationMessage = validation ? Object.values(validation)[0]?.[0] : undefined;
      setFormError(firstValidationMessage ?? getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Solicitar vacaciones</Text>
          <PressableScale accessibilityLabel="Cerrar" onPress={handleClose} haptic={false} hitSlop={10}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </PressableScale>
        </View>

        <ScrollView contentContainerStyle={styles.modalContent}>
          <Controller
            control={control}
            name="fechaInicio"
            render={({ field: { value } }) => (
              <DateField
                label="Fecha de inicio"
                value={value}
                onPress={() => setActivePicker('inicio')}
                error={errors.fechaInicio?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="fechaFin"
            render={({ field: { value } }) => (
              <DateField
                label="Fecha de fin"
                value={value}
                onPress={() => setActivePicker('fin')}
                error={errors.fechaFin?.message}
              />
            )}
          />

          {diasSolicitados ? (
            <View style={styles.diasBadge}>
              <Ionicons name="calendar-outline" size={16} color={Colors.primaryDark} />
              <Text style={styles.diasBadgeText}>
                {diasSolicitados} {diasSolicitados === 1 ? 'día' : 'días'} naturales
              </Text>
            </View>
          ) : null}

          <Controller
            control={control}
            name="comentario"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                label="Comentario (opcional)"
                placeholder="Motivo o detalle adicional"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                multiline
                style={styles.multilineInput}
              />
            )}
          />

          {formError ? <Text style={styles.formError}>{formError}</Text> : null}

          <Button title="Enviar solicitud" onPress={handleSubmit(onSubmit)} loading={submitting} disabled={submitting} />
        </ScrollView>

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
    </Modal>
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
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  vigenciaText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
    marginTop: -Spacing.sm,
  },
  balanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  tileFlex: {
    width: '47%',
  },
  tile: {
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  tileHighlight: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primarySoft,
  },
  tileValue: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
  },
  tileValueHighlight: {
    color: Colors.primaryDark,
  },
  tileLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  list: {
    gap: Spacing.md,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
  },
  modalContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
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
  diasBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginTop: -Spacing.sm,
  },
  diasBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: Spacing.sm,
  },
  formError: {
    fontSize: FontSize.xs,
    color: Colors.danger,
    fontWeight: '600',
  },
  doneButton: {
    margin: Spacing.lg,
  },
});
