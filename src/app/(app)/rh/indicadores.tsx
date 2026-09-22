import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { FilterChips } from '@/components/ciclo/FilterChips';
import { InfoRow } from '@/components/ciclo/InfoRow';
import { Screen, SectionTitle } from '@/components/ciclo/Screen';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { useRhIndicadores } from '@/hooks/queries/useRhCicloLaboral';
import { formatDateShort, toApiDateString } from '@/utils/dates';
import { formatCurrencyMXN } from '@/utils/formatters';

type Periodo = 'mes' | '3m' | '12m';

const PERIODOS: { value: Periodo; label: string }[] = [
  { value: 'mes', label: 'Este mes' },
  { value: '3m', label: 'Últimos 3 meses' },
  { value: '12m', label: 'Últimos 12 meses' },
];

/** Solo arma el RANGO que se envía como filtro; los indicadores los calcula el backend. */
function rango(periodo: Periodo): { desde?: string; hasta?: string } {
  if (periodo === 'mes') return {};
  const hoy = new Date();
  const desde = new Date(hoy.getFullYear(), hoy.getMonth() - (periodo === '3m' ? 3 : 12), hoy.getDate());
  return { desde: toApiDateString(desde), hasta: toApiDateString(hoy) };
}

const fmt = (value: number | null, suffix = '') => (value === null ? null : `${value}${suffix}`);

/**
 * Indicadores RH — `GET /rh/indicadores` (`IndicadoresRhService`, permiso
 * `indicadores.ver`). Se muestran EXACTAMENTE los datos que entrega el
 * backend; `null` = sin datos suficientes (la fila no se pinta).
 */
export default function RhIndicadoresScreen() {
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const query = useRhIndicadores(rango(periodo));
  const data = query.data;

  return (
    <Screen
      title="Indicadores"
      subtitle={data?.periodo.desde ? `${formatDateShort(data.periodo.desde)} – ${formatDateShort(data.periodo.hasta)}` : undefined}
      isLoading={query.isLoading}
      error={query.error}
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
      header={<FilterChips options={PERIODOS} value={periodo} onChange={setPeriodo} />}>
      {data ? (
        <>
          <View style={styles.grid}>
            <Kpi label="Plantilla activa" value={fmt(data.plantilla_activa)} />
            <Kpi label="Autorizada" value={fmt(data.plantilla_autorizada)} />
            <Kpi label="Cobertura" value={fmt(data.cobertura, '%')} />
            <Kpi label="Rotación" value={fmt(data.rotacion, '%')} />
          </View>
          <Card>
            <SectionTitle>Plantilla</SectionTitle>
            <InfoRow label="Vacantes de plantilla" value={data.vacantes_plantilla} />
            <InfoRow label="Excedentes" value={data.excedentes_plantilla} />
            <InfoRow label="Vacantes abiertas" value={data.vacantes_abiertas} />
          </Card>
          <Card>
            <SectionTitle>Movimientos del periodo</SectionTitle>
            <InfoRow label="Altas" value={data.altas_periodo} />
            <InfoRow label="Bajas" value={data.bajas_periodo} />
            <InfoRow label="Contratados" value={data.contratados_periodo} />
            <InfoRow
              label={`Contratos por vencer${data.contratos_por_vencer.dias ? ` (${data.contratos_por_vencer.dias} días)` : ''}`}
              value={data.contratos_por_vencer.total}
            />
          </Card>
          <Card>
            <SectionTitle>Permanencia y contratación</SectionTitle>
            <InfoRow label="Permanencia promedio (activos)" value={fmt(data.permanencia_promedio_dias.activos, ' días')} />
            <InfoRow label="Permanencia promedio (bajas)" value={fmt(data.permanencia_promedio_dias.bajas_periodo, ' días')} />
            <InfoRow label="Tiempo de contratación (vacantes)" value={fmt(data.tiempo_contratacion_dias.vacantes, ' días')} />
            <InfoRow label="Tiempo de contratación (candidatos)" value={fmt(data.tiempo_contratacion_dias.candidatos, ' días')} />
          </Card>
          <Card>
            <SectionTitle>Reclutamiento</SectionTitle>
            <InfoRow label="Inversión en campañas" value={data.inversion_reclutamiento !== null ? formatCurrencyMXN(data.inversion_reclutamiento) : null} />
            <InfoRow label="Costo por contratación" value={data.costo_por_contratacion !== null ? formatCurrencyMXN(data.costo_por_contratacion) : null} />
            {data.embudo_candidatos.length > 0 ? <Text style={styles.subTitle}>Embudo de candidatos</Text> : null}
            {data.embudo_candidatos.map((etapa) => (
              <InfoRow key={etapa.estado} label={etapa.etiqueta} value={etapa.total} />
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function Kpi({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={styles.kpi} accessible accessibilityLabel={`${label}: ${value ?? 'sin datos'}`}>
      <Text style={styles.kpiValue}>{value ?? '—'}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  kpi: {
    flexGrow: 1,
    width: '46%',
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  kpiValue: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  kpiLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  subTitle: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.text,
    marginTop: Spacing.sm,
  },
});
