import { useMutation, useQueryClient } from '@tanstack/react-query';

import { colaboradorApi } from '@/api/colaborador';
import { queryKeys } from '@/api/queryKeys';
import type { LocalUploadFile } from '@/api/upload';

/**
 * Sube la foto propia y refresca de inmediato todo lo que pinta el avatar
 * (perfil, dashboard/header y bootstrap): la URL nueva trae `?v=` distinto,
 * así que ninguna pantalla se queda con la foto vieja en caché.
 */
export function useSubirFotoPerfil() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, onProgress }: { file: LocalUploadFile; onProgress?: (percent: number) => void }) =>
      colaboradorApi.subirFoto(file, onProgress),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.perfil });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      void queryClient.invalidateQueries({ queryKey: queryKeys.bootstrap });
    },
  });
}
