import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FilterChips } from '@/components/ciclo/FilterChips';
import { Field } from '@/components/ciclo/FormSheet';
import { Notice, Screen, SectionTitle } from '@/components/ciclo/Screen';
import { DateField } from '@/components/forms/DateField';
import { Colors, FontSize, Spacing } from '@/constants/colors';
import { useRhIniciarCierre } from '@/hooks/queries/useRhCicloLaboral';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { toast } from '@/store/toastStore';
import { TIPOS_BAJA } from '@/types/rhCiclo';
import { toApiDateString } from '@/utils/dates';
import { getActionErrorMessage, getFieldError, logError } from '@/utils/errors';
import { haptics } from '@/utils/haptics';

/**
 * Paso 1 del cierre laboral: motivo. `POST /rh/colaboradores/{id}/cierres`
 * (`IniciarCierreRequest`: tipo_baja, motivo, fecha_efectiva). El backend
 * crea la solicitud de baja en revisión y abre la tarea de finiquito.
 */
export default function RhNuevoCierreScreen() {
  const router = useRouter();
  const { colaboradorId, nombre } = useLocalSearchParams<{ colaboradorId: string; nombre?: string }>();
  const iniciar = useRhIniciarCierre(colaboradorId);
  const { isOffline } = useNetworkStatus();
  const [tipo, setTipo] = useState<string>('renuncia');
  const [motivo, setMotivo] = useState('');
  const [fecha, setFecha] = useState<Date | undefined>(undefined);
  const [observaciones, setObservaciones] = useState('');

  const listo = motivo.trim().length > 0 && !!fecha;

  const enviar = () => {
    if (!fecha) return;
    Alert.alert('Iniciar cierre laboral', `Se iniciará el cierre de ${nombre ?? 'este colaborador'}. El colaborador NO se elimina; su historial se conserva.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Iniciar',
        style: 'destructive',
        onPress: () =>
          iniciar.mutate(
            { tipo_baja: tipo, motivo: motivo.trim(), fecha_efectiva: toApiDateString(fecha), observaciones: observaciones.trim() || null },
            {
              onSuccess: (cierre) => {
                haptics.success();
                toast.success('Cierre laboral iniciado.');
                router.replace(`/(app)/rh/cierres/${cierre.id}` as never);
              },
              onError: (error) => {
                logError('rhCierre.iniciar', error);
                haptics.error();
                toast.error(getActionErrorMessage(error));
              },
            },
          ),
      },
    ]);
  };

  return (
    <Screen title="Iniciar cierre laboral" subtitle={nombre}>
      <Notice tone="warning">El cierre sigue los pasos del backend: aviso, finiquito, firma, pago, baja y cierre de expediente. No se pueden saltar pasos.</Notice>
      <Card style={styles.gap}>
        <SectionTitle>Tipo de baja</SectionTitle>
        <View style={styles.chips}>
          <FilterChips options={TIPOS_BAJA} value={tipo} onChange={setTipo} />
        </View>
        {getFieldError(iniciar.error, 'tipo_baja') ? <Text style={styles.error}>{getFieldError(iniciar.error, 'tipo_baja')}</Text> : null}
        <Field label="Motivo" value={motivo} onChangeText={setMotivo} multiline maxLength={2000} error={getFieldError(iniciar.error, 'motivo')} />
        <DateField label="Fecha efectiva" value={fecha} onChange={setFecha} error={getFieldError(iniciar.error, 'fecha_efectiva')} />
        <Field label="Observaciones (opcional)" value={observaciones} onChangeText={setObservaciones} multiline maxLength={2000} />
      </Card>
      {isOffline ? <Notice tone="warning">Sin conexión: esta acción requiere confirmación del servidor.</Notice> : null}
      <Button title="Iniciar cierre" variant="danger" disabled={!listo || isOffline} loading={iniciar.isPending} onPress={enviar} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: {
    gap: Spacing.md,
  },
  chips: {
    marginHorizontal: -Spacing.lg,
  },
  error: {
    fontSize: FontSize.xs,
    color: Colors.danger,
  },
});
