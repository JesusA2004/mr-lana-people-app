import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FilterChips } from '@/components/ciclo/FilterChips';
import { ItemCard, LoadMore } from '@/components/ciclo/ItemCard';
import { EmptyMessage, Notice, Screen } from '@/components/ciclo/Screen';
import { Spacing } from '@/constants/colors';
import { useRhBajas } from '@/hooks/queries/useRhBajas';
import { formatDateShort } from '@/utils/dates';

type Filtro = 'abiertas' | 'cerrada' | 'todas';

const FILTROS: { value: Filtro; label: string }[] = [
  { value: 'abiertas', label: 'En trámite' },
  { value: 'cerrada', label: 'Cerradas' },
  { value: 'todas', label: 'Todas' },
];

/**
 * Bajas (consulta): `GET /rh/bajas`. El backend acota lo que cada cuenta ve
 * (Jurídico, Contraloría, alcance). Registrar y cerrar se administra en la web.
 */
export default function RhBajasScreen() {
  const router = useRouter();
  const [filtro, setFiltro] = useState<Filtro>('abiertas');
  const query = useRhBajas(filtro);
  const bajas = query.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <Screen
      title="Bajas"
      isLoading={query.isLoading}
      error={query.error}
      hayDatos={query.data !== undefined}
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
      header={<FilterChips options={FILTROS} value={filtro} onChange={setFiltro} />}>
      <Notice tone="info">Aquí consultas las bajas. Se registran y se cierran en el Portal Web.</Notice>
      {bajas.length === 0 ? (
        <EmptyMessage message="No hay bajas en esta sección." />
      ) : (
        <View style={styles.list}>
          {bajas.map((baja) => (
            <ItemCard
              key={baja.id}
              avatar={{ nombre: baja.colaborador, fotoUrl: baja.foto_url }}
              kicker={baja.forma_etiqueta}
              title={baja.colaborador}
              subtitle={[baja.folio, baja.fecha_baja ? formatDateShort(baja.fecha_baja) : null].filter(Boolean).join(' · ')}
              lines={[baja.causal, baja.sucursal]}
              status={baja.estatus}
              statusLabel={baja.estatus_etiqueta}
              onPress={() => router.push(`/(app)/rh/bajas/${baja.id}` as never)}
            />
          ))}
          <LoadMore hasNextPage={query.hasNextPage} isFetching={query.isFetchingNextPage} onPress={() => void query.fetchNextPage()} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.md },
});
