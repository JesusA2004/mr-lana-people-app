import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FilterChips } from '@/components/ciclo/FilterChips';
import { ItemCard } from '@/components/ciclo/ItemCard';
import { EmptyMessage, Screen } from '@/components/ciclo/Screen';
import { Spacing } from '@/constants/colors';
import { useRhContratosPorVencer } from '@/hooks/queries/useRhCicloLaboral';
import { formatDateShort } from '@/utils/dates';

type Dias = '15' | '30' | '60' | '90';

const OPCIONES: { value: Dias; label: string }[] = [
  { value: '15', label: '15 días' },
  { value: '30', label: '30 días' },
  { value: '60', label: '60 días' },
  { value: '90', label: '90 días' },
];

/**
 * Contratos por vencer — `GET /rh/contratos/por-vencer?dias=` (permiso
 * `contratos.ver`, alcance organizacional). `dias_para_vencer` y el
 * estado de la evaluación vienen del backend; la app no calcula fechas.
 */
export default function RhContratosPorVencerScreen() {
  const router = useRouter();
  const [dias, setDias] = useState<Dias>('30');
  const query = useRhContratosPorVencer(Number(dias));
  const contratos = query.data?.contratos ?? [];

  return (
    <Screen
      title="Contratos por vencer"
      isLoading={query.isLoading}
      error={query.error}
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
      header={<FilterChips options={OPCIONES} value={dias} onChange={setDias} />}>
      {contratos.length === 0 ? (
        <EmptyMessage message={`No hay contratos vigentes que venzan en los próximos ${dias} días.`} />
      ) : (
        <View style={styles.list}>
          {contratos.map((contrato) => {
            const vencido = contrato.dias_para_vencer !== null && contrato.dias_para_vencer < 0;
            return (
              <ItemCard
                key={contrato.id}
                icon="hourglass-outline"
                kicker={contrato.tipo_etiqueta}
                title={contrato.colaborador ?? `Colaborador #${contrato.colaborador_id ?? ''}`}
                subtitle={contrato.fecha_fin ? `Vence el ${formatDateShort(contrato.fecha_fin)}` : null}
                lines={[
                  contrato.dias_para_vencer !== null
                    ? vencido
                      ? `Venció hace ${Math.abs(contrato.dias_para_vencer)} día(s)`
                      : `${contrato.dias_para_vencer} día(s) restantes`
                    : null,
                  contrato.evaluacion_id ? 'Evaluación de periodo de prueba abierta' : 'Sin evaluación registrada',
                ]}
                status={vencido || (contrato.dias_para_vencer ?? 99) <= 7 ? 'requiere_correccion' : 'en_revision'}
                statusLabel={contrato.evaluacion_id ? 'Ver evaluación' : 'Ver colaborador'}
                onPress={() =>
                  contrato.evaluacion_id
                    ? router.push({ pathname: '/evaluaciones/[id]', params: { id: String(contrato.evaluacion_id) } })
                    : router.push(`/(app)/rh/colaboradores/${contrato.colaborador_id}` as never)
                }
              />
            );
          })}
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
