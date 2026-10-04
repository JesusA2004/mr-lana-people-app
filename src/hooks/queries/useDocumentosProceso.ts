import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { rhDocumentosProcesoApi, type GenerarDocumentoPayload } from '@/api/rh/documentosProceso';
import type { SeccionDocumentosProceso, TipoRegistroDocumental } from '@/types/documentosProceso';

import { retryUnlessClientError, SENSITIVE_MUTATION } from './queryOptions';

export type OrigenDocumentos = { tipo: 'colaborador'; id: number } | { tipo: TipoRegistroDocumental; id: number };

const clave = (origen: OrigenDocumentos) => ['rh', 'documentos-proceso', origen.tipo, String(origen.id)] as const;

/** Secciones "Documentos del …" de un proceso (el backend decide todo). */
export function useDocumentosProceso(origen: OrigenDocumentos | null) {
  return useQuery({
    queryKey: origen ? clave(origen) : ['rh', 'documentos-proceso', 'ninguno'],
    enabled: origen !== null,
    retry: retryUnlessClientError,
    queryFn: async (): Promise<SeccionDocumentosProceso[]> => {
      if (!origen) return [];
      return origen.tipo === 'colaborador'
        ? rhDocumentosProcesoApi.delColaborador(origen.id)
        : [await rhDocumentosProcesoApi.seccion(origen.tipo, origen.id)].filter((s): s is SeccionDocumentosProceso => s !== null);
    },
  });
}

export type AccionDocumentosProceso =
  | { tipo: 'generar'; registro: TipoRegistroDocumental; id: number; payload: GenerarDocumentoPayload }
  | { tipo: 'paquete'; registro: TipoRegistroDocumental; id: number; payload: GenerarDocumentoPayload }
  | { tipo: 'negativa'; cierreId: number; payload: Parameters<typeof rhDocumentosProcesoApi.negativa>[1] }
  | { tipo: 'testigos'; cierreId: number; testigos: { nombre: string; cargo: string }[] };

/** Generar / paquete / negativa / testigos (mutaciones sensibles: nunca offline). */
export function useAccionDocumentosProceso(origen: OrigenDocumentos | null) {
  const queryClient = useQueryClient();

  return useMutation({
    ...SENSITIVE_MUTATION,
    mutationFn: (accion: AccionDocumentosProceso) => {
      switch (accion.tipo) {
        case 'generar':
          return rhDocumentosProcesoApi.generar(accion.registro, accion.id, accion.payload);
        case 'paquete':
          return rhDocumentosProcesoApi.paquete(accion.registro, accion.id, accion.payload);
        case 'negativa':
          return rhDocumentosProcesoApi.negativa(accion.cierreId, accion.payload);
        case 'testigos':
          return rhDocumentosProcesoApi.testigos(accion.cierreId, accion.testigos);
      }
    },
    onSuccess: () => {
      if (origen) void queryClient.invalidateQueries({ queryKey: clave(origen) });
      void queryClient.invalidateQueries({ queryKey: ['rh', 'documentos-laborales'] });
      void queryClient.invalidateQueries({ queryKey: ['rh', 'cierres'] });
    },
  });
}
