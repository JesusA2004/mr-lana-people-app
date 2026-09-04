import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { documentosApi, type UploadDocumentoParams } from '@/api/documentos';
import { expedienteApi } from '@/api/expediente';
import { queryKeys } from '@/api/queryKeys';

export function useExpediente() {
  return useQuery({
    queryKey: queryKeys.expediente,
    queryFn: expedienteApi.get,
  });
}

/** Subir/reemplazar un documento invalida expediente, incorporación y dashboard (todos derivan de la misma completitud). */
export function useUploadDocumento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: UploadDocumentoParams) => documentosApi.upload(params),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.expediente });
      void queryClient.invalidateQueries({ queryKey: queryKeys.incorporacion });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}
