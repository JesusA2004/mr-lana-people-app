import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';

import { EmptyMessage, Screen } from '@/components/ciclo/Screen';
import { LectorCapitulos } from '@/components/induccion/LectorCapitulos';
import { useMiProceso } from '@/hooks/queries/useCicloLaboral';
import { useCapitulosInduccion, useRegistrarCapitulo } from '@/hooks/queries/useInduccion';
import { toast } from '@/store/toastStore';
import { getActionErrorMessage, logError } from '@/utils/errors';
import { indiceParaRetomar } from '@/utils/induccion';

/**
 * Capítulos de la Inducción Mr. Lana del colaborador. Cada capítulo visto se
 * registra en el SERVIDOR antes de avanzar (nunca solo local): así se retoma
 * donde se quedó en cualquier dispositivo y en la web.
 */
export default function CapitulosInduccionScreen() {
  const router = useRouter();
  const { indice } = useLocalSearchParams<{ indice?: string }>();
  const proceso = useMiProceso();
  const resumen = proceso.data?.induccion ?? null;
  const avanceId = resumen?.avanceId ?? null;
  const query = useCapitulosInduccion(avanceId);
  const registrar = useRegistrarCapitulo(avanceId);

  const capitulos = useMemo(() => query.data?.capitulos ?? [], [query.data]);
  const resumenServidor = query.data?.resumen ?? resumen;

  // Vistos según el servidor: claves exactas (si un backend anterior solo
  // manda el conteo, se toman los primeros N como respaldo).
  const vistos = useMemo(() => {
    const claves = resumenServidor?.clavesVistas ?? [];
    return new Set(claves.length > 0 ? claves : capitulos.slice(0, resumenServidor?.capitulosVistos ?? 0).map((c) => c.clave));
  }, [capitulos, resumenServidor?.clavesVistas, resumenServidor?.capitulosVistos]);
  const indiceInicial = indice !== undefined && /^\d+$/.test(indice) ? Number(indice) : indiceParaRetomar(capitulos, resumenServidor?.ultimoCapitulo ?? null);

  const registrarVisto = async (clave: string) => {
    if (vistos.has(clave)) return;
    try {
      await registrar.mutateAsync(clave);
    } catch (error) {
      logError('induccion.progreso', error);
      toast.error(getActionErrorMessage(error));
      throw error;
    }
  };

  return (
    <Screen
      title="Inducción Mr. Lana"
      isLoading={proceso.isLoading || (avanceId !== null && query.isLoading)}
      error={proceso.error ?? query.error}
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}>
      {avanceId === null ? (
        <EmptyMessage message="Tu proceso no incluye la inducción en este momento." />
      ) : capitulos.length === 0 ? (
        <EmptyMessage message="La inducción todavía no tiene contenido cargado." />
      ) : (
        <LectorCapitulos
          key={`${avanceId}-${indiceInicial}`}
          capitulos={capitulos}
          indiceInicial={indiceInicial}
          vistos={vistos}
          onCapituloVisto={registrarVisto}
          ocupado={registrar.isPending}
          textoTerminar="Terminar inducción"
          onTerminar={() => {
            toast.success('¡Completaste la inducción!');
            router.replace('/induccion');
          }}
        />
      )}
    </Screen>
  );
}
