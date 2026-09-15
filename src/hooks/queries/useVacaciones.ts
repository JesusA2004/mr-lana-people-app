import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { vacacionesApi } from '@/api/vacaciones';
import { queryKeys } from '@/api/queryKeys';
import { useSolicitudesInfinite } from '@/hooks/queries/useSolicitudes';
import type { Solicitud } from '@/types/request';

/**
 * Saldo de vacaciones. Único consumo vivo del módulo legacy
 * `/api/v1/vacaciones/*`, y SOLO de lectura: `VacacionesService::saldo()`
 * ya cuenta los días de las solicitudes unificadas `tipo=vacaciones`, así
 * que la cifra es correcta aunque la app cree todo por el módulo nuevo.
 * Ver la nota de deprecación en `src/api/vacaciones.ts`.
 */
export function useVacacionesSaldo() {
  return useQuery({
    queryKey: queryKeys.vacacionesSaldo,
    queryFn: vacacionesApi.getSaldo,
  });
}

/**
 * Historial de vacaciones del colaborador — leído de SOLICITUDES
 * UNIFICADAS, no de la tabla legacy. La pantalla "Mis vacaciones" sigue
 * existiendo como experiencia dedicada (saldo + próximas + historial), pero
 * por debajo es exactamente la misma lista que "Mis solicitudes", filtrada
 * por `tipo === 'vacaciones'` (secciones 3/49 del encargo).
 */
export function useVacacionesUnificadas() {
  const query = useSolicitudesInfinite();

  const solicitudes = useMemo(
    () => (query.data?.pages.flatMap((page) => page.data) ?? []).filter((item: Solicitud) => item.tipo === 'vacaciones'),
    [query.data],
  );

  /** Aún en manos de RH: lo que el colaborador entiende como "próximas". */
  const proximas = useMemo(
    () => solicitudes.filter((item) => ['creada', 'enviada', 'en_revision', 'requiere_correccion'].includes(item.estado ?? '')),
    [solicitudes],
  );

  const historial = useMemo(() => solicitudes.filter((item) => !proximas.includes(item)), [solicitudes, proximas]);

  return { ...query, solicitudes, proximas, historial };
}
