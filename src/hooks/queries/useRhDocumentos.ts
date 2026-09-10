import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { rhDocumentosApi, type RhDocumentosParams } from '@/api/rh/documentos';
import { queryKeys } from '@/api/queryKeys';
import { invalidateRhQueries } from './rhInvalidate';

export function useRhDocumentos(params: RhDocumentosParams, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.rhDocumentos(params as Record<string, unknown>),
    queryFn: () => rhDocumentosApi.list(params),
    enabled,
  });
}

export function useRhDocumento(id: string | number | undefined) {
  return useQuery({
    queryKey: queryKeys.rhDocumento(id ?? ''),
    queryFn: () => rhDocumentosApi.getById(id as string | number),
    enabled: Boolean(id),
  });
}

export function useRhDocumentoAprobar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comentario }: { id: string | number; comentario?: string }) => rhDocumentosApi.aprobar(id, comentario),
    onSuccess: () => invalidateRhQueries(queryClient),
  });
}

export function useRhDocumentoRechazar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string | number; motivo: string }) => rhDocumentosApi.rechazar(id, motivo),
    onSuccess: () => invalidateRhQueries(queryClient),
  });
}
