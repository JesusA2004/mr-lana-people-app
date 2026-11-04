import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AnimatedProgressBar } from '@/components/AnimatedProgressBar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyMessage, Notice, Screen, SectionTitle } from '@/components/ciclo/Screen';
import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useMiProceso } from '@/hooks/queries/useCicloLaboral';
import { useMiDescriptivoPuesto } from '@/hooks/queries/useDescriptivoPuesto';
import { descriptivoPendiente } from '@/utils/descriptivoPuesto';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import { useMaterialInduccion, useTerminarInduccion } from '@/hooks/queries/useInduccion';
import { queryKeys } from '@/api/queryKeys';
import { toast } from '@/store/toastStore';
import { getActionErrorMessage, logError } from '@/utils/errors';
import {
  faseInduccion,
  fechaLegible,
  listaPaginasFaltantes,
  mensajeVideoPreparando,
  paginasQueBloqueanVideo,
  puedeTerminarInduccion,
  resultadoInduccion,
  textoPaginasFaltantes,
  textoProgreso,
  ultimoIntentoCalificado,
  videoRequerido,
} from '@/utils/induccion';

/**
 * Inducción Mr. Lana: avance por páginas del PDF oficial (guardado en el servidor),
 * acceso para retomar y estado de la evaluación oficial. TODO el estado
 * sale de `mi-proceso`; la app no decide si la evaluación está habilitada
 * ni califica nada.
 */
export default function InduccionScreen() {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const proceso = useMiProceso();
  const resumen = proceso.data?.induccion ?? null;
  const evaluacion = proceso.data?.evaluacionInduccion ?? null;
  const fase = faseInduccion(resumen, evaluacion);
  const calificado = ultimoIntentoCalificado(evaluacion);
  const resultado = calificado ? resultadoInduccion(calificado) : null;
  const vistos = resumen?.paginasVistas.length ?? 0;
  // Paso «Video» independiente del PDF: si su consulta falla, el documento sigue igual.
  const asignada = proceso.data?.miInduccion ?? null;
  const material = useMaterialInduccion(resumen?.avanceId ?? null);
  const conVideo = material.data?.tipo === 'video' || videoRequerido(asignada, null);
  const videoCompleto = asignada?.material?.completado === true;
  const videoPorcentaje = asignada?.material?.porcentaje ?? 0;
  const presentacionIncluida = asignada?.presentacionIncluida ?? true;
  // Al aprobar, RH te envía tu descriptivo de puesto (lees + «OK, enterado»).
  const descriptivo = useMiDescriptivoPuesto();
  const descriptivoPorLeer = descriptivoPendiente(descriptivo.data);
  const queryClient = useQueryClient();
  const terminar = useTerminarInduccion(resumen?.avanceId ?? null);
  // Qué páginas faltan (para decir CUÁL y llevar ahí) y si el video sigue
  // bloqueado por el orden obligatorio presentación → video (backend).
  const faltantes = resumen && presentacionIncluida && !resumen.completado ? listaPaginasFaltantes(resumen.paginasVistas, resumen.totalPaginas) : [];
  const bloqueoVideo = videoCompleto ? [] : paginasQueBloqueanVideo(material.data, resumen?.paginasVistas ?? []);
  const habilitarTerminar = resumen
    ? puedeTerminarInduccion({
        completado: resumen.completado,
        paginasFaltantes: faltantes.length,
        presentacionIncluida,
        videoRequerido: conVideo,
        videoCompletado: videoCompleto,
      })
    : false;
  const irAPagina = (pagina: number) => router.push({ pathname: '/induccion/capitulos', params: { pagina: String(pagina) } });

  const alTerminar = async () => {
    try {
      const resultado = await terminar.mutateAsync();
      void queryClient.invalidateQueries({ queryKey: queryKeys.guia });
      toast.success(resultado.evaluacion?.puedePresentar ? 'Listo. Siguiente: tu evaluación de inducción' : '¡Terminaste la inducción!');
      if (resultado.evaluacion?.puedePresentar) router.push('/induccion/evaluacion');
    } catch (error) {
      logError('induccion.terminar', error);
      toast.error(getActionErrorMessage(error));
    }
  };

  const refrescar = () => {
    void proceso.refetch();
    if (resumen) void material.refetch();
  };

  return (
    <Screen
      title="Inducción Mr. Lana"
      isLoading={proceso.isLoading}
      error={proceso.error} hayDatos={proceso.data !== undefined}
      onRetry={refrescar}
      refreshing={proceso.isRefetching}
      onRefresh={refrescar}>
      {fase === 'sin_induccion' || !resumen ? (
        <>
          <EmptyMessage message="Tu proceso de ingreso no incluye la inducción en este momento. Puedes repasarla cuando quieras." />
          <Button title="Ver la inducción" variant="outline" leftIcon="book-outline" onPress={() => router.push('/induccion/presentacion')} />
        </>
      ) : (
        <>
          <Card style={styles.hero}>
            <View style={styles.heroHeader}>
              <View style={styles.heroIcon}>
                <Ionicons name="school-outline" size={22} color={Colors.primaryDark} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.heroTitulo}>{resumen.titulo}</Text>
                <Text style={styles.heroTexto}>{textoProgreso(resumen)}</Text>
              </View>
              <Text style={styles.porcentaje}>{resumen.porcentaje} %</Text>
            </View>
            <AnimatedProgressBar percent={resumen.porcentaje} />
            {presentacionIncluida ? null : <Text style={styles.heroTexto}>Esta vez el documento es opcional: puedes repasarlo cuando quieras.</Text>}
            <Text style={styles.estado}>{resumen.completado ? 'Contenido completado' : vistos === 0 ? 'Sin iniciar' : 'En curso'}</Text>
            {faltantes.length > 0 && vistos > 0 ? <Text style={styles.heroTexto}>{textoPaginasFaltantes(faltantes)}.</Text> : null}
            <Button
              title={resumen.completado ? 'Repasar la inducción' : vistos === 0 ? 'Comenzar' : 'Continuar'}
              variant={resumen.completado ? 'outline' : 'primary'}
              rightIcon="arrow-forward"
              onPress={() => (faltantes.length > 0 && vistos > 0 ? irAPagina(faltantes[0]) : router.push('/induccion/capitulos'))}
            />
          </Card>

          {conVideo ? (
            <Card style={styles.bloque}>
              <View style={styles.heroHeader}>
                <View style={styles.heroIcon}>
                  <Ionicons name="videocam-outline" size={22} color={Colors.primaryDark} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.bloqueTitulo}>Video de la inducción</Text>
                  <Text style={styles.heroTexto}>
                    {videoCompleto ? 'Video completo' : videoPorcentaje > 0 ? `${videoPorcentaje} % visto` : 'Obligatorio: velo completo para terminar tu inducción'}
                  </Text>
                </View>
              </View>
              {bloqueoVideo.length > 0 ? (
                <>
                  <View style={styles.candado}>
                    <Ionicons name="lock-closed-outline" size={18} color={Colors.warning} />
                    <Text style={styles.candadoTexto}>Disponible al terminar la presentación ({textoPaginasFaltantes(bloqueoVideo).toLowerCase()}).</Text>
                  </View>
                  <Button title={`Ir a la página ${bloqueoVideo[0]}`} variant="outline" rightIcon="arrow-forward" onPress={() => irAPagina(bloqueoVideo[0])} />
                </>
              ) : material.isError ? (
                <Notice tone="warning">No pudimos consultar el video. Desliza hacia abajo para intentar de nuevo.</Notice>
              ) : material.data?.tipo === 'video' && !material.data.videoDisponible ? (
                <Notice tone="warning">{mensajeVideoPreparando(material.data)}</Notice>
              ) : material.data?.videoDisponible ? (
                <Button
                  title={videoCompleto ? 'Volver a ver el video' : videoPorcentaje > 0 ? 'Continuar el video' : 'Ver el video'}
                  variant={videoCompleto ? 'outline' : 'primary'}
                  leftIcon="play-circle-outline"
                  onPress={() => router.push('/induccion/video')}
                />
              ) : null}
            </Card>
          ) : null}

          {fase === 'evaluacion_disponible' || fase === 'reevaluacion_disponible' ? (
            <Card style={styles.bloque}>
              <Text style={styles.bloqueTitulo}>{fase === 'reevaluacion_disponible' ? 'Nueva evaluación disponible' : 'Tu evaluación está lista'}</Text>
              {evaluacion?.retroalimentacion ? <Notice tone="info">Comentario de Recursos Humanos: {evaluacion.retroalimentacion}</Notice> : null}
              {fase === 'reevaluacion_disponible' && evaluacion?.fechaLimiteReevaluacion ? (
                <Text style={styles.heroTexto}>Fecha límite: {fechaLegible(evaluacion.fechaLimiteReevaluacion)}</Text>
              ) : null}
              <Button title="Realizar evaluación" leftIcon="create-outline" onPress={() => router.push('/induccion/evaluacion')} />
            </Card>
          ) : null}

          {fase === 'contenido' && resumen.completado ? (
            <Notice tone="info">Terminaste la inducción. Tu evaluación se habilita en cuanto el sistema la active.</Notice>
          ) : null}
          {fase === 'contenido' && !resumen.completado ? (
            habilitarTerminar ? (
              <Card style={styles.bloque}>
                <Text style={styles.bloqueTitulo}>¡Ya viste todo!</Text>
                <Text style={styles.heroTexto}>Siguiente: confirma que terminaste para desbloquear tu evaluación.</Text>
                <Button title="Terminé la inducción" leftIcon="checkmark-circle-outline" loading={terminar.isPending} onPress={alTerminar} />
              </Card>
            ) : (
              <Notice tone="info">
                {presentacionIncluida ? `Orden: 1) las ${resumen.totalPaginas} páginas del documento` : 'Orden: 1) el documento es opcional'}
                {conVideo ? ', 2) el video completo' : ''}, después «Terminé la inducción» y tu evaluación.
              </Notice>
            )
          ) : null}
          {resumen.presentadaPorRhEn ? (
            <Notice tone="info">Recursos Humanos te presentó la inducción el {fechaLegible(resumen.presentadaPorRhEn)}.</Notice>
          ) : null}

          {fase === 'pendiente_rh' ? (
            <Notice tone="info">Enviaste tu evaluación. Recursos Humanos revisa tus casos prácticos y te avisará tu resultado.</Notice>
          ) : null}

          {resultado ? (
            <Card style={styles.bloque}>
              <SectionTitle>Tu resultado</SectionTitle>
              <View style={styles.resultadoFila}>
                <Text style={styles.resultadoPuntos}>{resultado.puntos}</Text>
                <Text style={styles.resultadoPorcentaje}>{resultado.porcentaje}</Text>
              </View>
              <View style={[styles.etiqueta, resultado.tono === 'success' ? styles.etiquetaExito : styles.etiquetaAviso]}>
                <Text style={[styles.etiquetaTexto, resultado.tono === 'success' ? styles.etiquetaTextoExito : styles.etiquetaTextoAviso]}>
                  {resultado.etiqueta}
                </Text>
              </View>
              {resultado.mensaje ? <Text style={styles.heroTexto}>{resultado.mensaje}</Text> : null}
            </Card>
          ) : null}

          {descriptivo.data ? (
            <Card style={styles.bloque}>
              <Text style={styles.bloqueTitulo}>Tu descriptivo de puesto</Text>
              <Text style={styles.heroTexto}>
                {descriptivoPorLeer
                  ? 'Recursos Humanos te envió tus actividades y responsabilidades. Léelas y confirma que estás enterado.'
                  : 'Ya confirmaste que estás enterado. Puedes volver a consultarlo cuando quieras.'}
              </Text>
              <Button
                title={descriptivoPorLeer ? 'Leer descriptivo de puesto' : 'Ver descriptivo de puesto'}
                variant={descriptivoPorLeer ? 'primary' : 'outline'}
                leftIcon="briefcase-outline"
                onPress={() => router.push('/descriptivo-puesto')}
              />
            </Card>
          ) : null}

          {fase === 'reforzamiento' ? (
            <Card style={styles.bloque}>
              <Text style={styles.bloqueTitulo}>Reforzamiento pendiente</Text>
              <Text style={styles.heroTexto}>
                Recursos Humanos te contactará para reforzar algunos temas. La nueva evaluación aparecerá aquí cuando la habiliten.
              </Text>
              {evaluacion?.fechaLimiteReevaluacion ? (
                <Text style={styles.heroTexto}>Fecha límite: {fechaLegible(evaluacion.fechaLimiteReevaluacion)}</Text>
              ) : null}
            </Card>
          ) : null}

        </>
      )}
    </Screen>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    flex: { flex: 1 },
    hero: { gap: Spacing.md },
    heroHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    heroIcon: {
      width: 44,
      height: 44,
      borderRadius: Radius.full,
      backgroundColor: Colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroTitulo: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
    heroTexto: { fontSize: FontSize.sm, color: Colors.textMuted, lineHeight: 19 },
    porcentaje: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.primary },
    estado: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primaryDark },
    candado: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.warningSoft, borderRadius: Radius.md, padding: Spacing.md },
    candadoTexto: { flex: 1, fontSize: FontSize.sm, color: Colors.text, lineHeight: 19 },
    bloque: { gap: Spacing.sm },
    bloqueTitulo: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
    resultadoFila: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.md },
    resultadoPuntos: { fontSize: FontSize.xxxl, fontWeight: '800', color: Colors.text },
    resultadoPorcentaje: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.textMuted },
    etiqueta: { alignSelf: 'flex-start', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full },
    etiquetaExito: { backgroundColor: Colors.successSoft },
    etiquetaAviso: { backgroundColor: Colors.warningSoft },
    etiquetaTexto: { fontSize: FontSize.sm, fontWeight: '800' },
    etiquetaTextoExito: { color: Colors.success },
    etiquetaTextoAviso: { color: Colors.warning },
  });
