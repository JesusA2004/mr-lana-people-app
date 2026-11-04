import { useMutation, useQueryClient } from '@tanstack/react-query';

import { colaboradorApi } from '@/api/colaborador';
import { queryKeys } from '@/api/queryKeys';
import type { LocalUploadFile } from '@/api/upload';
import { conReintentos } from '@/utils/reintentos';

export interface SubirFotoVariables {
  file: LocalUploadFile;
  onProgress?: (percent: number) => void;
  /** Aviso de cada reintento automático (1, 2) para decir «Reintentando…» en pantalla. */
  onReintento?: (intento: number) => void;
}

/**
 * Sube la foto propia y refresca de inmediato todo lo que pinta el avatar
 * (perfil, dashboard/header, bootstrap y el registro): la URL nueva trae
 * `?v=` distinto, así que ninguna pantalla se queda con la foto vieja en
 * caché. Ante errores de red o 5xx reintenta sola 2 veces con espera
 * creciente (1 s, 2 s); un 4xx (p. ej. 422 `errors.foto`) se devuelve de
 * inmediato.
 */
export function useSubirFotoPerfil() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, onProgress, onReintento }: SubirFotoVariables) =>
      conReintentos(
        () => {
          onProgress?.(0);
          return colaboradorApi.subirFoto(file, onProgress);
        },
        { reintentos: 2, alReintentar: (intento) => onReintento?.(intento) },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.perfil });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      void queryClient.invalidateQueries({ queryKey: queryKeys.bootstrap });
      void queryClient.invalidateQueries({ queryKey: queryKeys.registro });
    },
  });
}
