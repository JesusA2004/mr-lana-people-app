import { useLocalSearchParams, useRouter } from 'expo-router';

import { PrestamoDetail } from '@/components/ciclo/PrestamoDetail';
import { Screen } from '@/components/ciclo/Screen';
import { useMiPrestamo } from '@/hooks/queries/useCicloLaboral';

/** Detalle de un préstamo propio — `GET /colaborador/prestamos/{id}` (`PrestamoPolicy::ver`). */
export default function MiPrestamoScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useMiPrestamo(id);

  return (
    <Screen
      title="Préstamo"
      isLoading={query.isLoading}
      error={query.error}
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
