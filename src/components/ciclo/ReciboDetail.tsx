import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { InfoRow } from '@/components/ciclo/InfoRow';
import { Notice, SectionTitle } from '@/components/ciclo/Screen';
import { Colors, FontSize, Spacing } from '@/constants/colors';
import type { ReciboConcepto, ReciboNomina } from '@/types/payroll';
import { formatDateLong } from '@/utils/dates';
import { formatCurrencyMXN } from '@/utils/formatters';
import { formatPeriodo, reciboPeriodoLabel, splitConceptos } from '@/utils/payroll';

/**
 * Cuerpo del recibo interno (colaborador y RH). Totales tal cual los manda
 * el backend — nunca se recalculan en el dispositivo.
 */
export function ReciboDetail({ recibo, colaboradorNombre }: { recibo: ReciboNomina; colaboradorNombre?: string | null }) {
  const { percepciones, deducciones } = splitConceptos(recibo.conceptos);

  return (
    <>
      <Card style={styles.header}>
        <Text style={styles.leyenda} accessibilityRole="header">
          {recibo.leyenda}
        </Text>
        <Text style={styles.periodo}>{reciboPeriodoLabel(recibo)}</Text>
        {colaboradorNombre ? <InfoRow label="Colaborador" value={colaboradorNombre} icon="person-outline" /> : null}
        <InfoRow label="Folio" value={recibo.folio} icon="barcode-outline" />
        <InfoRow label="Periodo" value={formatPeriodo(recibo.periodo_inicio, recibo.periodo_fin)} icon="calendar-outline" />
        <InfoRow label="Fecha de pago" value={formatDateLong(recibo.fecha_pago)} icon="cash-outline" />
      </Card>

      <Card>
        <SectionTitle>Percepciones</SectionTitle>
        <ConceptList conceptos={percepciones} empty="Sin percepciones registradas." />
      </Card>

      <Card>
        <SectionTitle>Deducciones</SectionTitle>
        <ConceptList conceptos={deducciones} empty="Sin deducciones registradas." />
      </Card>

      <Card style={styles.totals}>
        <InfoRow label="Total percepciones" value={formatCurrencyMXN(recibo.total_percepciones)} />
        <InfoRow label="Total deducciones" value={formatCurrencyMXN(recibo.total_deducciones)} />
        <View style={styles.divider} />
        <InfoRow label="Neto" value={formatCurrencyMXN(recibo.neto)} emphasis />
      </Card>

      {recibo.observaciones ? <Notice tone="info">{recibo.observaciones}</Notice> : null}
    </>
  );
}

function ConceptList({ conceptos, empty }: { conceptos: ReciboConcepto[]; empty: string }) {
  if (conceptos.length === 0) return <Text style={styles.empty}>{empty}</Text>;
  return (
    <View style={styles.conceptList}>
      {conceptos.map((concepto, index) => (
        <View key={`${concepto.concepto}-${index}`} style={styles.conceptRow} accessible accessibilityLabel={`${concepto.concepto}, ${formatCurrencyMXN(concepto.importe)}`}>
          <View style={styles.conceptText}>
            <Text style={styles.conceptName}>{concepto.concepto}</Text>
            {concepto.cantidad !== null && concepto.cantidad !== 1 ? <Text style={styles.conceptMeta}>Cantidad: {concepto.cantidad}</Text> : null}
            {concepto.observaciones ? <Text style={styles.conceptMeta}>{concepto.observaciones}</Text> : null}
          </View>
          <Text style={styles.conceptAmount}>{formatCurrencyMXN(concepto.importe)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 2,
  },
  leyenda: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.primaryDark,
    letterSpacing: 0.4,
  },
  periodo: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  totals: {
    gap: 0,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.xs,
  },
  empty: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  conceptList: {
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  conceptRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  conceptText: {
    flex: 1,
  },
  conceptName: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  conceptMeta: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  conceptAmount: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.text,
  },
});
