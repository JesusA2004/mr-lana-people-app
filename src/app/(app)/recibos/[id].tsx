import { useLocalSearchParams } from 'expo-router';

import { recibosApi } from '@/api/cicloLaboral';
import { DocumentoProtegido } from '@/components/DocumentoProtegido';
import { ReciboDetail } from '@/components/ciclo/ReciboDetail';
import { Notice, Screen } from '@/components/ciclo/Screen';
import { useMiRecibo } from '@/hooks/queries/useCicloLaboral';

/**
 * Detalle del recibo de nómina — `GET /colaborador/recibos/{id}` (Policy
 * `ReciboNominaPolicy::ver`, solo el propio). PDF por streaming autenticado
 * SOLO si `tiene_pdf === true`: nunca un botón que termine en 404.
 */
export default function MiReciboScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useMiRecibo(id);
  const recibo = query.data;

  return (
    <Screen
      title="Recibo de nómina"
      isLoading={query.isLoading}
      error={query.error} hayDatos={query.data !== undefined}
      notFoundMessage="Este recibo ya no está disponible."
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}>
      {recibo ? (
        <>
          <ReciboDetail recibo={recibo} />
          {recibo.tiene_pdf ? (
            <DocumentoProtegido
              titulo={`Recibo de nómina ${recibo.folio ?? ''}`.trim()}
              modo="descarga"
              path={recibosApi.pdfPath(recibo.id)}
              puedeDescargar={recibo.puede_descargar === true}
            />
          ) : (
            <Notice tone="warning">El comprobante PDF aún no está disponible.</Notice>
          )}
        </>
      ) : null}
    </Screen>
  );
}
