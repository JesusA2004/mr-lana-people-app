import { useLocalSearchParams, useRouter } from 'expo-router';

import { PrestamoDetail } from '@/components/ciclo/PrestamoDetail';
import { Screen } from '@/components/ciclo/Screen';
import { useMiPrestamo } from '@/hooks/queries/useCicloLaboral';
import { ExpedienteGate } from '@/components/guia/ExpedienteGate';

/** Detalle de un préstamo propio — `GET /colaborador/prestamos/{id}` (`PrestamoPolicy::ver`). */
function MiPrestamoScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useMiPrestamo(id);

  return (
    <Screen
      title="Préstamo"
      isLoading={query.isLoading}
      error={query.error} hayDatos={query.data !== undefined}
      notFoundMessage="Este préstamo ya no está disponible."
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}>
      {query.data ? (
        <PrestamoDetail
          prestamo={query.data}
          onOpenDocumento={(documento) => router.push({ pathname: '/documentos-laborales/[id]', params: { id: String(documento.id) } })}
        />
      ) : null}
    </Screen>
  );
}

/** Modo completar expediente: con datos/documentos pendientes se muestra el bloqueo (423 en backend). */
export default function MiPrestamoScreenConCandado() {
  return (
    <ExpedienteGate modulo="Préstamo">
      <MiPrestamoScreen />
    </ExpedienteGate>
  );
}
