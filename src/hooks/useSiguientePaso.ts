import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { guiaApi } from '@/api/guia';
import { queryKeys } from '@/api/queryKeys';
import { toast } from '@/store/toastStore';
import { logError } from '@/utils/errors';
import { mensajeSiguiente, rutaDePaso } from '@/utils/guia';

/**
 * Al terminar una acción (subir un documento, enviar datos, tomar la foto…)
 * pide la guía fresca y ofrece el siguiente paso: «Listo. Siguiente: Acta
 * de nacimiento» con botón «Ir». Si la guía no existe (backend anterior) no
 * dice nada: la acción ya mostró su propio aviso.
 */
export function useSiguientePaso() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useCallback(
    async (claveCompletada?: string) => {
      try {
        const guia = await queryClient.fetchQuery({ queryKey: queryKeys.guia, queryFn: guiaApi.get, staleTime: 0 });
        void queryClient.invalidateQueries({ queryKey: queryKeys.bootstrap });
        const { mensaje, paso } = mensajeSiguiente(guia, claveCompletada);
        const accion = paso?.accion ?? null;
        toast.success(mensaje, accion ? { actionLabel: 'Ir', onAction: () => router.push(rutaDePaso(accion)) } : undefined);
      } catch (error) {
        logError('guia.siguientePaso', error);
      }
    },
    [queryClient, router],
  );
}
