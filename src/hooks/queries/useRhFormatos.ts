import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { rhFormatosApi, type PrepararGenerarFormatoPayload } from '@/api/rh/formatos';

/** `GET /rh/formatos` — arreglo plano, sin paginación ni filtros de query (ver `rhFormatosApi.list`). */
export function useRhFormatos(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.rhFormatos(),
    queryFn: () => rhFormatosApi.list(),
    enabled,
  });
}

/** `POST /rh/formatos/{plantilla}/preparar` — se reintenta cada vez que cambian los valores manuales capturados. */
export function useRhFormatoPreparation(plantillaId: string | number | undefined, payload: PrepararGenerarFormatoPayload | undefined) {
  return useQuery({
    queryKey: queryKeys.rhFormatoPreparation(plantillaId ?? '', payload?.sujeto_id ?? '', payload?.extra ?? {}),
    queryFn: () => rhFormatosApi.preparar(plantillaId as string | number, payload as PrepararGenerarFormatoPayload),
    enabled: Boolean(plantillaId) && Boolean(payload?.sujeto_id),
  });
}

export function useRhFormatoGenerar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ plantillaId, payload }: { plantillaId: string | number; payload: PrepararGenerarFormatoPayload }) =>
      rhFormatosApi.generar(plantillaId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.rhFormatos() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.bootstrap });
    },
  });
}
