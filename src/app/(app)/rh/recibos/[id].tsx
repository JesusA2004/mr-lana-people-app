import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { rhRecibosApi } from '@/api/rh/cicloLaboral';
import { Button } from '@/components/Button';
import { ReciboDetail } from '@/components/ciclo/ReciboDetail';
import { Notice, Screen } from '@/components/ciclo/Screen';
import { SecureDocumentViewer } from '@/components/SecureDocumentViewer';
import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';
import { useRhEmitirRecibo, useRhRecibo, useRhRegenerarReciboPdf } from '@/hooks/queries/useRhCicloLaboral';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { hasPermission } from '@/utils/capabilities';
import { getActionErrorMessage, logError } from '@/utils/errors';
import { joinName, slugifyFilename } from '@/utils/formatters';
import { confirmAction } from '@/utils/confirm';

/** Detalle RH de un recibo de nómina + PDF (solo si existe) + regenerar PDF (`nomina.recibos.crear`). */
export default function RhReciboScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useRhRecibo(id);
  const recibo = query.data;
  const bootstrap = useMobileBootstrap(true);
  const user = useAuthStore((state) => state.user);
  const regenerar = useRhRegenerarReciboPdf(Number(id));
  const emitir = useRhEmitirRecibo(Number(id));
  const [viewerOpen, setViewerOpen] = useState(false);
  const puedeRegenerar = hasPermission(bootstrap.data?.user.permissions, 'nomina.recibos.crear');

  if (viewerOpen && recibo) {
    return (
      <SecureDocumentViewer
        path={rhRecibosApi.pdfPath(recibo.id)}
        title={recibo.folio ?? 'Recibo de nómina'}
        watermarkLabel={`${joinName(user?.nombre, user?.apellidos) ?? 'RH'} · ${new Date().toLocaleString('es-MX')}`}
        onClose={() => setViewerOpen(false)}
        allowDownload
        downloadFileName={slugifyFilename(`recibo-${recibo.folio ?? recibo.id}`)}
      />
    );
  }

  return (
    <Screen
      title="Recibo de nómina"
      isLoading={query.isLoading}
      error={query.error}
      notFoundMessage="Este recibo ya no está disponible."
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}>
      {recibo ? (
        <>
          <ReciboDetail recibo={recibo} colaboradorNombre={recibo.colaborador?.nombre} />
          {recibo.estado === 'borrador' ? (
            <>
              <Notice tone="info">
                Borrador: el colaborador todavía no lo ve. Se emite solo el día de pago; los ajustes de conceptos se hacen desde el portal web
                (Recibos de nómina).
              </Notice>
              {puedeRegenerar ? (
                <Button
                  title="Emitir ahora"
                  leftIcon="send-outline"
                  loading={emitir.isPending}
                  onPress={async () => {
                    const ok = await confirmAction({
                      title: 'Emitir recibo',
                      message: 'Se genera el PDF y el colaborador recibe el aviso de que ya puede consultarlo.',
                      confirmLabel: 'Emitir',
                    });
                    if (!ok) return;
                    emitir.mutate(undefined, {
                      onSuccess: () => toast.success('Recibo emitido.'),
                      onError: (error) => {
                        logError('rhRecibo.emitir', error);
                        toast.error(getActionErrorMessage(error));
                      },
                    });
                  }}
                />
              ) : null}
            </>
          ) : recibo.tiene_pdf ? (
            <Button title="Ver comprobante PDF" leftIcon="document-outline" variant="outline" onPress={() => setViewerOpen(true)} />
          ) : (
            <Notice tone="warning">El comprobante PDF aún no está disponible.</Notice>
          )}
          {puedeRegenerar && recibo.estado !== 'borrador' ? (
            <Button
              title={recibo.tiene_pdf ? 'Regenerar PDF' : 'Generar PDF'}
              variant="ghost"
              leftIcon="refresh-outline"
              loading={regenerar.isPending}
              onPress={async () => {
                const ok = await confirmAction({
                  title: recibo.tiene_pdf ? 'Regenerar PDF' : 'Generar PDF',
                  message: recibo.tiene_pdf
                    ? 'El comprobante actual se reemplazará por uno nuevo generado con los datos vigentes del recibo.'
                    : 'Se generará el comprobante PDF de este recibo.',
                  confirmLabel: recibo.tiene_pdf ? 'Regenerar' : 'Generar',
                });
                if (!ok) return;
                regenerar.mutate(undefined, {
                  onSuccess: (actualizado) =>
                    actualizado.tiene_pdf ? toast.success('PDF generado.') : toast.warning('El servidor no pudo generar el PDF. Intenta más tarde.'),
                  onError: (error) => {
                    logError('rhRecibo.regenerar', error);
                    toast.error(getActionErrorMessage(error));
                  },
                });
              }}
            />
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
