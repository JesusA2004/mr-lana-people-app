import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { queryKeys } from '@/api/queryKeys';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyMessage, Notice, Screen } from '@/components/ciclo/Screen';
import { ReproductorVideoInduccion } from '@/components/ReproductorVideoInduccion';
import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useMiProceso } from '@/hooks/queries/useCicloLaboral';
import { useMaterialInduccion, useSesionVideoInduccion, useTerminarInduccion } from '@/hooks/queries/useInduccion';
import { toast } from '@/store/toastStore';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import { getActionErrorMessage, logError } from '@/utils/errors';
import {
  listaPaginasFaltantes,
  mensajeVideoPreparando,
  paginasQueBloqueanVideo,
  puedeTerminarInduccion,
  textoPaginasFaltantes,
  videoRequerido,
} from '@/utils/induccion';

/** Páginas que el backend dice que faltan en un 423 «presentacion_incompleta». */
function paginasDe423(error: unknown): number[] | null {
  if (!isAxiosError(error) || error.response?.status !== 423) return null;
  const cuerpo = error.response.data as { code?: string; paginas_faltantes?: unknown } | undefined;
  if (cuerpo?.code !== 'presentacion_incompleta') return null;
  return Array.isArray(cuerpo.paginas_faltantes) ? cuerpo.paginas_faltantes.filter((p): p is number => typeof p === 'number') : [];
}

/**
 * Paso «Video» de la Inducción Mr. Lana. Orden obligatorio (backend):
 * presentación completa → video → «Terminé la inducción» → evaluación.
 * Si faltan páginas el video aparece bloqueado y se dice CUÁL falta, con
 * botón que lleva ahí. El avance y el «completado» los decide el servidor.
 */
export default function InduccionVideoScreen() {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const queryClient = useQueryClient();
  const proceso = useMiProceso();
  const resumen = proceso.data?.induccion ?? null;
  const asignada = proceso.data?.miInduccion ?? null;
  const avanceId = resumen?.avanceId ?? null;
  const material = useMaterialInduccion(avanceId);
  const presentacionIncluida = asignada?.presentacionIncluida ?? true;
  const faltantes = resumen && presentacionIncluida && !resumen.completado ? listaPaginasFaltantes(resumen.paginasVistas, resumen.totalPaginas) : [];
  const bloqueadoPorPaginas = paginasQueBloqueanVideo(material.data, resumen?.paginasVistas ?? []);
  const listo = material.data?.tipo === 'video' && material.data.videoDisponible && bloqueadoPorPaginas.length === 0;
  const sesion = useSesionVideoInduccion(avanceId, listo);
  const terminar = useTerminarInduccion(avanceId);
  const [completadoLocal, setCompletadoLocal] = useState(false);
  // Un 423 del servidor (material en caché viejo) también bloquea con sus páginas.
  const paginas423 = paginasDe423(sesion.error);
  const paginasBloqueo = paginas423 ?? bloqueadoPorPaginas;

  const videoCompletado = completadoLocal || sesion.data?.completada === true || asignada?.material?.completado === true;
  const habilitarTerminar = resumen
    ? puedeTerminarInduccion({
        completado: resumen.completado,
        paginasFaltantes: faltantes.length,
        presentacionIncluida,
        videoRequerido: videoRequerido(asignada, material.data),
        videoCompletado,
      })
    : false;

  const refrescar = () => {
    void proceso.refetch();
    if (avanceId !== null) void material.refetch();
  };

  const irAPagina = (pagina: number) => router.push({ pathname: '/induccion/capitulos', params: { pagina: String(pagina) } });

  const alCompletar = () => {
    setCompletadoLocal(true);
    toast.success('¡Viste el video completo!');
    void queryClient.invalidateQueries({ queryKey: queryKeys.miProceso });
    void queryClient.invalidateQueries({ queryKey: queryKeys.guia });
  };

  const alTerminar = async () => {
    try {
      const resultado = await terminar.mutateAsync();
      void queryClient.invalidateQueries({ queryKey: queryKeys.guia });
      toast.success(resultado.evaluacion?.puedePresentar ? 'Listo. Siguiente: tu evaluación de inducción' : '¡Terminaste la inducción!');
      router.replace(resultado.evaluacion?.puedePresentar ? '/induccion/evaluacion' : '/induccion');
    } catch (error) {
      logError('induccion.terminar', error);
      toast.error(getActionErrorMessage(error));
    }
  };

  const cargando = proceso.isLoading || material.isLoading || (listo && sesion.isLoading);
  const errorCarga = proceso.error ?? material.error ?? null;
  // El 423 no es «error al cargar»: es el candado del orden, se explica abajo.
  const errorSesion = listo && paginas423 === null ? sesion.error : null;

  return (
    <Screen
      title="Video de la inducción"
      isLoading={cargando}
      error={errorCarga ?? errorSesion}
      hayDatos={proceso.data !== undefined && material.data !== undefined && !errorSesion}
      onRetry={() => {
        if (errorCarga) refrescar();
        else void sesion.refetch();
      }}
      refreshing={proceso.isRefetching || material.isRefetching}
      onRefresh={refrescar}>
      {avanceId === null ? (
        <EmptyMessage message="Tu proceso no incluye la inducción en este momento." />
      ) : material.data?.tipo !== 'video' ? (
        <EmptyMessage message="Tu inducción no incluye video." />
      ) : !material.data.videoDisponible ? (
        <>
          <Notice tone="warning">{mensajeVideoPreparando(material.data)}</Notice>
          <Button title="Volver a revisar" variant="outline" leftIcon="refresh" onPress={refrescar} />
        </>
      ) : paginasBloqueo.length > 0 || paginas423 !== null ? (
        <Card style={styles.bloque}>
          <View style={styles.candado}>
            <Ionicons name="lock-closed-outline" size={28} color={Colors.warning} />
          </View>
          <Text style={styles.titulo}>Primero termina la presentación</Text>
          <Text style={styles.texto}>
            El video se abre al terminar todas las páginas del documento
            {paginasBloqueo.length > 0 ? ` (${textoPaginasFaltantes(paginasBloqueo).toLowerCase()}).` : '.'} Así no pierdes el hilo si sales a contestar.
          </Text>
          <Button
            title={paginasBloqueo.length > 0 ? `Ir a la página ${paginasBloqueo[0]}` : 'Ir al documento'}
            rightIcon="arrow-forward"
            onPress={() => (paginasBloqueo.length > 0 ? irAPagina(paginasBloqueo[0]) : router.push('/induccion/capitulos'))}
          />
        </Card>
      ) : sesion.data ? (
        <>
          <ReproductorVideoInduccion avanceId={avanceId} sesion={sesion.data} onCompletada={alCompletar} onReintentar={() => void sesion.refetch()} />
          <Card style={styles.bloque}>
            {resumen?.completado ? (
              <Text style={styles.texto}>Ya terminaste tu inducción. Puedes volver a ver el video cuando quieras.</Text>
            ) : !videoCompletado ? (
              <Text style={styles.texto}>Velo completo para desbloquear tu evaluación. Si sales, retomas donde te quedaste.</Text>
            ) : faltantes.length > 0 ? (
              <>
                <Text style={styles.exito}>Viste el video completo.</Text>
                <Text style={styles.texto}>{textoPaginasFaltantes(faltantes)} del documento para terminar.</Text>
                <Button title={`Ir a la página ${faltantes[0]}`} rightIcon="arrow-forward" onPress={() => irAPagina(faltantes[0])} />
              </>
            ) : (
              <>
                <Text style={styles.exito}>Viste el video completo.</Text>
                <Text style={styles.texto}>Siguiente: confirma que terminaste y contesta tu evaluación.</Text>
                <Button
                  title="Terminé la inducción"
                  leftIcon="checkmark-circle-outline"
                  disabled={!habilitarTerminar}
                  loading={terminar.isPending}
                  onPress={alTerminar}
                />
              </>
            )}
          </Card>
        </>
      ) : (
        <View />
      )}
    </Screen>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    bloque: { gap: Spacing.sm },
    candado: {
      alignSelf: 'center',
      width: 56,
      height: 56,
      borderRadius: Radius.full,
      backgroundColor: Colors.warningSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    titulo: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text, textAlign: 'center' },
    texto: { fontSize: FontSize.sm, color: Colors.textMuted, lineHeight: 19 },
    exito: { fontSize: FontSize.md, fontWeight: '700', color: Colors.success },
  });
