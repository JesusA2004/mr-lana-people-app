import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ItemCard, LoadMore } from '@/components/ciclo/ItemCard';
import { EmptyMessage, Notice, Screen } from '@/components/ciclo/Screen';
import { FadeInView } from '@/components/FadeInView';
import { Spacing } from '@/constants/colors';
import { useMisRecibos } from '@/hooks/queries/useCicloLaboral';
import { formatPeriodo, reciboPeriodoLabel } from '@/utils/payroll';
import { formatDateShort } from '@/utils/dates';
import { formatCurrencyMXN } from '@/utils/formatters';

/**
 * Mis recibos — recibos INTERNOS de nómina (no fiscales). Solo lectura:
 * `GET /colaborador/recibos` (paginado). People no emite CFDI.
 */
export default function MisRecibosScreen() {
  const router = useRouter();
  const query = useMisRecibos();
  const recibos = query.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <Screen
      title="Mis recibos"
      subtitle="Recibo interno de nómina · no fiscal"
      isLoading={query.isLoading}
      error={query.error}
      notFoundMessage="Tu cuenta todavía no está vinculada a un expediente de colaborador."
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}>
      <Notice tone="info">Estos recibos son comprobantes internos de pago semanal. No son CFDI ni sustituyen el comprobante fiscal.</Notice>
      {recibos.length === 0 ? (
        <EmptyMessage message="Todavía no tienes recibos internos de nómina." />
      ) : (
        <View style={styles.list}>
          {recibos.map((recibo, index) => (
            <FadeInView key={recibo.id} index={Math.min(index, 6)}>
              <ItemCard
                icon="receipt-outline"
                kicker={recibo.folio}
                title={reciboPeriodoLabel(recibo)}
                subtitle={formatPeriodo(recibo.periodo_inicio, recibo.periodo_fin)}
                amount={formatCurrencyMXN(recibo.neto)}
                lines={[
                  recibo.fecha_pago ? `Pago: ${formatDateShort(recibo.fecha_pago)}` : null,
                  `Percepciones ${formatCurrencyMXN(recibo.total_percepciones)} · Deducciones ${formatCurrencyMXN(recibo.total_deducciones)}`,
                  recibo.tiene_pdf ? 'PDF disponible' : 'PDF aún no disponible',
                ]}
                onPress={() => router.push({ pathname: '/recibos/[id]', params: { id: String(recibo.id) } })}
              />
            </FadeInView>
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
