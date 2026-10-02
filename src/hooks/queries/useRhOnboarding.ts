import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { rhOnboardingApi } from '@/api/rh/onboarding';
import { queryKeys } from '@/api/queryKeys';
import { retryUnlessClientError } from './queryOptions';

export function useRhOnboarding(colaboradorId: string | number | undefined) {
  return useQuery({
    queryKey: queryKeys.rhOnboarding(colaboradorId ?? ''),
    queryFn: () => rhOnboardingApi.ficha(colaboradorId as string | number),
    enabled: colaboradorId !== undefined && colaboradorId !== '',
    retry: retryUnlessClientError,
  });
}

/** Tras cualquier acción de onboarding: ficha, pendientes, tablero y avisos se refrescan solos. */
function useInvalidarOnboarding(colaboradorId: string | number) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.rhOnboarding(colaboradorId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.rhColaborador(colaboradorId) });
    void queryClient.invalidateQueries({ queryKey: ['rh', 'pendientes'] });
    void queryClient.invalidateQueries({ queryKey: ['rh', 'dashboard'] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.notificaciones });
  };
}

export function useRhRetroalimentar(colaboradorId: string | number) {
  const invalidar = useInvalidarOnboarding(colaboradorId);
  return useMutation({
    mutationFn: ({ avanceId, texto }: { avanceId: number; texto: string }) => rhOnboardingApi.retroalimentar(avanceId, texto),
    onSuccess: invalidar,
  });
}

export function useRhEntregarActivo(colaboradorId: string | number) {
  const invalidar = useInvalidarOnboarding(colaboradorId);
  return useMutation({
    mutationFn: ({ procesoId, payload }: { procesoId: number; payload: { tipo_activo_id: number; identificador?: string | null; observaciones?: string | null } }) =>
      rhOnboardingApi.entregarActivo(procesoId, payload),
    onSuccess: invalidar,
  });
}

export function useRhCompletarOnboarding(colaboradorId: string | number) {
  const invalidar = useInvalidarOnboarding(colaboradorId);
  return useMutation({
    mutationFn: (procesoId: number) => rhOnboardingApi.completar(procesoId),
    onSuccess: invalidar,
  });
}
