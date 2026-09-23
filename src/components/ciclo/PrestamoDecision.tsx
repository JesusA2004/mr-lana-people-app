import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FilterChips } from '@/components/ciclo/FilterChips';
import { Field, FormSheet } from '@/components/ciclo/FormSheet';
import { Notice, SectionTitle } from '@/components/ciclo/Screen';
import { MotivoModal } from '@/components/MotivoModal';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { useRhDecidirPrestamo } from '@/hooks/queries/useRhCicloLaboral';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { toast } from '@/store/toastStore';
import type { RhPrestamoDecision } from '@/types/rh';
import { formatDateTime } from '@/utils/dates';
import { getActionErrorMessage, getFieldError, logError } from '@/utils/errors';
import { formatCurrencyMXN, parseCurrencyInput } from '@/utils/formatters';
import { haptics } from '@/utils/haptics';
import { formatPlazoMeses, prestamoAutorizacionInicial, type PeriodicidadPrestamo } from '@/utils/loan';
import { describirVistoBueno, motivoNoAutorizable, type VistoBuenoTono } from '@/utils/rhActions';

type Periodicidad = PeriodicidadPrestamo;

export interface PrestamoDecisionProps {
  solicitudId: number;
  estado: string;
  /** Bloque `prestamo` de `GET /rh/solicitudes/{id}` — autoridad visual de la decisión. */
  prestamo: RhPrestamoDecision;
  onDone: () => void;
}

const TONE_COLOR: Record<VistoBuenoTono, { fg: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  success: { fg: Colors.success, bg: Colors.successSoft, icon: 'checkmark-circle' },
  warning: { fg: Colors.warning, bg: Colors.warningSoft, icon: 'time-outline' },
  danger: { fg: Colors.danger, bg: Colors.dangerSoft, icon: 'close-circle' },
  neutral: { fg: Colors.textMuted, bg: Colors.neutralSoft, icon: 'remove-circle-outline' },
};

/**
 * Decisión de un préstamo desde la solicitud RH: única vía para autorizar
 * (`POST .../prestamo/autorizar`, monto/plazo AUTORIZADOS → contrato y
 * pagaré) o rechazar (`POST .../prestamo/rechazar`). La pantalla oculta el
 * Aprobar/Rechazar genéricos para `tipo === 'prestamo'`.
 *
 * `prestamo.puede_autorizar` / `puede_rechazar` (PrestamoPolicy + visto
 * bueno + estado) deciden qué botón existe — nunca el rol ni el monto. El
 * backend sigue siendo la autoridad final (403/422 se muestran tal cual).
 */
export function PrestamoDecision({ solicitudId, estado, prestamo, onDone }: PrestamoDecisionProps) {
  const decidir = useRhDecidirPrestamo(solicitudId);
  const { isOffline } = useNetworkStatus();
  const [autorizando, setAutorizando] = useState(false);
  const [rechazando, setRechazando] = useState(false);
  const [monto, setMonto] = useState('');
  const [plazo, setPlazo] = useState('');
  const [periodicidad, setPeriodicidad] = useState<Periodicidad>('quincenal');
  const [observaciones, setObservaciones] = useState('');

  const abierta = estado === 'enviada' || estado === 'en_revision';
  const vb = prestamo.visto_bueno;
  const vbInfo = describirVistoBueno(vb);
  const tone = TONE_COLOR[vbInfo.tone];
  const plazoTexto = formatPlazoMeses(prestamo.plazo_solicitado);
  const motivoBloqueo = abierta ? motivoNoAutorizable(prestamo) : null;

  const plazoNum = Number(plazo);
  const montoNum = parseCurrencyInput(monto);
  const valido = montoNum !== undefined && montoNum >= 1 && Number.isInteger(plazoNum) && plazoNum >= 1 && plazoNum <= 520;
  const pagoEstimado = valido && montoNum ? montoNum / plazoNum : null;

  const abrirAutorizacion = () => {
    const inicial = prestamoAutorizacionInicial(prestamo);
    setMonto(inicial.monto);
    setPlazo(inicial.plazo);
    setPeriodicidad(inicial.periodicidad);
    setObservaciones('');
    decidir.reset();
    setAutorizando(true);
  };

  const onError = (error: unknown) => {
    logError('rhPrestamo.decidir', error);
    haptics.error();
    toast.error(getActionErrorMessage(error));
  };

  return (
    <Card style={styles.card}>
      <SectionTitle>Préstamo solicitado</SectionTitle>

      <View style={styles.amounts}>
        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>Monto solicitado</Text>
          <Text style={styles.amountValue} numberOfLines={1} adjustsFontSizeToFit>
            {prestamo.monto_solicitado != null ? formatCurrencyMXN(prestamo.monto_solicitado) : 'Sin monto'}
          </Text>
        </View>
        {/* El colaborador ya no propone plazo (lo decide RH); solo solicitudes anteriores lo traen. */}
        {plazoTexto ? (
          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>Plazo propuesto</Text>
            <Text style={styles.amountValue} numberOfLines={1} adjustsFontSizeToFit>
              {plazoTexto}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.vb, { backgroundColor: tone.bg }]} accessibilityRole="summary">
        <Ionicons name={tone.icon} size={18} color={tone.fg} accessibilityElementsHidden importantForAccessibility="no" />
        <View style={styles.vbBody}>
          <Text style={[styles.vbTitle, { color: tone.fg }]}>{vbInfo.label}</Text>
          {vb.jefe ? <Text style={styles.vbMeta}>Jefe inmediato: {vb.jefe}</Text> : null}
          {vb.fecha ? <Text style={styles.vbMeta}>{formatDateTime(vb.fecha)}</Text> : null}
          {vb.comentario ? <Text style={styles.vbComment}>“{vb.comentario}”</Text> : null}
        </View>
      </View>

      {prestamo.prestamo_id != null ? <Notice tone="success">Este préstamo ya fue autorizado (préstamo #{prestamo.prestamo_id}).</Notice> : null}

      {abierta && (prestamo.puede_autorizar || prestamo.puede_rechazar) ? (
        <>
          {isOffline ? <Notice tone="warning">Sin conexión: la decisión requiere confirmación del servidor.</Notice> : null}
          {motivoBloqueo && prestamo.puede_rechazar ? <Notice tone="warning">{motivoBloqueo}</Notice> : null}
          <View style={styles.actions}>
            {prestamo.puede_rechazar ? (
              <Button
                title="Rechazar préstamo"
                variant="outline"
                disabled={isOffline || decidir.isPending}
                onPress={() => setRechazando(true)}
                style={styles.actionButton}
              />
            ) : null}
            {prestamo.puede_autorizar ? (
              <Button
                title="Autorizar préstamo"
                leftIcon="checkmark"
                disabled={isOffline || decidir.isPending}
                onPress={abrirAutorizacion}
                style={styles.actionButton}
              />
            ) : null}
          </View>
        </>
      ) : abierta && motivoBloqueo ? (
        <Notice tone="info">{motivoBloqueo}</Notice>
      ) : null}

      <FormSheet
        visible={autorizando}
        title="Autorizar préstamo"
        description="Define el monto, el número de pagos y la periodicidad. Se generarán el contrato de préstamo y el pagaré para firma."
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
        <Field
          label="Monto autorizado"
          keyboardType="decimal-pad"
          value={monto}
          onChangeText={setMonto}
          error={getFieldError(decidir.error, 'monto_autorizado')}
        />
        <Field
          label="Plazo (número de pagos)"
          keyboardType="number-pad"
          value={plazo}
          onChangeText={setPlazo}
          error={getFieldError(decidir.error, 'plazo_autorizado')}
        />
        <FilterChips
          options={[
            { value: 'semanal', label: 'Semanal' },
            { value: 'quincenal', label: 'Quincenal' },
            { value: 'mensual', label: 'Mensual' },
          ]}
          value={periodicidad}
          onChange={setPeriodicidad}
        />
        {pagoEstimado !== null ? (
          <Text style={styles.estimate}>
            Pago estimado: {formatCurrencyMXN(Math.round(pagoEstimado * 100) / 100)} {periodicidad}
          </Text>
        ) : null}
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
  card: {
    gap: Spacing.md,
  },
  amounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  amountBox: {
    flexGrow: 1,
    flexBasis: 130,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 2,
  },
  amountLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  amountValue: {
    fontSize: FontSize.lg,
    color: Colors.text,
    fontWeight: '800',
  },
  vb: {
    flexDirection: 'row',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  vbBody: {
    flex: 1,
    gap: 2,
  },
  vbTitle: {
    fontSize: FontSize.sm,
    fontWeight: '800',
  },
  vbMeta: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  vbComment: {
    fontSize: FontSize.sm,
    color: Colors.text,
    marginTop: 2,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  actionButton: {
    flexGrow: 1,
    flexBasis: 140,
  },
  estimate: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
});
