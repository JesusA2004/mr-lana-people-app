import { useQuery } from '@tanstack/react-query';
import { Platform } from 'react-native';

import { appConfigApi } from '@/api/appConfig';
import { appReleasesApi } from '@/api/appReleases';
import { queryKeys } from '@/api/queryKeys';
import type { AppReleasePlatform } from '@/types/appRelease';

/** Plataforma actual tal como la espera la API (`ios` | `android`) — web no publica releases todavía. */
export const CURRENT_RELEASE_PLATFORM: AppReleasePlatform = Platform.OS === 'ios' ? 'ios' : 'android';

/** `GET /api/v1/app/config` — público, se consulta al iniciar la app (antes de login incluso). */
export function useAppConfig() {
  return useQuery({
    queryKey: queryKeys.appConfig,
    queryFn: appConfigApi.get,
    staleTime: 60_000,
    retry: 1,
  });
}

/**
 * `GET /api/v1/app/releases/latest` — se consulta después de login o en
 * background controlado (AGENTS.md sección 39), nunca bloqueando el splash.
 * Si el backend todavía no publicó ninguna versión (`null`) o la plataforma
 * es distinta de `android`/`ios`, simplemente no hay banner/bloqueo — nunca
 * un botón de actualizar falso (sección 42: "si no existe release iOS, no
 * mostrar botón falso").
 */
export function useLatestAppRelease(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.appReleaseLatest(CURRENT_RELEASE_PLATFORM),
    queryFn: () => appReleasesApi.latest(CURRENT_RELEASE_PLATFORM),
    enabled,
    staleTime: 10 * 60_000,
    retry: 1,
  });
}
