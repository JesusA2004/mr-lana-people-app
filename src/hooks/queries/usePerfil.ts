import { useQuery } from '@tanstack/react-query';

import { colaboradorApi } from '@/api/colaborador';
import { queryKeys } from '@/api/queryKeys';

export function usePerfil() {
  return useQuery({
    queryKey: queryKeys.perfil,
    queryFn: colaboradorApi.getPerfil,
  });
}
