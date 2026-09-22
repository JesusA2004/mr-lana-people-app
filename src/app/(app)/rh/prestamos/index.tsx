import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FilterChips } from '@/components/ciclo/FilterChips';
import { ItemCard, LoadMore } from '@/components/ciclo/ItemCard';
import { EmptyMessage, Notice, Screen } from '@/components/ciclo/Screen';
import { Spacing } from '@/constants/colors';
import { useRhPrestamos } from '@/hooks/queries/useRhCicloLaboral';
import { formatDateShort } from '@/utils/dates';
import { formatCurrencyMXN } from '@/utils/formatters';
import { prestamoEstadoBadge, prestamoEstadoLabel } from '@/utils/loan';

type Filtro = 'todos' | 'pendiente_entrega' | 'activo' | 'liquidado' | 'cancelado';

const FILTROS: { value: Filtro; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'pendiente_entrega', label: 'Por entregar' },
  { value: 'activo', label: 'Activos' },
  { value: 'liquidado', label: 'Liquidados' },
  { value: 'cancelado', label: 'Cancelados' },
];

/**
 * Préstamos (RH) — `GET /rh/prestamos` (permiso `prestamos.ver`). Las
 * solicitudes de préstamo aún sin autorizar viven en Pendientes →
 * Solicitudes (ahí se autoriza o rechaza, tras el visto bueno del jefe).
 */
export default function RhPrestamosScreen() {
  const router = useRouter();
  const { colaboradorId, nombre } = useLocalSearchParams<{ colaboradorId?: string; nombre?: string }>();
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const query = useRhPrestamos({ estado: filtro === 'todos' ? undefined : filtro, colaborador_id: colaboradorId });
  const prestamos = query.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <Screen
      title="Préstamos"
      subtitle={nombre}
      isLoading={query.isLoading}
      error={query.error}
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
      header={<FilterChips options={FILTROS} value={filtro} onChange={setFiltro} />}>
      <Notice tone="info">El saldo es control administrativo. MR. LANA PEOPLE no aplica descuentos de nómina.</Notice>
      {prestamos.length === 0 ? (
        <EmptyMessage message="No hay préstamos en esta sección." />
      ) : (
        <View style={styles.list}>
          {prestamos.map((prestamo) => (
            <ItemCard
              key={prestamo.id}
              icon="cash-outline"
              kicker={prestamo.folio}
              title={prestamo.colaborador?.nombre ?? 'Colaborador'}
              subtitle={prestamo.fecha_solicitud ? `Solicitado el ${formatDateShort(prestamo.fecha_solicitud)}` : null}
              amount={formatCurrencyMXN(prestamo.monto_autorizado)}
              lines={[
                prestamo.plazo_autorizado !== null ? `${prestamo.plazo_autorizado} pagos ${prestamo.periodicidad ?? ''}` : null,
                !prestamo.contrato || !prestamo.pagare ? 'Documentos pendientes de generar' : null,
                prestamo.resguardado_en ? 'Resguardado' : null,
              ]}
              status={prestamoEstadoBadge(prestamo.estado)}
              statusLabel={prestamoEstadoLabel(prestamo.estado)}
              onPress={() => router.push(`/(app)/rh/prestamos/${prestamo.id}` as never)}
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
