import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { recibosApi } from '@/api/cicloLaboral';
import { Button } from '@/components/Button';
import { ReciboDetail } from '@/components/ciclo/ReciboDetail';
import { Notice, Screen } from '@/components/ciclo/Screen';
import { SecureDocumentViewer } from '@/components/SecureDocumentViewer';
import { useMiRecibo } from '@/hooks/queries/useCicloLaboral';
import { slugifyFilename } from '@/utils/formatters';

/**
 * Detalle del recibo interno — `GET /colaborador/recibos/{id}` (Policy
 * `ReciboNominaPolicy::ver`, solo el propio). PDF por streaming autenticado
 * SOLO si `tiene_pdf === true`: nunca un botón que termine en 404.
 */
export default function MiReciboScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useMiRecibo(id);
  const [viewerOpen, setViewerOpen] = useState(false);
  const recibo = query.data;

  if (viewerOpen && recibo) {
    return (
      <SecureDocumentViewer
        path={recibosApi.pdfPath(recibo.id)}
        title={recibo.folio ?? 'Recibo interno'}
        onClose={() => setViewerOpen(false)}
        allowDownload
        downloadFileName={slugifyFilename(`recibo-${recibo.folio ?? recibo.id}`)}
      />
    );
  }

  return (
    <Screen
      title="Recibo interno"
      subtitle="No fiscal"
      isLoading={query.isLoading}
      error={query.error}
      notFoundMessage="Este recibo ya no está disponible."
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}>
      {recibo ? (
        <>
          <ReciboDetail recibo={recibo} />
          {recibo.tiene_pdf ? (
            <Button title="Ver comprobante PDF" leftIcon="document-outline" variant="outline" onPress={() => setViewerOpen(true)} />
          ) : (
            <Notice tone="warning">El comprobante PDF aún no está disponible.</Notice>
          )}
        </>
      ) : null}
    </Screen>
  );
}
