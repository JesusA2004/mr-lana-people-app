import { useQuery } from '@tanstack/react-query';

import { guiaApi } from '@/api/guia';
import { queryKeys } from '@/api/queryKeys';
import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';
import type { EstadoExpedienteIncompleto } from '@/types/guia';
import { estadoExpedienteDe } from '@/utils/guia';
import { retryUnlessClientError } from './queryOptions';

/**
 * «Tu siguiente paso» (`GET colaborador/guia`). Un backend anterior responde
 * 404: no se reintenta y la app sigue con su Inicio de siempre.
 */
export function useGuia(enabled = true) {
  return useQuery({ queryKey: queryKeys.guia, queryFn: guiaApi.get, enabled, retry: retryUnlessClientError, staleTime: 15_000 });
}

/**
 * Modo completar expediente de la cuenta. Fuente: el bootstrap (siempre
 * cargado); si la guía ya respondió, su estado (más fresco tras subir un
 * documento) manda.
 */
export function useBloqueoExpediente(): EstadoExpedienteIncompleto & { cargando: boolean } {
  const bootstrap = useMobileBootstrap(true);
  const guia = useGuia(true);
  const estado = guia.data?.bloqueo ?? estadoExpedienteDe(bootstrap.data);
  return { ...estado, cargando: bootstrap.isLoading };
}
