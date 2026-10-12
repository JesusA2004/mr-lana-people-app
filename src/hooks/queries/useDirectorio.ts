import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { directorioApi } from '@/api/directorio';
import { queryKeys } from '@/api/queryKeys';
import type { FiltrosDirectorio } from '@/types/directorio';
import { nextPageOf } from '@/utils/normalize';
import { retryUnlessClientError } from './queryOptions';

/** Directorio de contacto corporativo (paginado, con búsqueda y filtros). */
export function useDirectorio(filtros: FiltrosDirectorio) {
  return useInfiniteQuery({
    queryKey: queryKeys.directorio({ ...filtros }),
    queryFn: ({ pageParam }) => directorioApi.list(filtros, pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPageOf,
    retry: retryUnlessClientError,
  });
}

export function useOpcionesDirectorio() {
  return useQuery({
    queryKey: queryKeys.directorioOpciones,
    queryFn: directorioApi.opciones,
    staleTime: 10 * 60 * 1000,
    retry: retryUnlessClientError,
  });
}
