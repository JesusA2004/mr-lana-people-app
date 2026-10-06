import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { rhCambiosFotoApi } from '@/api/rh/cambiosFoto';
import { invalidateRhQueries } from './rhInvalidate';

export const rhCambiosFotoKey = ['rh', 'cambios-foto'] as const;

export function useRhCambiosFoto(enabled = true) {
  return useQuery({ queryKey: rhCambiosFotoKey, queryFn: rhCambiosFotoApi.list, enabled });
}

/** Aprobar / rechazar: refresca la bandeja, el dashboard RH y las notificaciones. */
export function useRevisarCambioFoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, accion, motivo }: { id: number; accion: 'aprobar' | 'rechazar'; motivo?: string }) =>
      accion === 'aprobar' ? rhCambiosFotoApi.aprobar(id) : rhCambiosFotoApi.rechazar(id, motivo ?? ''),
    onSuccess: () => invalidateRhQueries(queryClient),
  });
}
