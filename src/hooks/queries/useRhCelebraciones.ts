import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { rhCelebracionesApi, type RhAniversariosParams } from '@/api/rh/celebraciones';
import { queryKeys } from '@/api/queryKeys';
import type { TipoCelebracion } from '@/types/celebracion';

/**
 * `GET /rh/celebraciones/aniversarios` no pagina (arreglo plano por rango
 * de fechas, igual que la web) — a diferencia de `useRhCumpleanosInfinite`,
 * esto es una consulta simple.
 */
export function useRhAniversarios(params: RhAniversariosParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.rhAniversarios(params as Record<string, unknown>),
    queryFn: () => rhCelebracionesApi.aniversarios(params),
    enabled,
    staleTime: 60_000,
  });
}

function useInvalidateAniversarios() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['rh', 'celebraciones'] });
  };
}

export function useRhCelebracionEnviar() {
  const invalidate = useInvalidateAniversarios();
  return useMutation({
    mutationFn: ({ colaboradorId, tipo }: { colaboradorId: number | string; tipo: TipoCelebracion }) =>
      rhCelebracionesApi.enviar(colaboradorId, tipo),
    onSuccess: invalidate,
    retry: false,
  });
}

export function useRhCelebracionAvisarATodos() {
  const invalidate = useInvalidateAniversarios();
  return useMutation({
    mutationFn: ({ colaboradorId, tipo }: { colaboradorId: number | string; tipo: TipoCelebracion }) =>
      rhCelebracionesApi.avisarATodos(colaboradorId, tipo),
    onSuccess: invalidate,
    retry: false,
  });
}
