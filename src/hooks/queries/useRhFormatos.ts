import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { rhFormatosApi, type GenerarFormatoPayload, type RhFormatosParams } from '@/api/rh/formatos';

export function useRhFormatos(params: RhFormatosParams, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.rhFormatos(params as Record<string, unknown>),
    queryFn: () => rhFormatosApi.list(params),
    enabled,
  });
}

/**
 * `GET .../preparar` — solo se dispara cuando ya se eligió formato +
 * colaborador (AGENTS.md de este encargo, sección 43: "nunca mandar
 * Generate a ciegas", esta consulta es justo el paso previo).
 */
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
      // Un formato recién generado puede afectar contadores del expediente/bootstrap del colaborador.
      void queryClient.invalidateQueries({ queryKey: queryKeys.rhFormatos() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.bootstrap });
    },
  });
}
