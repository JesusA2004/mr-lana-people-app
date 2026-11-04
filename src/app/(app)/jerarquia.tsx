import { JerarquiaCard } from '@/components/ciclo/JerarquiaCard';
import { Screen } from '@/components/ciclo/Screen';
import { useMiJerarquia } from '@/hooks/queries/useCicloLaboral';
import { ExpedienteGate } from '@/components/guia/ExpedienteGate';

/** Mi jerarquía — `GET /colaborador/jerarquia` (`JerarquiaColaboradorService::jerarquia()`). */
function MiJerarquiaScreen() {
  const query = useMiJerarquia();

  return (
    <Screen
      title="Mi jerarquía"
      isLoading={query.isLoading}
      error={query.error} hayDatos={query.data !== undefined}
      notFoundMessage="Tu cuenta todavía no está vinculada a un expediente de colaborador."
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}>
      {query.data ? <JerarquiaCard jerarquia={query.data} /> : null}
    </Screen>
  );
}

/** Modo completar expediente: con datos/documentos pendientes se muestra el bloqueo (423 en backend). */
export default function MiJerarquiaScreenConCandado() {
  return (
    <ExpedienteGate modulo="Mi jerarquía">
      <MiJerarquiaScreen />
    </ExpedienteGate>
  );
}
