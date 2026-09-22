import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { InfoRow } from '@/components/ciclo/InfoRow';
import { Notice, SectionTitle } from '@/components/ciclo/Screen';
import { StatusBadge } from '@/components/StatusBadge';
import { Colors, FontSize, Spacing } from '@/constants/colors';
import type { Prestamo, PrestamoDocumentoRef } from '@/types/loan';
import { formatDateLong, formatDateTime } from '@/utils/dates';
import { formatCurrencyMXN } from '@/utils/formatters';
import { prestamoEstadoBadge, prestamoEstadoLabel } from '@/utils/loan';

const DOC_ESTADO_LABEL: Record<string, string> = {
  pendiente_firma_colaborador: 'Pendiente de firma',
  firmado_digitalmente: 'Firmado digitalmente',
  pendiente_impresion: 'Firmado · original en proceso',
  impreso: 'Impreso',
  pendiente_firma_fisica: 'Pendiente de firma física',
  firmado_fisicamente: 'Firmado físicamente',
  enviado_corporativo: 'Enviado a corporativo',
  recibido_corporativo: 'Recibido en corporativo',
  escaneado: 'Escaneado',
  archivado: 'Archivado',
  cancelado: 'Cancelado',
};

export interface PrestamoDetailProps {
  prestamo: Prestamo;
  /** Abre el documento (contrato/pagaré) — el destino depende de la experiencia. */
  onOpenDocumento?: (documento: PrestamoDocumentoRef) => void;
  showColaborador?: boolean;
}

/**
 * Detalle de préstamo compartido (colaborador y RH). El saldo y los
 * movimientos son CONTROL ADMINISTRATIVO: MR. LANA PEOPLE no aplica
 * descuentos de nómina (eso ocurre fuera del sistema).
 */
export function PrestamoDetail({ prestamo, onOpenDocumento, showColaborador = false }: PrestamoDetailProps) {
  return (
    <>
      <Card style={styles.gap}>
        <View style={styles.header}>
          <Text style={styles.title}>Préstamo personal{prestamo.folio ? ` · ${prestamo.folio}` : ''}</Text>
          <StatusBadge status={prestamoEstadoBadge(prestamo.estado)} label={prestamoEstadoLabel(prestamo.estado)} />
        </View>
        {showColaborador && prestamo.colaborador ? <InfoRow label="Colaborador" value={prestamo.colaborador.nombre} icon="person-outline" /> : null}
        <InfoRow label="Fecha de solicitud" value={formatDateLong(prestamo.fecha_solicitud)} icon="calendar-outline" />
        <InfoRow label="Monto solicitado" value={prestamo.monto_solicitado !== null ? formatCurrencyMXN(prestamo.monto_solicitado) : null} icon="cash-outline" />
        <InfoRow label="Plazo solicitado" value={prestamo.plazo_solicitado !== null ? `${prestamo.plazo_solicitado} pagos` : null} />
        <InfoRow label="Monto autorizado" value={prestamo.monto_autorizado !== null ? formatCurrencyMXN(prestamo.monto_autorizado) : null} emphasis />
        <InfoRow label="Plazo autorizado" value={prestamo.plazo_autorizado !== null ? `${prestamo.plazo_autorizado} pagos` : null} />
        <InfoRow label="Periodicidad" value={prestamo.periodicidad} />
        <InfoRow label="Pago programado" value={prestamo.pago_programado !== null ? formatCurrencyMXN(prestamo.pago_programado) : null} />
        <InfoRow label="Autorizado" value={formatDateTime(prestamo.autorizado_en)} />
        <InfoRow label="Motivo" value={prestamo.motivo} />
        <InfoRow label="Resguardo de documentos" value={formatDateTime(prestamo.resguardado_en)} icon="lock-closed-outline" />
      </Card>

      <Card style={styles.gap}>
        <SectionTitle>Documentos</SectionTitle>
        <DocumentoRow label="Contrato de préstamo" documento={prestamo.contrato} onOpen={onOpenDocumento} />
        <DocumentoRow label="Pagaré" documento={prestamo.pagare} onOpen={onOpenDocumento} />
      </Card>

      {prestamo.saldo_informativo !== null || (prestamo.movimientos && prestamo.movimientos.length > 0) ? (
        <Card style={styles.gap}>
          <SectionTitle>Control administrativo</SectionTitle>
          <Notice tone="info">
            Información administrativa registrada por RH. El descuento real se realiza fuera de MR. LANA PEOPLE, en el proceso de nómina.
          </Notice>
          <InfoRow label="Saldo administrativo" value={prestamo.saldo_informativo !== null ? formatCurrencyMXN(prestamo.saldo_informativo) : null} emphasis />
          {(prestamo.movimientos ?? []).map((movimiento, index) => (
            <InfoRow
              key={`${movimiento.fecha}-${index}`}
              label={`${formatDateLong(movimiento.fecha)}${movimiento.tipo ? ` · ${movimiento.tipo}` : ''}`}
              value={`${formatCurrencyMXN(movimiento.monto)} (saldo ${formatCurrencyMXN(movimiento.saldo_nuevo)})`}
            />
          ))}
        </Card>
      ) : null}

      {prestamo.vistos_buenos && prestamo.vistos_buenos.length > 0 ? (
        <Card style={styles.gap}>
          <SectionTitle>Visto bueno</SectionTitle>
          {prestamo.vistos_buenos.map((visto, index) => (
            <View key={index} style={styles.visto}>
              <Text style={styles.vistoTitle}>
                {visto.decision === 'aprobado' ? 'Visto bueno otorgado' : visto.decision === 'rechazado' ? 'Visto bueno negado' : (visto.decision ?? 'Decisión')}
                {visto.usuario ? ` · ${visto.usuario}` : ''}
              </Text>
              {visto.fecha ? <Text style={styles.meta}>{formatDateTime(visto.fecha)}</Text> : null}
              {visto.comentario ? <Text style={styles.meta}>{visto.comentario}</Text> : null}
            </View>
          ))}
        </Card>
      ) : null}

      {prestamo.observaciones ? <Notice tone="info">{prestamo.observaciones}</Notice> : null}
    </>
  );
}

function DocumentoRow({ label, documento, onOpen }: { label: string; documento: PrestamoDocumentoRef | null; onOpen?: (documento: PrestamoDocumentoRef) => void }) {
  if (!documento) {
    return <InfoRow label={label} value="Pendiente de generar" />;
  }
  return (
    <View style={styles.docRow}>
      <InfoRow label={label} value={(documento.estado && DOC_ESTADO_LABEL[documento.estado]) ?? documento.estado ?? 'Generado'} />
      {onOpen ? <Button title={`Ver ${label.toLowerCase()}`} variant="ghost" leftIcon="document-text-outline" onPress={() => onOpen(documento)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  gap: {
    gap: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    flexWrap: 'wrap',
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
    flexShrink: 1,
  },
  docRow: {
    gap: 0,
  },
  visto: {
    gap: 2,
    paddingVertical: Spacing.xs,
  },
  vistoTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  meta: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
});
