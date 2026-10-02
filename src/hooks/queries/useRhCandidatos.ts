import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { rhCandidatosApi, type RhCandidatosParams } from '@/api/rh/candidatos';
import type { LocalUploadFile } from '@/api/upload';
import type {
  DescartarPayload,
  EvaluarFiltroPayload,
  RegistrarEntrevistaPayload,
  RegistrarReferenciaPayload,
  RegistrarSocioeconomicoPayload,
} from '@/types/rhCandidato';
import { nextPageOf } from '@/utils/normalize';
import { invalidateCiclo } from './cicloInvalidate';
import { retryUnlessClientError, SENSITIVE_MUTATION } from './queryOptions';

export function useRhCandidatos(params: Omit<RhCandidatosParams, 'page'>, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.rhCandidatosList(params as Record<string, unknown>),
    queryFn: ({ pageParam }) => rhCandidatosApi.list({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: nextPageOf,
    enabled,
    retry: retryUnlessClientError,
  });
}

export function useRhCandidato(id: string | number | undefined) {
  return useQuery({
    queryKey: queryKeys.rhCandidato(id ?? ''),
    queryFn: () => rhCandidatosApi.get(id as string | number),
    enabled: id !== undefined && id !== '',
    retry: retryUnlessClientError,
  });
}

export type RhCandidatoOperacion =
  | { tipo: 'evaluar_perfil'; payload: EvaluarFiltroPayload }
  | { tipo: 'registrar_entrevista'; payload: RegistrarEntrevistaPayload }
  | { tipo: 'enviar_psicometricas'; link: string }
  | { tipo: 'registrar_resultados_psicometricas'; resumen: string; archivos: LocalUploadFile[] }
  | { tipo: 'revisar_psicometricas'; payload: EvaluarFiltroPayload }
  | { tipo: 'registrar_socioeconomico'; payload: RegistrarSocioeconomicoPayload; evidencias: LocalUploadFile[] }
  | { tipo: 'registrar_referencia'; payload: RegistrarReferenciaPayload }
  | { tipo: 'concluir_referencias'; payload: EvaluarFiltroPayload }
  | { tipo: 'preautorizar'; comentario?: string | null }
  | { tipo: 'autorizar_rh'; comentario?: string | null }
  | { tipo: 'rechazar_rh'; motivo: string }
  | { tipo: 'devolver_rh'; motivo: string }
  | { tipo: 'descartar'; payload: DescartarPayload };

export function useRhOperarCandidato(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    ...SENSITIVE_MUTATION,
    mutationFn: (op: RhCandidatoOperacion) => {
      switch (op.tipo) {
        case 'evaluar_perfil':
          return rhCandidatosApi.evaluarPerfil(id, op.payload);
        case 'registrar_entrevista':
          return rhCandidatosApi.registrarEntrevista(id, op.payload);
        case 'enviar_psicometricas':
          return rhCandidatosApi.enviarPsicometricas(id, op.link);
        case 'registrar_resultados_psicometricas':
          return rhCandidatosApi.resultadosPsicometricas(id, op.resumen, op.archivos);
        case 'revisar_psicometricas':
          return rhCandidatosApi.revisarPsicometricas(id, op.payload);
        case 'registrar_socioeconomico':
          return rhCandidatosApi.registrarSocioeconomico(id, op.payload, op.evidencias);
        case 'registrar_referencia':
          return rhCandidatosApi.registrarReferencia(id, op.payload);
        case 'concluir_referencias':
          return rhCandidatosApi.concluirReferencias(id, op.payload);
        case 'preautorizar':
          return rhCandidatosApi.preautorizar(id, op.comentario);
        case 'autorizar_rh':
          return rhCandidatosApi.autorizarRh(id, op.comentario);
        case 'rechazar_rh':
          return rhCandidatosApi.rechazarRh(id, op.motivo);
        case 'devolver_rh':
          return rhCandidatosApi.devolverRh(id, op.motivo);
        case 'descartar':
          return rhCandidatosApi.descartar(id, op.payload);
      }
    },
    onSuccess: (ficha) => {
      queryClient.setQueryData(queryKeys.rhCandidato(id), ficha);
      invalidateCiclo(queryClient, { type: 'rh_candidato', candidatoId: id });
    },
  });
}
