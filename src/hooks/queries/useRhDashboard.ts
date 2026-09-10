import { useQuery } from '@tanstack/react-query';

import { rhDashboardApi } from '@/api/rh/dashboard';
import { queryKeys } from '@/api/queryKeys';

export function useRhDashboard(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.rhDashboard,
    queryFn: rhDashboardApi.get,
    enabled,
    staleTime: 15_000,
  });
}
