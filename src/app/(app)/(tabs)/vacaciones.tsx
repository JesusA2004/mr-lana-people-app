import { zodResolver } from '@hookform/resolvers/zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Modal, Platform, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

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
import { useCreateVacacionSolicitud, useVacacionesSaldo, useVacacionesSolicitudes } from '@/hooks/queries/useVacaciones';
import { toast } from '@/store/toastStore';
import { diffInDaysInclusive, formatDateLong, isDateBefore, toApiDateString } from '@/utils/dates';
import { getErrorMessage, getValidationErrors, logError } from '@/utils/errors';

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
  const saldoQuery = useVacacionesSaldo();
  const historialQuery = useVacacionesSolicitudes();
  const [modalVisible, setModalVisible] = useState(false);

  const isLoading = saldoQuery.isLoading || historialQuery.isLoading;
  const isError = saldoQuery.isError || historialQuery.isError;
  const isRefetching = saldoQuery.isFetching || historialQuery.isFetching;
  const errorMessage = saldoQuery.error ? getErrorMessage(saldoQuery.error) : historialQuery.error ? getErrorMessage(historialQuery.error) : undefined;

  const refetchAll = () => {
    void saldoQuery.refetch();
    void historialQuery.refetch();
  };

  const saldo = saldoQuery.data;
  const historial = historialQuery.data ?? [];

  return (
    <View style={styles.container}>
      <AppHeader title="Mis vacaciones" />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetchAll} tintColor={Colors.primary} />}>
        {isLoading ? (
          <View style={{ gap: Spacing.lg }}>
            <SkeletonBlock height={120} radius={Radius.lg} />
            <SkeletonCardList count={3} />
          </View>
        ) : isError ? (
          <ErrorState message={errorMessage} onRetry={refetchAll} />
        ) : (
          <>
            {saldo?.vigencia_fin ? (
              <Text style={styles.vigenciaText}>Vigencia hasta {formatDateLong(saldo.vigencia_fin)}</Text>
            ) : null}

            <View style={styles.balanceGrid}>
              <FadeInView index={0} style={styles.tileFlex}>
                <BalanceTile label="Generados" value={saldo?.dias_generados} icon="trending-up-outline" />
              </FadeInView>
              <FadeInView index={1} style={styles.tileFlex}>
                <BalanceTile label="Usados" value={saldo?.dias_usados} icon="checkmark-done-outline" />
              </FadeInView>
              <FadeInView index={2} style={styles.tileFlex}>
                <BalanceTile label="Disponibles" value={saldo?.dias_disponibles} icon="airplane-outline" highlight />
              </FadeInView>
              <FadeInView index={3} style={styles.tileFlex}>
                <BalanceTile label="En solicitud" value={saldo?.dias_en_solicitud} icon="hourglass-outline" />
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

      <VacationRequestModal visible={modalVisible} onClose={() => setModalVisible(false)} />
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

function VacationRequestModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [formError, setFormError] = useState<string | null>(null);
  const [activePicker, setActivePicker] = useState<'inicio' | 'fin' | null>(null);
  const createMutation = useCreateVacacionSolicitud();

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
    try {
      await createMutation.mutateAsync({
        fecha_inicio: toApiDateString(values.fechaInicio),
        fecha_fin: toApiDateString(values.fechaFin),
        dias_solicitados: diffInDaysInclusive(values.fechaInicio, values.fechaFin),
        comentario: values.comentario?.trim() || undefined,
      });
      resetForm();
      onClose();
      toast.success('Solicitud de vacaciones enviada.');
    } catch (error) {
      logError('vacaciones.createSolicitud', error);
      const validation = getValidationErrors(error);
      const firstValidationMessage = validation ? Object.values(validation)[0]?.[0] : undefined;
      setFormError(firstValidationMessage ?? getErrorMessage(error));
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

          <Button
            title="Enviar solicitud"
            onPress={handleSubmit(onSubmit)}
            loading={createMutation.isPending}
            disabled={createMutation.isPending}
          />
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
