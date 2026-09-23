import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { ItemCard, LoadMore } from '@/components/ciclo/ItemCard';
import { EmptyMessage, Notice, Screen } from '@/components/ciclo/Screen';
import { Spacing } from '@/constants/colors';
import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';
import { useRhRecibos } from '@/hooks/queries/useRhCicloLaboral';
import { hasPermission } from '@/utils/capabilities';
import { formatCurrencyMXN } from '@/utils/formatters';
import { formatPeriodo, reciboPeriodoLabel } from '@/utils/payroll';

/**
 * Recibos internos (RH) — `GET /rh/recibos` (permiso `nomina.recibos.ver`,
 * alcance). Filtro opcional por colaborador (desde su detalle) o lote.
 */
export default function RhRecibosScreen() {
  const router = useRouter();
  const { colaboradorId, lote, nombre } = useLocalSearchParams<{ colaboradorId?: string; lote?: string; nombre?: string }>();
  const bootstrap = useMobileBootstrap(true);
  const puedeImportar = hasPermission(bootstrap.data?.user.permissions, 'nomina.recibos.importar');
  const query = useRhRecibos({ ...(colaboradorId ? { colaborador_id: colaboradorId } : {}), ...(lote ? { lote } : {}) });
  const recibos = query.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <Screen
      title="Recibos internos"
      subtitle={nombre ?? (lote ? `Lote ${lote}` : 'No fiscales')}
      isLoading={query.isLoading}
      error={query.error}
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}>
      <Notice tone="info">Recibos internos de pago semanal. No son CFDI; People no timbra ni calcula impuestos.</Notice>
      {puedeImportar && !colaboradorId ? (
        <Button title="Importar CSV / XLSX" leftIcon="cloud-upload-outline" variant="outline" onPress={() => router.push('/(app)/rh/recibos/importar' as never)} />
      ) : null}
      {recibos.length === 0 ? (
        <EmptyMessage message="Aún no hay recibos aquí. Captura uno o impórtalos desde un archivo." />
      ) : (
        <View style={styles.list}>
          {recibos.map((recibo) => (
            <ItemCard
              key={recibo.id}
              icon="receipt-outline"
              kicker={recibo.folio}
              title={recibo.colaborador?.nombre ?? reciboPeriodoLabel(recibo)}
              subtitle={`${reciboPeriodoLabel(recibo)} · ${formatPeriodo(recibo.periodo_inicio, recibo.periodo_fin) ?? ''}`}
              amount={formatCurrencyMXN(recibo.neto)}
              lines={[recibo.tiene_pdf ? 'PDF disponible' : 'PDF pendiente']}
              onPress={() => router.push(`/(app)/rh/recibos/${recibo.id}` as never)}
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
