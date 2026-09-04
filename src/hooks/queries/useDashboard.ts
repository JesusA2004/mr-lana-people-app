import { useQuery } from '@tanstack/react-query';

import { colaboradorApi } from '@/api/colaborador';
import { queryKeys } from '@/api/queryKeys';

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: colaboradorApi.getDashboard,
  });
}
