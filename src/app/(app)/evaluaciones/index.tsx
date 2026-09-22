import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FilterChips } from '@/components/ciclo/FilterChips';
import { ItemCard, LoadMore } from '@/components/ciclo/ItemCard';
import { EmptyMessage, Screen } from '@/components/ciclo/Screen';
import { Spacing } from '@/constants/colors';
import { useEvaluaciones } from '@/hooks/queries/useTrabajo';
import { formatDateShort } from '@/utils/dates';
import { evaluacionBadge } from '@/utils/evaluation';

type Filtro = 'todas' | 'pendiente' | 'devuelta' | 'capturada' | 'autorizada';

const FILTROS: { value: Filtro; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'pendiente', label: 'Por evaluar' },
  { value: 'devuelta', label: 'Devueltas' },
  { value: 'capturada', label: 'Por autorizar' },
  { value: 'autorizada', label: 'Autorizadas' },
];

/**
 * Evaluaciones de periodo de prueba — `GET /evaluaciones`. El backend ya
 * acota: RH/Dirección (`evaluaciones.autorizar`) ven por alcance; un jefe
 * solo las de su equipo. Pantalla compartida por ambas experiencias.
 */
export default function EvaluacionesScreen() {
  const router = useRouter();
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const query = useEvaluaciones(filtro === 'todas' ? undefined : filtro);
  const evaluaciones = query.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <Screen
      title="Evaluaciones"
      subtitle="Periodo de prueba"
      isLoading={query.isLoading}
      error={query.error}
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
      header={<FilterChips options={FILTROS} value={filtro} onChange={setFiltro} />}>
      {evaluaciones.length === 0 ? (
        <EmptyMessage message="No hay evaluaciones en esta sección." />
      ) : (
        <View style={styles.list}>
          {evaluaciones.map((evaluacion) => (
            <ItemCard
              key={evaluacion.id}
              icon="clipboard-outline"
              kicker={evaluacion.contrato?.tipo_etiqueta}
              title={evaluacion.colaborador?.nombre ?? 'Colaborador'}
              subtitle={evaluacion.colaborador?.numero_empleado ? `N.º ${evaluacion.colaborador.numero_empleado}` : null}
              lines={[
                evaluacion.fecha_limite ? `Fecha límite: ${formatDateShort(evaluacion.fecha_limite)}` : null,
                evaluacion.contrato?.fecha_fin ? `Vence el contrato: ${formatDateShort(evaluacion.contrato.fecha_fin)}` : null,
              ]}
              status={evaluacionBadge(evaluacion.estado)}
              statusLabel={evaluacion.estado_etiqueta}
              onPress={() => router.push({ pathname: '/evaluaciones/[id]', params: { id: String(evaluacion.id) } })}
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
