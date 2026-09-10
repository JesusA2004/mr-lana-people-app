import { useQuery } from '@tanstack/react-query';

import { solicitudesApi } from '@/api/solicitudes';
import { queryKeys } from '@/api/queryKeys';

/** `GET /api/v1/solicitudes/configuracion` — catálogo real de tipos + reglas de formulario (AGENTS.md sección 45). */
export function useSolicitudesConfiguracion() {
  return useQuery({
    queryKey: queryKeys.solicitudesConfiguracion,
    queryFn: solicitudesApi.getConfiguracion,
    staleTime: 10 * 60_000,
  });
}
