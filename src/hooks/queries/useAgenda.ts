import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { agendaApi } from '@/api/agenda';
import { queryKeys } from '@/api/queryKeys';
import type { LocalUploadFile } from '@/api/upload';
import type { AgendarPayload, ReprogramarPayload, ResultadoEntrevistaPayload, ResultadoSocioeconomicoPayload } from '@/types/agenda';
import { retryUnlessClientError, SENSITIVE_MUTATION } from './queryOptions';

export function useAgenda(enabled = true) {
  return useQuery({ queryKey: queryKeys.agenda, queryFn: agendaApi.listar, enabled, retry: retryUnlessClientError });
}

export function useAgendaOpciones(enabled = true) {
  return useQuery({ queryKey: queryKeys.agendaOpciones, queryFn: agendaApi.opciones, enabled, retry: retryUnlessClientError });
}

export function useAgendaEvento(id: string | number | undefined) {
  return useQuery({
    queryKey: queryKeys.agendaEvento(id ?? ''),
    queryFn: () => agendaApi.get(id as string | number),
    enabled: id !== undefined && id !== '',
    retry: retryUnlessClientError,
  });
}

export type AgendaOperacion =
  | { tipo: 'reprogramar'; payload: ReprogramarPayload }
  | { tipo: 'cancelar'; motivo: string }
  | { tipo: 'no_asistio'; comentario?: string }
  | { tipo: 'entrevista'; payload: ResultadoEntrevistaPayload }
  | { tipo: 'socioeconomico'; payload: ResultadoSocioeconomicoPayload; evidencias: LocalUploadFile[] };

/** Resultado o movimiento de una cita: el candidato cambia en el servidor, así que también se refrescan sus cachés. */
export function useOperarAgenda(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    ...SENSITIVE_MUTATION,
    mutationFn: async (op: AgendaOperacion): Promise<{ siguienteId: number; empalmes: string[] }> => {
      switch (op.tipo) {
        case 'reprogramar': {
          const guardado = await agendaApi.reprogramar(id, op.payload);
          return { siguienteId: guardado.evento.id, empalmes: guardado.empalmes };
        }
        case 'cancelar':
          await agendaApi.cancelar(id, op.motivo);
          break;
        case 'no_asistio':
          await agendaApi.noAsistio(id, op.comentario);
          break;
        case 'entrevista':
          await agendaApi.resultadoEntrevista(id, op.payload);
          break;
        case 'socioeconomico':
          await agendaApi.resultadoSocioeconomico(id, op.payload, op.evidencias);
          break;
      }
      return { siguienteId: id, empalmes: [] };
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.agenda });
      void queryClient.invalidateQueries({ queryKey: queryKeys.rhCandidatos });
    },
  });
}

export function useAgendar() {
  const queryClient = useQueryClient();
  return useMutation({
    ...SENSITIVE_MUTATION,
    mutationFn: ({ payload, cv }: { payload: AgendarPayload; cv?: LocalUploadFile | null }) => agendaApi.agendar(payload, cv),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.agenda });
      void queryClient.invalidateQueries({ queryKey: queryKeys.rhCandidatos });
    },
  });
}
