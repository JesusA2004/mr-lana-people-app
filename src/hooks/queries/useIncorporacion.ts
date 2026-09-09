import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { documentosApi, type UploadDocumentoParams } from '@/api/documentos';
import { incorporacionApi } from '@/api/incorporacion';
import { queryKeys } from '@/api/queryKeys';

/** Fuente única para "Mi incorporación" y el tab "Expediente" — mismo endpoint real, ver src/api/incorporacion.ts. */
export function useIncorporacion() {
  return useQuery({
    queryKey: queryKeys.incorporacion,
    queryFn: incorporacionApi.get,
  });
}

/** Subir/reemplazar un documento invalida incorporación y dashboard (ambos derivan del mismo checklist). */
export function useUploadDocumento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: UploadDocumentoParams) => documentosApi.upload(params),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.incorporacion });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useSolicitarCambioDocumento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentTypeId: number) => documentosApi.solicitarCambio(documentTypeId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.incorporacion });
    },
  });
}
