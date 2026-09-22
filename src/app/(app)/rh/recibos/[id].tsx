import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { rhRecibosApi } from '@/api/rh/cicloLaboral';
import { Button } from '@/components/Button';
import { ReciboDetail } from '@/components/ciclo/ReciboDetail';
import { Notice, Screen } from '@/components/ciclo/Screen';
import { SecureDocumentViewer } from '@/components/SecureDocumentViewer';
import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';
import { useRhRecibo, useRhRegenerarReciboPdf } from '@/hooks/queries/useRhCicloLaboral';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { hasPermission } from '@/utils/capabilities';
import { getActionErrorMessage, logError } from '@/utils/errors';
import { joinName, slugifyFilename } from '@/utils/formatters';

/** Detalle RH de un recibo interno + PDF (solo si existe) + regenerar PDF (`nomina.recibos.crear`). */
export default function RhReciboScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useRhRecibo(id);
  const recibo = query.data;
  const bootstrap = useMobileBootstrap(true);
  const user = useAuthStore((state) => state.user);
  const regenerar = useRhRegenerarReciboPdf(Number(id));
  const [viewerOpen, setViewerOpen] = useState(false);
  const puedeRegenerar = hasPermission(bootstrap.data?.user.permissions, 'nomina.recibos.crear');

  if (viewerOpen && recibo) {
    return (
      <SecureDocumentViewer
        path={rhRecibosApi.pdfPath(recibo.id)}
        title={recibo.folio ?? 'Recibo interno'}
        watermarkLabel={`${joinName(user?.nombre, user?.apellidos) ?? 'RH'} · ${new Date().toLocaleString('es-MX')}`}
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
          <ReciboDetail recibo={recibo} colaboradorNombre={recibo.colaborador?.nombre} />
          {recibo.tiene_pdf ? (
            <Button title="Ver comprobante PDF" leftIcon="document-outline" variant="outline" onPress={() => setViewerOpen(true)} />
          ) : (
            <Notice tone="warning">El comprobante PDF aún no está disponible.</Notice>
          )}
          {puedeRegenerar ? (
            <Button
              title={recibo.tiene_pdf ? 'Regenerar PDF' : 'Generar PDF'}
              variant="ghost"
              leftIcon="refresh-outline"
              loading={regenerar.isPending}
              onPress={() =>
                regenerar.mutate(undefined, {
                  onSuccess: (actualizado) =>
                    actualizado.tiene_pdf ? toast.success('PDF generado.') : toast.warning('El servidor no pudo generar el PDF. Intenta más tarde.'),
                  onError: (error) => {
                    logError('rhRecibo.regenerar', error);
                    toast.error(getActionErrorMessage(error));
                  },
                })
              }
            />
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
