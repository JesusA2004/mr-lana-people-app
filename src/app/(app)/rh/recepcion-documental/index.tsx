import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ItemCard, LoadMore } from '@/components/ciclo/ItemCard';
import { EmptyMessage, Screen } from '@/components/ciclo/Screen';
import { Spacing, type ColorPalette } from '@/constants/colors';
import { useRhRecepcionCortes } from '@/hooks/queries/useRhRecepcionDocumental';
import { useEstilos } from '@/theme/ThemeProvider';
import { textoCumplimiento } from '@/utils/recepcionDocumental';

/**
 * Recepción documental RH: un periodo por mes con lo esperado, recibido y
 * pendiente (originales físicos). Todo lo calcula el backend.
 */
export default function RecepcionDocumentalScreen() {
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const cortes = useRhRecepcionCortes();
  const lista = cortes.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <Screen
      title="Recepción documental"
      subtitle="Originales firmados que llegan por paquetería"
      isLoading={cortes.isLoading}
      error={cortes.error}
      hayDatos={lista.length > 0}
      onRetry={() => void cortes.refetch()}
      refreshing={cortes.isRefetching && !cortes.isFetchingNextPage}
      onRefresh={() => void cortes.refetch()}>
      {lista.length === 0 ? (
        <EmptyMessage message="Todavía no hay periodos de recepción. RH los genera desde el Portal Web." />
      ) : (
        <View style={styles.lista}>
          {lista.map((corte) => (
            <ItemCard
              key={corte.id}
              icon="calendar-outline"
              title={corte.etiqueta}
              subtitle={`Cumplimiento ${textoCumplimiento(corte.metricas.cumplimiento)}`}
              lines={[
                `Esperados ${corte.metricas.esperados} · Recibidos ${corte.metricas.recibidos} · Pendientes ${corte.metricas.pendientes}`,
                corte.metricas.no_recibidos > 0 ? `No recibidos ${corte.metricas.no_recibidos}` : null,
              ]}
              status={corte.estado}
              statusLabel={corte.estado_etiqueta}
              onPress={() => router.push(`/(app)/rh/recepcion-documental/${corte.id}` as never)}
            />
          ))}
          <LoadMore hasNextPage={cortes.hasNextPage} isFetching={cortes.isFetchingNextPage} onPress={() => void cortes.fetchNextPage()} />
        </View>
      )}
    </Screen>
  );
}

const crearEstilos = (_Colors: ColorPalette) =>
  StyleSheet.create({
    lista: { gap: Spacing.md },
  });
