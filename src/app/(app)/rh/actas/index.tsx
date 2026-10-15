import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FilterChips } from '@/components/ciclo/FilterChips';
import { ItemCard, LoadMore } from '@/components/ciclo/ItemCard';
import { EmptyMessage, Notice, Screen } from '@/components/ciclo/Screen';
import { Spacing } from '@/constants/colors';
import { useRhActas } from '@/hooks/queries/useRhCicloLaboral';
import { actaBadge, actaEstadoLabel, AVISO_ACTAS_SOLO_CONSULTA } from '@/utils/acta';
import { formatDateShort } from '@/utils/dates';

type Filtro = 'todas' | 'borrador' | 'generada' | 'firmada' | 'cerrada';

const FILTROS: { value: Filtro; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'borrador', label: 'Borradores' },
  { value: 'generada', label: 'Generadas' },
  { value: 'firmada', label: 'Firmadas' },
  { value: 'cerrada', label: 'Cerradas' },
];

/**
 * Actas (RH) — SOLO CONSULTA: `GET /rh/actas` (permiso `actas.ver`). Se
 * levantan y completan en el Portal RH web. El implicado nunca las ve.
 */
export default function RhActasScreen() {
  const router = useRouter();
  const { colaboradorId, nombre } = useLocalSearchParams<{ colaboradorId?: string; nombre?: string }>();
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const query = useRhActas({ ...(filtro !== 'todas' ? { estado: filtro } : {}), ...(colaboradorId ? { colaborador_id: colaboradorId } : {}) });
  const actas = query.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <Screen
      title="Actas"
      subtitle={nombre}
      isLoading={query.isLoading}
      error={query.error}
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
      header={<FilterChips options={FILTROS} value={filtro} onChange={setFiltro} />}>
      <Notice tone="info">{AVISO_ACTAS_SOLO_CONSULTA}</Notice>
      {actas.length === 0 ? (
        <EmptyMessage message="No hay actas en esta sección." />
      ) : (
        <View style={styles.list}>
          {actas.map((acta) => (
            <ItemCard
              key={acta.id}
              icon="reader-outline"
              kicker={acta.tipo_etiqueta}
              title={acta.colaborador?.nombre ?? 'Colaborador'}
              subtitle={[acta.folio, acta.fecha ? formatDateShort(acta.fecha) : null].filter(Boolean).join(' · ')}
              lines={[acta.motivo, acta.lugar, acta.negativa_firma ? 'Negativa a firmar registrada' : null]}
              status={actaBadge(acta.estado)}
              statusLabel={actaEstadoLabel(acta.estado)}
              onPress={() => router.push(`/(app)/rh/actas/${acta.id}` as never)}
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
