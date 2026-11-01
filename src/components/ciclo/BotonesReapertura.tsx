import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { reaperturasApi } from '@/api/rh/reaperturas';
import { Button } from '@/components/Button';
import { MotivoModal } from '@/components/MotivoModal';
import { invalidateRhQueries } from '@/hooks/queries/rhInvalidate';
import { SENSITIVE_MUTATION } from '@/hooks/queries/queryOptions';
import { toast } from '@/store/toastStore';
import type { ReaperturaDisponible } from '@/types/siguientePaso';
import { getActionErrorMessage, logError } from '@/utils/errors';

/**
 * «Reabrir» solo con lo que manda el campo `reaperturas`; el backend vuelve a
 * validar autoridad y estado. El motivo es obligatorio y queda en el historial.
 */
export function BotonesReapertura({ reaperturas, onHecho }: { reaperturas: ReaperturaDisponible[]; onHecho?: () => void }) {
  const queryClient = useQueryClient();
  const [elegida, setElegida] = useState<ReaperturaDisponible | null>(null);
  const reabrir = useMutation({
    ...SENSITIVE_MUTATION,
    mutationFn: ({ opcion, motivo }: { opcion: ReaperturaDisponible; motivo: string }) => reaperturasApi.reabrir(opcion.tipo, opcion.id, motivo),
    onSuccess: () => {
      invalidateRhQueries(queryClient);
      toast.success('Se reabrió la decisión y quedó en el historial.');
      setElegida(null);
      onHecho?.();
    },
    onError: (error) => {
      logError('reapertura', error);
      toast.error(getActionErrorMessage(error));
    },
  });

  if (reaperturas.length === 0) return null;

  return (
    <>
      {reaperturas.map((opcion) => (
        <Button key={`${opcion.tipo}-${opcion.id}`} title={`Reabrir: ${opcion.etiqueta}`} variant="outline" leftIcon="refresh" disabled={reabrir.isPending} onPress={() => setElegida(opcion)} />
      ))}
      <MotivoModal
        visible={elegida !== null}
        title={elegida ? `Reabrir: ${elegida.etiqueta}` : 'Reabrir'}
        description="Explica por qué se reabre. Queda en el historial."
        confirmLabel="Reabrir"
        submitting={reabrir.isPending}
        onCancel={() => setElegida(null)}
        onConfirm={(motivo) => {
          if (elegida) reabrir.mutate({ opcion: elegida, motivo });
        }}
      />
    </>
  );
}
