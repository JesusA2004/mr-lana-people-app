import type { QueryClient } from '@tanstack/react-query';

import { queryKeys, rhQueryKeyPrefix } from '@/api/queryKeys';

/**
 * Invalidación compartida tras cualquier acción RH (aprobar/rechazar/
 * corrección/autorizar cambio) — AGENTS.md sección 9/64: "invalidar
 * dashboard RH, pendientes RH, detalle, lista" + bootstrap (badges de
 * Gestión RH) y notificaciones (la acción casi siempre genera una para el
 * colaborador dueño del recurso). Nunca `queryClient.clear()` fuera de
 * logout (sección 64).
 */
export function invalidateRhQueries(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: rhQueryKeyPrefix });
  void queryClient.invalidateQueries({ queryKey: queryKeys.bootstrap });
  void queryClient.invalidateQueries({ queryKey: queryKeys.notificaciones });
}
