import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { rhSolicitudesApi, type RhSolicitudesParams } from '@/api/rh/solicitudes';
import { queryKeys } from '@/api/queryKeys';
import { invalidateRhQueries } from './rhInvalidate';

export function useRhSolicitudes(params: RhSolicitudesParams, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.rhSolicitudes(params as Record<string, unknown>),
    queryFn: () => rhSolicitudesApi.list(params),
    enabled,
  });
}

export function useRhSolicitud(id: string | number | undefined) {
  return useQuery({
    queryKey: queryKeys.rhSolicitud(id ?? ''),
    queryFn: () => rhSolicitudesApi.getById(id as string | number),
    enabled: Boolean(id),
  });
}

export function useRhSolicitudAprobar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comentario }: { id: string | number; comentario?: string }) => rhSolicitudesApi.aprobar(id, comentario),
    onSuccess: () => invalidateRhQueries(queryClient),
  });
}

export function useRhSolicitudRechazar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string | number; motivo: string }) => rhSolicitudesApi.rechazar(id, motivo),
    onSuccess: () => invalidateRhQueries(queryClient),
  });
}

export function useRhSolicitudCorreccion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string | number; motivo: string }) => rhSolicitudesApi.solicitarCorreccion(id, motivo),
    onSuccess: () => invalidateRhQueries(queryClient),
  });
}
