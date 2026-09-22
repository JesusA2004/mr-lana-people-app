import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';

import { documentosLaboralesApi, type DocumentosLaboralesParams } from '@/api/documentosLaborales';
import { queryKeys } from '@/api/queryKeys';
import type { LaborDocument } from '@/types/laborDocument';
import { nextPageOf, type Paginated } from '@/utils/normalize';
import { invalidateCiclo } from './cicloInvalidate';
import { retryUnlessClientError, SENSITIVE_MUTATION } from './queryOptions';

export function useLaborDocumentsInfinite(params: Omit<DocumentosLaboralesParams, 'page'> = {}, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.laborDocuments(params as Record<string, unknown>),
    queryFn: ({ pageParam }) => documentosLaboralesApi.list({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: nextPageOf,
    enabled,
    retry: retryUnlessClientError,
  });
}

/** Busca un documento ya cargado en cualquiera de las listas en caché (todas/por firmar). */
function findInCache(queryClient: ReturnType<typeof useQueryClient>, id: number): LaborDocument | undefined {
  const cached = queryClient.getQueriesData<InfiniteData<Paginated<LaborDocument>>>({ queryKey: queryKeys.laborDocumentsRoot });
  for (const [, data] of cached) {
    for (const page of data?.pages ?? []) {
      const found = page.data.find((doc) => doc.id === id);
      if (found) return found;
    }
  }
  return undefined;
}

/** Tope de páginas a recorrer cuando el detalle se abre sin caché (push/tarea): 20 × 20 = 400 documentos propios. */
const MAX_PAGES_LOOKUP = 20;

/**
 * Detalle de un documento laboral PROPIO. El backend no expone
 * `GET /colaborador/documentos-laborales/{id}` (gap documentado en
 * `docs/MOBILE_BACKEND_SYNC_2026_09_22.md`): se usa el mismo objeto del
 * listado. Primero la caché; si se abrió desde un push/tarea sin caché, se
 * consulta "por firmar" (el caso más común) y luego el listado completo.
 */
export function useLaborDocument(id: number | undefined) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: [...queryKeys.laborDocumentsRoot, 'detail', id ?? 0],
    enabled: id !== undefined && Number.isFinite(id),
    retry: retryUnlessClientError,
    initialData: () => (id !== undefined ? findInCache(queryClient, id) : undefined),
    queryFn: async (): Promise<LaborDocument | null> => {
      const target = id as number;
      const porFirmar = await documentosLaboralesApi.list({ estado: 'pendientes_firma' });
      const pending = porFirmar.data.find((doc) => doc.id === target);
      if (pending) return pending;

      for (let page = 1; page <= MAX_PAGES_LOOKUP; page++) {
        const result = await documentosLaboralesApi.list({ page });
        const found = result.data.find((doc) => doc.id === target);
        if (found) return found;
        if (result.meta.current_page >= result.meta.last_page) break;
      }
      return null;
    },
  });
}

export function useFirmarDocumentoLaboral() {
  const queryClient = useQueryClient();
  return useMutation({
    ...SENSITIVE_MUTATION,
    mutationFn: ({ id, comentario }: { id: number; comentario?: string | null }) => documentosLaboralesApi.firmar(id, comentario),
    onSuccess: () => invalidateCiclo(queryClient, { type: 'documento_firmado' }),
  });
}
