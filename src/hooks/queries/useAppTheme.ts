import { useQuery } from '@tanstack/react-query';

import { appThemeApi } from '@/api/theme';
import { queryKeys } from '@/api/queryKeys';

/**
 * `GET /api/v1/app/theme` — público, se consulta al iniciar la app (antes
 * de login incluso). Un solo reintento; si falla, la app sigue con la
 * paleta estática de `constants/colors.ts` (nunca se rompe por falta de
 * tema, AGENTS.md sección 26).
 */
export function useAppTheme() {
  return useQuery({
    queryKey: queryKeys.appTheme,
    queryFn: appThemeApi.get,
    staleTime: 10 * 60_000,
    retry: 1,
  });
}
