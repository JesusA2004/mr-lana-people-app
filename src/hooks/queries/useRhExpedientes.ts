import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { rhExpedientesApi, type RhExpedientesParams } from '@/api/rh/expedientes';
import { queryKeys } from '@/api/queryKeys';
import { invalidateRhQueries } from './rhInvalidate';

export function useRhExpedientes(params: RhExpedientesParams, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.rhExpedientes(params as Record<string, unknown>),
    queryFn: () => rhExpedientesApi.list(params),
    enabled,
  });
}

export function useRhExpediente(colaboradorId: string | number | undefined) {
  return useQuery({
    queryKey: queryKeys.rhExpediente(colaboradorId ?? ''),
    queryFn: () => rhExpedientesApi.getById(colaboradorId as string | number),
    enabled: Boolean(colaboradorId),
  });
}

export function useRhExpedienteAprobarDocumento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ colaboradorId, documentoId, comentario }: { colaboradorId: string | number; documentoId: string | number; comentario?: string }) =>
      rhExpedientesApi.aprobarDocumento(colaboradorId, documentoId, comentario),
    onSuccess: () => invalidateRhQueries(queryClient),
  });
}

export function useRhExpedienteRechazarDocumento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ colaboradorId, documentoId, motivo }: { colaboradorId: string | number; documentoId: string | number; motivo: string }) =>
      rhExpedientesApi.rechazarDocumento(colaboradorId, documentoId, motivo),
    onSuccess: () => invalidateRhQueries(queryClient),
  });
}

export function useRhExpedienteAutorizarCambioDocumento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ colaboradorId, documentoId }: { colaboradorId: string | number; documentoId: string | number }) =>
      rhExpedientesApi.autorizarCambioDocumento(colaboradorId, documentoId),
    onSuccess: () => invalidateRhQueries(queryClient),
  });
}

export function useRhExpedienteAprobarIncorporacion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (colaboradorId: string | number) => rhExpedientesApi.aprobarIncorporacion(colaboradorId),
    onSuccess: () => invalidateRhQueries(queryClient),
  });
}

export function useRhExpedienteRechazarIncorporacion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ colaboradorId, motivo }: { colaboradorId: string | number; motivo: string }) =>
      rhExpedientesApi.rechazarIncorporacion(colaboradorId, motivo),
    onSuccess: () => invalidateRhQueries(queryClient),
  });
}
