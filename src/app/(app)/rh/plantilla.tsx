import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { FilterChips } from '@/components/ciclo/FilterChips';
import { InfoRow } from '@/components/ciclo/InfoRow';
import { EmptyMessage, Screen, SectionTitle } from '@/components/ciclo/Screen';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { useRhCobertura } from '@/hooks/queries/useRhCicloLaboral';

/**
 * Plantilla autorizada vs. activa — `GET /rh/plantilla/cobertura`
 * (`HeadcountService::coberturaDetallada()`, permiso `headcount.ver`).
 * Todos los números (autorizados, activos, vacantes, excedentes,
 * cobertura) vienen calculados del backend. El filtro por sucursal usa los
 * ids que el propio backend devuelve en las filas.
 */
export default function RhPlantillaScreen() {
  const [sucursal, setSucursal] = useState<string>('todas');
  const general = useRhCobertura({});
  const filtrada = useRhCobertura({ sucursal_id: Number(sucursal) }, sucursal !== 'todas');
  const query = sucursal === 'todas' ? general : filtrada;
  const data = query.data;

  const sucursales = useMemo(() => {
    const vistas = new Map<string, string>();
    for (const fila of general.data?.filas ?? []) {
      if (fila.sucursal_id !== null) vistas.set(String(fila.sucursal_id), fila.sucursal ?? `Sucursal ${fila.sucursal_id}`);
    }
    return [{ value: 'todas', label: 'Todas' }, ...Array.from(vistas.entries()).map(([value, label]) => ({ value, label }))];
  }, [general.data]);

  return (
    <Screen
      title="Plantilla y cobertura"
      isLoading={query.isLoading}
      error={query.error}
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
      header={sucursales.length > 2 ? <FilterChips options={sucursales} value={sucursal} onChange={setSucursal} /> : null}>
      {data ? (
        <>
          <View style={styles.grid}>
            <Tile label="Autorizados" value={data.totales.autorizados} />
            <Tile label="Activos" value={data.totales.activos} />
            <Tile label="Vacantes" value={data.totales.vacantes} tone="warning" />
            <Tile label="Excedentes" value={data.totales.excedentes} tone="danger" />
          </View>
          <Card>
            <InfoRow label="Cobertura" value={`${data.totales.cobertura}%`} emphasis />
          </Card>
          <SectionTitle>Por sucursal y puesto</SectionTitle>
          {data.filas.length === 0 ? (
            <EmptyMessage message="No hay plantilla autorizada registrada para este filtro." />
          ) : (
            data.filas.map((fila) => (
              <Card key={`${fila.sucursal_id}-${fila.puesto_id}`} style={styles.row}>
                <Text style={styles.puesto}>{fila.puesto ?? 'Puesto'}</Text>
                <Text style={styles.meta}>{[fila.empresa, fila.sucursal].filter(Boolean).join(' · ')}</Text>
                <Text style={styles.meta}>
                  Autorizados {fila.autorizados} · Activos {fila.activos}
                  {fila.vacantes > 0 ? ` · Vacantes ${fila.vacantes}` : ''}
                  {fila.excedentes > 0 ? ` · Excedentes ${fila.excedentes}` : ''}
                </Text>
                <Text style={[styles.cobertura, fila.cobertura < 100 && styles.coberturaBaja]}>Cobertura {fila.cobertura}%</Text>
              </Card>
            ))
          )}
        </>
      ) : null}
    </Screen>
  );
}

function Tile({ label, value, tone }: { label: string; value: number; tone?: 'warning' | 'danger' }) {
  return (
    <View style={[styles.tile, tone === 'warning' && styles.tileWarning, tone === 'danger' && value > 0 && styles.tileDanger]} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tile: {
    flexGrow: 1,
    width: '46%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  tileWarning: {
    backgroundColor: Colors.warningSoft,
    borderColor: Colors.warningSoft,
  },
  tileDanger: {
    backgroundColor: Colors.dangerSoft,
    borderColor: Colors.dangerSoft,
  },
  tileValue: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
  },
  tileLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  row: {
    gap: 2,
  },
  puesto: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  meta: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  cobertura: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.success,
  },
  coberturaBaja: {
    color: Colors.warning,
  },
});
