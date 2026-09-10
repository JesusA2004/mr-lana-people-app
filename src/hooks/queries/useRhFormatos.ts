import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { rhFormatosApi, type GenerarFormatoPayload } from '@/api/rh/formatos';

/** `GET /rh/formatos` — arreglo plano, sin paginación ni filtros de query (ver `rhFormatosApi.list`). */
export function useRhFormatos(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.rhFormatos(),
    queryFn: () => rhFormatosApi.list(),
    enabled,
  });
}

// -----------------------------------------------------------------------------
// Contrato PROPUESTO, aún no implementado en el backend real — ver
// `src/api/rh/formatos.ts` y `docs/BACKEND_GAPS_FINAL.md`. Se mantienen
// estos hooks solo para que `rh/formatos/generar.tsx` compile; nada en la
// navegación real de la app los invoca.
// -----------------------------------------------------------------------------

export function useRhFormatoPreparation(formatoId: string | number | undefined, colaboradorId: string | number | undefined) {
  return useQuery({
    queryKey: queryKeys.rhFormatoPreparation(formatoId ?? '', colaboradorId ?? ''),
    queryFn: () => rhFormatosApi.preparar(formatoId as string | number, colaboradorId as string | number),
    enabled: Boolean(formatoId) && Boolean(colaboradorId),
  });
}

export function useRhFormatoGenerar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ formatoId, payload }: { formatoId: string | number; payload: GenerarFormatoPayload }) =>
      rhFormatosApi.generar(formatoId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.rhFormatos() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.bootstrap });
    },
  });
}
