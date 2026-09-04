import { useQuery } from '@tanstack/react-query';

import { incorporacionApi } from '@/api/incorporacion';
import { queryKeys } from '@/api/queryKeys';

export function useIncorporacion() {
  return useQuery({
    queryKey: queryKeys.incorporacion,
    queryFn: incorporacionApi.get,
  });
}
