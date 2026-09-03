import { zodResolver } from '@hookform/resolvers/zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { vacacionesApi } from '@/api/vacaciones';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Input } from '@/components/Input';
import { SkeletonBlock, SkeletonCardList } from '@/components/SkeletonBlock';
import { VacationCard } from '@/components/VacationCard';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import type { VacationBalance, VacationRequest } from '@/types/vacation';
import { formatDateLong, isDateBefore, toApiDateString } from '@/utils/dates';
import { getErrorMessage, getValidationErrors, logError } from '@/utils/errors';
import { pickNumber } from '@/utils/formatters';

type ViewState = 'loading' | 'success' | 'error';

const vacationFormSchema = z
  .object({
    fechaInicio: z.date({ error: 'Selecciona la fecha de inicio' }),
    fechaFin: z.date({ error: 'Selecciona la fecha de fin' }),
    diasSolicitados: z.string().trim().regex(/^\d+$/, 'Ingresa un número válido de días'),
    comentario: z.string().max(1000, 'Máximo 1000 caracteres').optional(),
  })
  .refine((data) => !isDateBefore(data.fechaFin, data.fechaInicio), {
    message: 'La fecha de fin no puede ser anterior a la fecha de inicio',
    path: ['fechaFin'],
  })
  .refine((data) => Number(data.diasSolicitados) >= 1 && Number(data.diasSolicitados) <= 60, {
    message: 'Los días solicitados deben estar entre 1 y 60',
    path: ['diasSolicitados'],
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
    void load();
  }, [load]);

  const generados = pickNumber(saldo, ['dias_generados']);
  const utilizados = pickNumber(saldo, ['dias_usados']);
  const disponibles = pickNumber(saldo, ['dias_disponibles']);
  const enSolicitud = pickNumber(saldo, ['dias_en_solicitud']);

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
            <View style={styles.balanceGrid}>
              <BalanceTile label="Generados" value={generados} icon="trending-up-outline" />
              <BalanceTile label="Utilizados" value={utilizados} icon="checkmark-done-outline" />
              <BalanceTile label="Disponibles" value={disponibles} icon="airplane-outline" highlight />
              <BalanceTile label="En solicitud" value={enSolicitud} icon="hourglass-outline" />
            </View>

            <Button title="Solicitar vacaciones" onPress={() => setModalVisible(true)} />

            <Text style={styles.sectionTitle}>Historial</Text>
            {historial.length === 0 ? (
              <EmptyState icon="airplane-outline" title="Sin solicitudes de vacaciones" message="Tu historial aparecerá aquí." />
            ) : (
              <View style={styles.list}>
                {historial.map((item) => (
                  <VacationCard key={String(item.id)} request={item} />
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
          void load(true);
        }}
      />
    </View>
  );
}

function BalanceTile({ label, value, icon, highlight = false }: {
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

function VacationRequestModal({ visible, onClose, onCreated }: {
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
    defaultValues: { fechaInicio: undefined, fechaFin: undefined, diasSolicitados: '', comentario: '' },
  });

  const resetForm = () => {
    reset({ fechaInicio: undefined, fechaFin: undefined, diasSolicitados: '', comentario: '' });
    setFormError(null);
    setActivePicker(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const submitRequest = async (values: VacationFormValues) => {
    setFormError(null);
    setSubmitting(true);
    try {
      await vacacionesApi.createSolicitud({
        fecha_inicio: toApiDateString(values.fechaInicio),
        fecha_fin: toApiDateString(values.fechaFin),
        dias_solicitados: Number(values.diasSolicitados),
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

  const onSubmit = (values: VacationFormValues) => {
    Alert.alert('Confirmar solicitud', `¿Deseas solicitar ${values.diasSolicitados} día(s) de vacaciones?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Enviar', onPress: () => void submitRequest(values) },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Solicitar vacaciones</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={handleClose} hitSlop={10}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
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

          <Controller
            control={control}
            name="diasSolicitados"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                label="Días solicitados"
                placeholder="Ej. 3"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.diasSolicitados?.message}
                keyboardType="number-pad"
              />
            )}
          />

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
                error={errors.comentario?.message}
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
                minimumDate={new Date()}
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

function DateField({ label, value, onPress, error }: {
  label: string;
  value?: Date;
  onPress: () => void;
  error?: string;
}) {
  return (
    <View style={{ gap: Spacing.xs }}>
      <Text style={styles.dateLabel}>{label}</Text>
      <Pressable onPress={onPress} style={[styles.dateInput, error && styles.dateInputError]}>
        <Ionicons name="calendar-outline" size={18} color={Colors.textMuted} />
        <Text style={styles.dateValue}>{value ? formatDateLong(toApiDateString(value)) : 'Selecciona una fecha'}</Text>
      </Pressable>
      {error ? <Text style={styles.formError}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  balanceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  tile: { width: '47%', alignItems: 'flex-start', gap: Spacing.xs },
  tileHighlight: { backgroundColor: Colors.primarySoft, borderColor: Colors.primarySoft },
  tileValue: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text },
  tileValueHighlight: { color: Colors.primaryDark },
  tileLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600' },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  list: { gap: Spacing.md },
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  modalContent: { padding: Spacing.lg, gap: Spacing.lg },
  dateLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
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
  dateInputError: { borderColor: Colors.danger },
  dateValue: { fontSize: FontSize.md, color: Colors.text },
  multilineInput: { minHeight: 80, textAlignVertical: 'top', paddingTop: Spacing.sm },
  formError: { fontSize: FontSize.xs, color: Colors.danger, fontWeight: '600' },
  doneButton: { margin: Spacing.lg },
});
