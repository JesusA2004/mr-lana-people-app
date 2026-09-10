import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { rhDocumentExtractionApi } from '@/api/rh/documentExtraction';
import { isExtractionInProgress } from '@/utils/documentExtraction';

/**
 * Extracción automática de un documento RH. Polling controlado (AGENTS.md
 * de este encargo, sección 52): solo cada 4s, y solo mientras el estado
 * sigue en `pending`/`processing` — React Query detiene `refetchInterval`
 * solo devolviendo `false` en cuanto `processed`/`failed`/`reviewed`. Nunca
 * un polling global: esta query solo vive mientras la pantalla del
 * documento está montada (`enabled`).
 */
export function useRhDocumentExtraction(documentoId: string | number | undefined, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.rhDocumentExtraction(documentoId ?? ''),
    queryFn: () => rhDocumentExtractionApi.get(documentoId as string | number),
    enabled: enabled && Boolean(documentoId),
    refetchInterval: (query) => (isExtractionInProgress(query.state.data?.status) ? 4000 : false),
  });
}

export function useRhDocumentExtractionAplicar(documentoId: string | number | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fields: Record<string, string>) => rhDocumentExtractionApi.aplicar(documentoId as string | number, fields),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.rhDocumentExtraction(documentoId ?? '') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.rhDocumento(documentoId ?? '') });
    },
  });
}

export function useRhDocumentExtractionIgnorar(documentoId: string | number | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fields?: string[]) => rhDocumentExtractionApi.ignorar(documentoId as string | number, fields),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.rhDocumentExtraction(documentoId ?? '') }),
  });
}

export function useRhDocumentExtractionReprocesar(documentoId: string | number | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => rhDocumentExtractionApi.reprocesar(documentoId as string | number),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.rhDocumentExtraction(documentoId ?? '') }),
  });
}
