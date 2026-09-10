import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { rhOrganizacionApi } from '@/api/rh/organizacion';

/** Organigrama de puestos, solo lectura — `staleTime` largo: cambia poco durante el día a día. */
export function useRhOrganizacion(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.rhOrganizacion,
    queryFn: rhOrganizacionApi.jerarquia,
    enabled,
    staleTime: 5 * 60_000,
  });
}
