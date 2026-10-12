import { useRouter } from 'expo-router';
import { useMemo } from 'react';

import { EmptyMessage, Notice, Screen } from '@/components/ciclo/Screen';
import { LectorCapitulos } from '@/components/induccion/LectorCapitulos';
import { usePresentacionInduccion } from '@/hooks/queries/useInduccion';

/**
 * Inducción Mr. Lana en MODO PRESENTACIÓN — compartida por colaborador y RH
 * (p. ej. para presentarla por Meet): mismos capítulos reales y organigramas
 * vigentes, sin registrar avance de nadie ni habilitar evaluaciones.
 */
export default function PresentacionInduccionScreen() {
  const router = useRouter();
  const query = usePresentacionInduccion();
  const vistos = useMemo(() => new Set<string>(), []);

  return (
    <Screen
      title={query.data?.titulo ?? 'Inducción Mr. Lana'}
      subtitle="Modo presentación"
      isLoading={query.isLoading}
      error={query.error}
      notFoundMessage="La inducción institucional todavía no tiene contenido cargado."
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}>
      {!query.data || query.data.capitulos.length === 0 ? (
        <EmptyMessage message="La inducción todavía no tiene contenido cargado." />
      ) : (
        <>
          <Notice tone="info">Modo presentación: aquí no se registra el avance de nadie. Para tu propia inducción entra desde «Mis pendientes».</Notice>
          <LectorCapitulos capitulos={query.data.capitulos} indiceInicial={0} vistos={vistos} textoTerminar="Terminar presentación" onTerminar={() => router.back()} />
        </>
      )}
    </Screen>
  );
}
