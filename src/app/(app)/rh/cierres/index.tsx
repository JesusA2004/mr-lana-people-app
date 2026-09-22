import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FilterChips } from '@/components/ciclo/FilterChips';
import { ItemCard, LoadMore } from '@/components/ciclo/ItemCard';
import { EmptyMessage, Screen } from '@/components/ciclo/Screen';
import { Spacing } from '@/constants/colors';
import { useRhCierres } from '@/hooks/queries/useRhCicloLaboral';
import { cierreBadge } from '@/utils/cierre';
import { formatDateShort } from '@/utils/dates';
import { formatCurrencyMXN } from '@/utils/formatters';

type Filtro = 'todos' | 'iniciado' | 'aviso_registrado' | 'finiquito_en_proceso' | 'finiquito_firmado' | 'pagado' | 'baja_ejecutada' | 'expediente_cerrado' | 'cancelado';

const FILTROS: { value: Filtro; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'iniciado', label: 'Iniciados' },
  { value: 'finiquito_en_proceso', label: 'Finiquito en proceso' },
  { value: 'finiquito_firmado', label: 'Firmados' },
  { value: 'pagado', label: 'Pagados' },
  { value: 'baja_ejecutada', label: 'Baja ejecutada' },
  { value: 'expediente_cerrado', label: 'Cerrados' },
  { value: 'cancelado', label: 'Cancelados' },
];

/** Cierres laborales — `GET /rh/cierres` (permiso `cierres.ver`, alcance). */
export default function RhCierresScreen() {
  const router = useRouter();
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const query = useRhCierres(filtro === 'todos' ? undefined : filtro);
  const cierres = query.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <Screen
      title="Cierres laborales"
      subtitle="Bajas y finiquitos"
      isLoading={query.isLoading}
      error={query.error}
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
      header={<FilterChips options={FILTROS} value={filtro} onChange={setFiltro} />}>
      {cierres.length === 0 ? (
        <EmptyMessage message="No hay cierres laborales en esta sección. Un cierre se inicia desde el detalle del colaborador." />
      ) : (
        <View style={styles.list}>
          {cierres.map((cierre) => (
            <ItemCard
              key={cierre.id}
              icon="exit-outline"
              kicker={cierre.tipo_baja_etiqueta}
              title={cierre.colaborador?.nombre ?? 'Colaborador'}
              subtitle={cierre.fecha_efectiva ? `Fecha efectiva: ${formatDateShort(cierre.fecha_efectiva)}` : null}
              amount={cierre.finiquito?.neto !== null && cierre.finiquito?.neto !== undefined ? formatCurrencyMXN(cierre.finiquito.neto) : null}
              status={cierreBadge(cierre.estado)}
              statusLabel={cierre.estado_etiqueta}
              onPress={() => router.push(`/(app)/rh/cierres/${cierre.id}` as never)}
            />
          ))}
          <LoadMore hasNextPage={query.hasNextPage} isFetching={query.isFetchingNextPage} onPress={() => void query.fetchNextPage()} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.md,
  },
});
