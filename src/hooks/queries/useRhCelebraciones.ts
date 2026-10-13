import { useMutation, useQueryClient } from '@tanstack/react-query';

import { rhCelebracionesApi } from '@/api/rh/celebraciones';
import type { TipoCelebracion } from '@/types/celebracion';

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
