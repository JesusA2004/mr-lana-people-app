import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { rhDocumentExtractionApi } from '@/api/rh/documentExtraction';
import type { ExtractionApplicableField } from '@/types/documentExtraction';
import { isExtractionInProgress } from '@/utils/documentExtraction';

/**
 * Extracción automática de un documento RH. Polling controlado (AGENTS.md
 * de este encargo, sección 52): solo cada 4s, y solo mientras el estado
 * sigue en `pending`/`processing` — React Query detiene `refetchInterval`
 * en cuanto `processed`/`failed`/`reviewed`. Nunca un polling global: esta
 * query solo vive mientras la pantalla del documento está montada
 * (`enabled`).
 */
export function useRhDocumentExtraction(documentoId: string | number | undefined, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.rhDocumentExtraction(documentoId ?? ''),
    queryFn: () => rhDocumentExtractionApi.get(documentoId as string | number),
    enabled: enabled && Boolean(documentoId),
    refetchInterval: (query) => (isExtractionInProgress(query.state.data?.extraccion?.status) ? 4000 : false),
  });
}

export function useRhDocumentExtractionAplicar(documentoId: string | number | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (valores: Partial<Record<ExtractionApplicableField, string>>) =>
      rhDocumentExtractionApi.aplicar(documentoId as string | number, valores),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.rhDocumentExtraction(documentoId ?? '') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.rhDocumento(documentoId ?? '') });
    },
  });
}

export function useRhDocumentExtractionIgnorar(documentoId: string | number | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => rhDocumentExtractionApi.ignorar(documentoId as string | number),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.rhDocumentExtraction(documentoId ?? '') }),
  });
}

// No hay `useRhDocumentExtractionReprocesar`: la acción no existe en la API
// móvil real (ver `src/api/rh/documentExtraction.ts` y
// `docs/BACKEND_GAPS_FINAL.md`) — no se declara el hook para que nada en la
// UI pueda quedar tentado a llamarlo por accidente.
