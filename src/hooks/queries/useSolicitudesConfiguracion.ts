import { useQuery } from '@tanstack/react-query';

import { solicitudesApi } from '@/api/solicitudes';
import { queryKeys } from '@/api/queryKeys';
import { getCurrentAppVersion, getCurrentBuildNumber } from '@/utils/appVersion';

/**
 * `GET /api/v1/solicitudes/configuracion` — catálogo de tipos y sus campos.
 *
 * Cambia poquísimo (solo cuando el backend agrega un caso a
 * `TipoSolicitudInterna`), así que se cachea 30 minutos en vez de pedirlo en
 * cada entrada al wizard. Pero la versión/build de la app forma parte del
 * `queryKey`: tras actualizar la app el catálogo se vuelve a pedir de cero,
 * porque una build nueva suele traer soporte para campos nuevos y no debe
 * arrancar con la copia vieja en caché (sección 46 del encargo).
 */
export function useSolicitudesConfiguracion() {
  return useQuery({
    queryKey: [...queryKeys.solicitudesConfiguracion, getCurrentAppVersion(), getCurrentBuildNumber()],
    queryFn: solicitudesApi.getConfiguracion,
    staleTime: 30 * 60_000,
  });
}
