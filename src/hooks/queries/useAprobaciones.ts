import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { aprobacionesApi } from '@/api/aprobaciones';
import { queryKeys, rhQueryKeyPrefix } from '@/api/queryKeys';
import { rhSolicitudesApi } from '@/api/rh/solicitudes';
import { equipoApi } from '@/api/trabajo';
import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';
import { usePermisos } from '@/hooks/usePermisos';
import { useEquipoPendientes } from '@/hooks/queries/useTrabajo';
import { useRefrescarAlVolver } from '@/hooks/useRefrescarAlVolver';
import type { AprobacionItem, BandejaAprobaciones } from '@/types/aprobaciones';
import { armarBandeja } from '@/utils/flujoAprobacion';
import { isNotFoundError } from '@/utils/errors';
import { isSelfServiceModuleEnabled } from '@/utils/modules';
import { retryUnlessClientError, SENSITIVE_MUTATION } from './queryOptions';

/** Permisos con los que el backend deja dar la autorización final (`conteoPendientes`). */
export const PERMISOS_AUTORIZAR = ['rh.solicitudes.aprobar', 'solicitudes.aprobar', 'prestamos.autorizar'];

/** ¿La cuenta puede tener autorizaciones finales de RH? (capabilities + permisos del backend, nunca el rol). */
export function useEsAutorizadorRh(): boolean {
  const permisos = usePermisos();
  return Boolean(permisos.capacidades?.rh) && permisos.puedeAlguno(PERMISOS_AUTORIZAR);
}

/**
 * Badge único «mis aprobaciones pendientes» (`GET /equipo/aprobaciones/conteo`):
 * solo cuenta lo que la cuenta puede aprobar AHORA. Se refresca al volver a
 * la app, tras cualquier mutación (`QUERIES_AGREGADAS`) y con cada push de
 * solicitud (`pushCicloKeys`).
 */
export function useAprobacionesConteo(enabled = true) {
  const query = useQuery({
    queryKey: queryKeys.aprobacionesConteo,
    queryFn: aprobacionesApi.conteo,
    enabled,
    retry: retryUnlessClientError,
    staleTime: 20_000,
  });
  useRefrescarAlVolver(() => void query.refetch(), enabled);
  return query;
}

/**
 * Bandeja de aprobaciones: vistos buenos del equipo (`/equipo/pendientes`:
 * `solicitudes` + `en_espera`) y, si la cuenta autoriza como RH, las
 * solicitudes abiertas de `/rh/solicitudes` con su flujo. El backend decide
 * quién puede actuar; aquí solo se separa «Me toca» de «En espera».
 */
export function useBandejaAprobaciones() {
  const bootstrap = useMobileBootstrap(true);
  const equipoHabilitado = isSelfServiceModuleEnabled(bootstrap.data?.features, 'equipo');
  const esRh = useEsAutorizadorRh();
  const equipo = useEquipoPendientes(equipoHabilitado);
  const rh = useQuery({
    queryKey: queryKeys.aprobacionesBandeja,
    queryFn: aprobacionesApi.abiertasRh,
    enabled: esRh,
    retry: retryUnlessClientError,
    staleTime: 20_000,
  });

  // Cuenta sin colaborador vinculado (404) = sin equipo: no es un error que mostrar.
  const errorEquipo = equipo.error && !isNotFoundError(equipo.error) ? equipo.error : null;
  const errorRh = esRh ? rh.error : null;
  const bandeja: BandejaAprobaciones = useMemo(
    () => armarBandeja({ equipo: [...(equipo.data?.aprobar ?? []), ...(equipo.data?.en_espera ?? [])], rh: rh.data ?? [] }),
    [equipo.data, rh.data],
  );

  // Solo es error si TODAS las fuentes disponibles fallaron (una sola caída no vacía la bandeja).
  const erroresActivos = [equipoHabilitado ? errorEquipo : undefined, esRh ? errorRh : undefined].filter((e) => e !== undefined);
  const error = erroresActivos.length > 0 && erroresActivos.every((e) => e !== null) ? erroresActivos[0] : null;

  const refetch = () => {
    if (equipoHabilitado) void equipo.refetch();
    if (esRh) void rh.refetch();
  };
  useRefrescarAlVolver(refetch);

  return {
    bandeja,
    isLoading: (equipoHabilitado && equipo.isLoading) || (esRh && rh.isLoading),
    isRefetching: equipo.isRefetching || rh.isRefetching,
    error,
    refetch,
  };
}

/** Busca una solicitud de la bandeja en caché (detalle sin pedir de nuevo). */
export function useAprobacionItem(id: number | null) {
  const { bandeja, ...resto } = useBandejaAprobaciones();
  const item = useMemo(
    () => (id === null ? null : ([...bandeja.meToca, ...bandeja.enEspera].find((i) => i.id === id) ?? null)),
    [bandeja, id],
  );
  return { item, ...resto };
}

export interface DecisionAprobacion {
  item: AprobacionItem;
  aprobado: boolean;
  /** Obligatorio al rechazar. */
  comentario?: string;
}

/**
 * Ejecuta la decisión con el endpoint que corresponde a la acción que el
 * backend dio a la cuenta (`accion_usuario_actual`): visto bueno del jefe o
 * autorización final de RH. El backend vuelve a validar (422 con texto humano).
 */
export function useDecidirAprobacion() {
  const queryClient = useQueryClient();
  return useMutation({
    ...SENSITIVE_MUTATION,
    mutationFn: async ({ item, aprobado, comentario }: DecisionAprobacion): Promise<{ message?: string }> => {
      const accion = item.flujo.accion_usuario_actual;
      if (accion === 'visto_bueno') {
        await equipoApi.vistoBueno(item.id, aprobado, comentario);
        return {};
      }
      if (accion === 'aprobar') {
        if (aprobado) return rhSolicitudesApi.aprobar(item.id, comentario);
        await rhSolicitudesApi.rechazar(item.id, comentario ?? '');
        return {};
      }
      throw new Error('Esta solicitud se decide desde su detalle.');
    },
    onSuccess: (_r, { item }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.aprobaciones });
      void queryClient.invalidateQueries({ queryKey: queryKeys.equipoPendientes });
      void queryClient.invalidateQueries({ queryKey: queryKeys.solicitud(item.id) });
      void queryClient.invalidateQueries({ queryKey: rhQueryKeyPrefix });
    },
  });
}
