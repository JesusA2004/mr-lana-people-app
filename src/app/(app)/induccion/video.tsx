import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { queryKeys } from '@/api/queryKeys';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyMessage, Notice, Screen } from '@/components/ciclo/Screen';
import { ReproductorVideoInduccion } from '@/components/ReproductorVideoInduccion';
import { FontSize, Spacing, type ColorPalette } from '@/constants/colors';
import { useMiProceso } from '@/hooks/queries/useCicloLaboral';
import { useMaterialInduccion, useSesionVideoInduccion, useTerminarInduccion } from '@/hooks/queries/useInduccion';
import { toast } from '@/store/toastStore';
import { useEstilos } from '@/theme/ThemeProvider';
import { getActionErrorMessage, logError } from '@/utils/errors';
import { mensajeVideoPreparando, paginasFaltantes, puedeTerminarInduccion, videoRequerido } from '@/utils/induccion';

/**
 * Paso «Video» de la Inducción Mr. Lana, separado del PDF: si el video
 * falla o se está procesando, el documento sigue funcionando (y al revés).
 * El avance y el «completado» los decide el servidor.
 */
export default function InduccionVideoScreen() {
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const queryClient = useQueryClient();
  const proceso = useMiProceso();
  const resumen = proceso.data?.induccion ?? null;
  const asignada = proceso.data?.miInduccion ?? null;
  const avanceId = resumen?.avanceId ?? null;
  const material = useMaterialInduccion(avanceId);
  const listo = material.data?.tipo === 'video' && material.data.videoDisponible;
  const sesion = useSesionVideoInduccion(avanceId, listo);
  const terminar = useTerminarInduccion(avanceId);
  const [completadoLocal, setCompletadoLocal] = useState(false);

  const videoCompletado = completadoLocal || sesion.data?.completada === true || asignada?.material?.completado === true;
  const habilitarTerminar = resumen
    ? puedeTerminarInduccion({
        completado: resumen.completado,
        paginasFaltantes: paginasFaltantes(resumen, resumen.totalPaginas),
        presentacionIncluida: asignada?.presentacionIncluida ?? true,
        videoRequerido: videoRequerido(asignada, material.data),
        videoCompletado,
      })
    : false;
  const faltanHojas = resumen && (asignada?.presentacionIncluida ?? true) ? paginasFaltantes(resumen, resumen.totalPaginas) : 0;

  const refrescar = () => {
    void proceso.refetch();
    if (avanceId !== null) void material.refetch();
  };

  const alCompletar = () => {
    setCompletadoLocal(true);
    toast.success('¡Viste el video completo!');
    void queryClient.invalidateQueries({ queryKey: queryKeys.miProceso });
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

  const cargando = proceso.isLoading || material.isLoading || (listo && sesion.isLoading);
  const errorCarga = proceso.error ?? material.error ?? null;

  return (
    <Screen
      title="Video de la inducción"
      isLoading={cargando}
      error={errorCarga ?? (listo ? sesion.error : null)}
      hayDatos={proceso.data !== undefined && material.data !== undefined && !sesion.error}
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
      ) : !listo ? (
        <>
          <Notice tone="warning">{mensajeVideoPreparando(material.data)}</Notice>
          <Button title="Volver a revisar" variant="outline" leftIcon="refresh" onPress={refrescar} />
        </>
      ) : sesion.data ? (
        <>
          <ReproductorVideoInduccion avanceId={avanceId} sesion={sesion.data} onCompletada={alCompletar} onReintentar={() => void sesion.refetch()} />
          <Card style={styles.bloque}>
            {videoCompletado ? (
              <Text style={styles.texto}>Viste el video completo.</Text>
            ) : (
              <Text style={styles.texto}>Velo completo para poder terminar tu inducción. Si sales, retomas donde te quedaste.</Text>
            )}
            {resumen?.completado ? null : faltanHojas > 0 ? (
              <Notice tone="info">Te faltan {faltanHojas} página(s) del documento para terminar.</Notice>
            ) : null}
            {resumen?.completado ? null : (
              <Button
                title="Terminé la inducción"
                leftIcon="checkmark-circle-outline"
                disabled={!habilitarTerminar}
                loading={terminar.isPending}
                onPress={alTerminar}
              />
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
    texto: { fontSize: FontSize.sm, color: Colors.textMuted, lineHeight: 19 },
  });
