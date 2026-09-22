import { JerarquiaCard } from '@/components/ciclo/JerarquiaCard';
import { Screen } from '@/components/ciclo/Screen';
import { useMiJerarquia } from '@/hooks/queries/useCicloLaboral';

/** Mi jerarquía — `GET /colaborador/jerarquia` (`JerarquiaColaboradorService::jerarquia()`). */
export default function MiJerarquiaScreen() {
  const query = useMiJerarquia();

  return (
    <Screen
      title="Mi jerarquía"
      isLoading={query.isLoading}
      error={query.error}
      notFoundMessage="Tu cuenta todavía no está vinculada a un expediente de colaborador."
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}>
      {query.data ? <JerarquiaCard jerarquia={query.data} /> : null}
    </Screen>
  );
}
