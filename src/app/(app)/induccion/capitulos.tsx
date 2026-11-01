import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { EmptyMessage, Screen } from '@/components/ciclo/Screen';
import { VisorPdfPaginado } from '@/components/VisorPdfPaginado';
import { useMiProceso } from '@/hooks/queries/useCicloLaboral';
import { usePresentacionInduccion, useRegistrarPaginaInduccion, useTerminarInduccion } from '@/hooks/queries/useInduccion';
import { useColores } from '@/theme/ThemeProvider';
import { toast } from '@/store/toastStore';
import { getActionErrorMessage, logError } from '@/utils/errors';
import { paginasFaltantes } from '@/utils/induccion';

/**
 * La inducción del colaborador = el PDF OFICIAL (mismo que la web), página
 * por página. Cada página MOSTRADA se registra en el servidor (se retoma
 * en cualquier dispositivo); al recorrerlas todas, «Terminé la inducción»
 * habilita la evaluación. (La ruta conserva su nombre por los enlaces ya
 * publicados.)
 */
export default function InduccionLecturaScreen() {
  const Colors = useColores();
  const router = useRouter();
  const proceso = useMiProceso();
  const resumen = proceso.data?.induccion ?? null;
  const avanceId = resumen?.avanceId ?? null;
  const pdf = usePresentacionInduccion();
  const registrar = useRegistrarPaginaInduccion(avanceId);
  const terminar = useTerminarInduccion(avanceId);
  // El servidor manda: su lista siempre se suma (`proceso` puede llegar después
  // del primer render, en arranque en frío o desde un push). Lo local solo
  // cubre la página recién mostrada mientras su POST sigue en vuelo.
  const [vistasLocales, setVistasLocales] = useState<Set<number>>(() => new Set());
  const paginasServidor = resumen?.paginasVistas;
  const vistas = useMemo(() => new Set([...(paginasServidor ?? []), ...vistasLocales]), [paginasServidor, vistasLocales]);
  const total = pdf.data?.totalPaginas ?? resumen?.totalPaginas ?? 0;
  const faltan = paginasFaltantes(resumen ? { ...resumen, paginasVistas: [...vistas] } : null, total);

  const alMostrar = (numero: number) => {
    if (avanceId === null || vistas.has(numero)) return;
    setVistasLocales((previas) => new Set(previas).add(numero));
    registrar.mutate(numero, {
      onError: (error) => {
        // Sin bloquear la lectura: se vuelve a reportar al mostrarla otra vez.
        logError('induccion.pagina', error);
        setVistasLocales((previas) => {
          const copia = new Set(previas);
          copia.delete(numero);
          return copia;
        });
      },
    });
  };

  const alTerminar = async () => {
    try {
      const resultado = await terminar.mutateAsync();
      toast.success('¡Terminaste la inducción!');
      router.replace(resultado.evaluacion?.puedePresentar ? '/induccion/evaluacion' : '/induccion');
    } catch (error) {
      logError('induccion.terminar', error);
      toast.error(getActionErrorMessage(error));
    }
  };

  if (proceso.isLoading || pdf.isLoading || avanceId === null || !pdf.data) {
    // Reintenta lo que haya fallado: si solo se recargara el PDF, un fallo de `proceso` no se recuperaría.
    const reintentar = () => {
      if (proceso.isError) void proceso.refetch();
      if (pdf.isError) void pdf.refetch();
    };
    return (
      <Screen title="Inducción Mr. Lana" isLoading={proceso.isLoading || pdf.isLoading} error={proceso.error ?? pdf.error} onRetry={reintentar}>
        {avanceId === null ? <EmptyMessage message="Tu proceso no incluye la inducción en este momento." /> : null}
      </Screen>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <AppHeader title="Inducción Mr. Lana" showBack />
      <VisorPdfPaginado
        path={pdf.data.path}
        titulo={pdf.data.titulo}
        puedeDescargar={pdf.data.puedeDescargar}
        paginaInicial={resumen?.ultimaPagina ?? 1}
        onPagina={alMostrar}
        nota={resumen?.completado ? null : faltan > 0 ? `Te faltan ${faltan} página(s)` : null}
        accionFinal={
          resumen?.completado ? undefined : (
            <Button title="Terminé la inducción" fullWidth={false} leftIcon="checkmark-circle-outline" disabled={faltan > 0} loading={terminar.isPending} onPress={alTerminar} />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
