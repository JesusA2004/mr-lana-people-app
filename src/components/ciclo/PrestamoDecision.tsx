import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FilterChips } from '@/components/ciclo/FilterChips';
import { Field, FormSheet } from '@/components/ciclo/FormSheet';
import { Notice, SectionTitle } from '@/components/ciclo/Screen';
import { MotivoModal } from '@/components/MotivoModal';
import { Colors, FontSize, Spacing } from '@/constants/colors';
import { useRhDecidirPrestamo } from '@/hooks/queries/useRhCicloLaboral';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { toast } from '@/store/toastStore';
import { getActionErrorMessage, getFieldError, logError } from '@/utils/errors';
import { formatCurrencyMXN, parseCurrencyInput } from '@/utils/formatters';
import { haptics } from '@/utils/haptics';

type Periodicidad = 'semanal' | 'quincenal' | 'mensual';

export interface PrestamoDecisionProps {
  solicitudId: number;
  estado: string;
  /** true mientras el backend no serialice el monto/plazo solicitados en el detalle RH (gap documentado). */
  bloqueado: boolean;
  montoSolicitado: number | null;
  onDone: () => void;
}

/**
 * Autorizar / rechazar un préstamo desde la solicitud (RH/Dirección con
 * `prestamos.autorizar`): `POST /rh/solicitudes/{id}/prestamo/autorizar`
 * (monto/plazo AUTORIZADOS) y `.../prestamo/rechazar`. El backend exige el
 * visto bueno del jefe inmediato cuando aplica; si falta responde 422 y la
 * app lo muestra tal cual — nunca se "autoriza visualmente".
 *
 * "Autorizar" queda bloqueado mientras el detalle RH no muestre el monto
 * solicitado (no se autoriza a ciegas); "Rechazar" no depende de eso.
 */
export function PrestamoDecision({ solicitudId, estado, bloqueado, montoSolicitado, onDone }: PrestamoDecisionProps) {
  const decidir = useRhDecidirPrestamo(solicitudId);
  const { isOffline } = useNetworkStatus();
  const [autorizando, setAutorizando] = useState(false);
  const [rechazando, setRechazando] = useState(false);
  const [monto, setMonto] = useState('');
  const [plazo, setPlazo] = useState('');
  const [periodicidad, setPeriodicidad] = useState<Periodicidad>('quincenal');
  const [observaciones, setObservaciones] = useState('');

  const abierta = estado === 'enviada' || estado === 'en_revision';
  if (!abierta) return null;

  const plazoNum = Number(plazo);
  const montoNum = parseCurrencyInput(monto);
  const valido = montoNum !== undefined && montoNum >= 1 && Number.isInteger(plazoNum) && plazoNum >= 1 && plazoNum <= 520;

  const onError = (error: unknown) => {
    logError('rhPrestamo.decidir', error);
    haptics.error();
    toast.error(getActionErrorMessage(error));
  };

  return (
    <Card style={styles.gap}>
      <SectionTitle>Decisión del préstamo</SectionTitle>
      <Text style={styles.muted}>Requiere visto bueno previo del jefe inmediato (el sistema lo valida al autorizar).</Text>
      {montoSolicitado !== null ? <Text style={styles.muted}>Monto solicitado: {formatCurrencyMXN(montoSolicitado)}</Text> : null}
      {isOffline ? <Notice tone="warning">Sin conexión: requiere confirmación del servidor.</Notice> : null}
      {!bloqueado ? (
        <Button title="Autorizar préstamo" leftIcon="checkmark" disabled={isOffline} onPress={() => setAutorizando(true)} />
      ) : null}
      <Button title="Rechazar préstamo" variant="outline" disabled={isOffline} onPress={() => setRechazando(true)} />

      <FormSheet
        visible={autorizando}
        title="Autorizar préstamo"
        description="Monto y plazo AUTORIZADOS. Se generarán el contrato de préstamo y el pagaré para firma."
        confirmLabel="Autorizar"
        submitting={decidir.isPending}
        confirmDisabled={!valido}
        onCancel={() => setAutorizando(false)}
        onConfirm={() =>
          decidir.mutate(
            {
              tipo: 'autorizar',
              payload: {
                monto_autorizado: montoNum ?? 0,
                plazo_autorizado: plazoNum,
                periodicidad,
                observaciones: observaciones.trim() || null,
              },
            },
            {
              onSuccess: () => {
                haptics.success();
                toast.success('Préstamo autorizado.');
                setAutorizando(false);
                onDone();
              },
              onError,
            },
          )
        }>
        <Field label="Monto autorizado" keyboardType="decimal-pad" value={monto} onChangeText={setMonto} error={getFieldError(decidir.error, 'monto_autorizado')} />
        <Field label="Plazo (número de pagos)" keyboardType="number-pad" value={plazo} onChangeText={setPlazo} error={getFieldError(decidir.error, 'plazo_autorizado')} />
        <FilterChips
          options={[
            { value: 'semanal', label: 'Semanal' },
            { value: 'quincenal', label: 'Quincenal' },
            { value: 'mensual', label: 'Mensual' },
          ]}
          value={periodicidad}
          onChange={setPeriodicidad}
        />
        <Field label="Observaciones (opcional)" value={observaciones} onChangeText={setObservaciones} multiline maxLength={1000} />
      </FormSheet>

      <MotivoModal
        visible={rechazando}
        title="Rechazar préstamo"
        description="El colaborador verá el motivo en su solicitud."
        confirmLabel="Rechazar"
        submitting={decidir.isPending}
        onCancel={() => setRechazando(false)}
        onConfirm={(motivo) =>
          decidir.mutate(
            { tipo: 'rechazar', motivo },
            {
              onSuccess: () => {
                haptics.success();
                toast.success('Préstamo rechazado.');
                setRechazando(false);
                onDone();
              },
              onError,
            },
          )
        }
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  gap: {
    gap: Spacing.sm,
  },
  muted: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
});
