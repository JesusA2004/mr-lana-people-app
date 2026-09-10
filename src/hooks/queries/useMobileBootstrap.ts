import { useQuery } from '@tanstack/react-query';

import { mobileBootstrapApi } from '@/api/mobileBootstrap';
import { queryKeys } from '@/api/queryKeys';

/**
 * Fuente principal de capabilities/features/contadores (AGENTS.md sección
 * 2). `staleTime` corto: los contadores (badges RH, notificaciones) deben
 * sentirse al día después de cualquier acción, no solo tras un refetch
 * manual — la invalidación puntual de cada mutación (ver hooks de RH) sigue
 * siendo la vía principal, esto es solo la red de seguridad.
 */
export function useMobileBootstrap(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.bootstrap,
    queryFn: mobileBootstrapApi.get,
    enabled,
    staleTime: 15_000,
  });
}
