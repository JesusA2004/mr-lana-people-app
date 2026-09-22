import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

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

/**
 * Subir/reemplazar un documento invalida incorporación, dashboard y el
 * estado documental del ciclo laboral (`/colaborador/expediente`,
 * `/colaborador/alta`, `/colaborador/documentos-pendientes`): el backend
 * recalcula el estado del alta con cada cambio de documento.
 */
function invalidateExpediente(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.incorporacion });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
  void queryClient.invalidateQueries({ queryKey: queryKeys.miExpediente });
  void queryClient.invalidateQueries({ queryKey: queryKeys.miAlta });
  void queryClient.invalidateQueries({ queryKey: queryKeys.documentosPendientes });
  void queryClient.invalidateQueries({ queryKey: queryKeys.tareas });
}

export function useUploadDocumento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: UploadDocumentoParams) => documentosApi.upload(params),
    onSuccess: () => invalidateExpediente(queryClient),
  });
}

export function useSolicitarCambioDocumento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentTypeId: number) => documentosApi.solicitarCambio(documentTypeId),
    onSuccess: () => invalidateExpediente(queryClient),
  });
}
