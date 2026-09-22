import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';

import { documentosLaboralesApi, type DocumentosLaboralesParams } from '@/api/documentosLaborales';
import { queryKeys } from '@/api/queryKeys';
import type { LaborDocument } from '@/types/laborDocument';
import { isNotFoundError } from '@/utils/errors';
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

/**
 * Detalle de un documento laboral PROPIO: `GET /colaborador/documentos-laborales/{id}`.
 * La caché del listado sirve como dato inicial (pantalla instantánea al
 * venir de la lista) y siempre se revalida contra el backend. Un 404
 * (cancelado, ajeno, borrado) se traduce a `null` → "Este documento ya no
 * está disponible", nunca a un error genérico.
 */
export function useLaborDocument(id: number | undefined) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: [...queryKeys.laborDocumentsRoot, 'detail', id ?? 0],
    enabled: id !== undefined && Number.isFinite(id) && id > 0,
    retry: retryUnlessClientError,
    initialData: () => (id !== undefined ? findInCache(queryClient, id) : undefined),
    initialDataUpdatedAt: 0,
    queryFn: async ({ signal }): Promise<LaborDocument | null> => {
      try {
        return await documentosLaboralesApi.detalle(id as number, signal);
      } catch (error) {
        if (isNotFoundError(error)) return null;
        throw error;
      }
    },
  });
}

export function useFirmarDocumentoLaboral() {
  const queryClient = useQueryClient();
  return useMutation({
    ...SENSITIVE_MUTATION,
    mutationFn: ({ id, comentario }: { id: number; comentario?: string | null }) => documentosLaboralesApi.firmar(id, comentario),
    onSuccess: (documento) => {
      // La UI refleja de inmediato el estado que confirmó el backend (firmado / pendiente de impresión).
      queryClient.setQueryData([...queryKeys.laborDocumentsRoot, 'detail', documento.id], documento);
      invalidateCiclo(queryClient, { type: 'documento_firmado' });
    },
  });
}
