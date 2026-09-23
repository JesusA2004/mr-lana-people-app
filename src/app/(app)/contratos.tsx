import { useRouter } from 'expo-router';

import { ContratoCard } from '@/components/ciclo/ContratoCard';
import { EmptyMessage, Screen } from '@/components/ciclo/Screen';
import { useMisContratos } from '@/hooks/queries/useCicloLaboral';

/**
 * Mis contratos — `GET /colaborador/contratos` (`ContratoLaboralService::aArray()`).
 * `dias_para_vencer` y las fechas las calcula el backend; la app NUNCA
 * calcula renovaciones ni vencimientos.
 */
export default function MisContratosScreen() {
  const router = useRouter();
  const query = useMisContratos();
  const contratos = query.data ?? [];

  return (
    <Screen
      title="Mis contratos"
      isLoading={query.isLoading}
      error={query.error}
      notFoundMessage="Tu cuenta todavía no está vinculada a un expediente de colaborador."
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}>
      {contratos.length === 0 ? (
        <EmptyMessage message="Todavía no hay contratos. Cuando Recursos Humanos registre el tuyo, verás aquí su tipo y vigencia." />
      ) : (
        contratos.map((contrato) => (
          <ContratoCard
            key={contrato.id}
            contrato={contrato}
            onOpenDocumento={
              contrato.documento_id
                ? () => router.push({ pathname: '/documentos-laborales/[id]', params: { id: String(contrato.documento_id) } })
                : undefined
            }
          />
        ))
      )}
    </Screen>
  );
}
