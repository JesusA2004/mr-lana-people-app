import { useVideoPlayer, VideoView, type VideoSource } from 'expo-video';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AnimatedProgressBar } from './AnimatedProgressBar';
import { ErrorState } from './ErrorState';

import { induccionApi } from '@/api/induccion';
import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { useEstilos } from '@/theme/ThemeProvider';
import type { SesionVideoInduccion } from '@/types/induccion';
import { logError } from '@/utils/errors';
import { evaluarSaltoVideo } from '@/utils/induccion';

export interface ReproductorVideoInduccionProps {
  avanceId: number;
  sesion: SesionVideoInduccion;
  /** El servidor reportó el video completo (≥ completion_percent). */
  onCompletada: () => void;
  /** Pide una sesión nueva (URL firmada fresca) tras un error de reproducción. */
  onReintentar: () => void;
}

const AVISO_ADELANTO = 'No puedes adelantar el video sin haberlo visto antes.';

/**
 * Video obligatorio de la Inducción Mr. Lana (HLS firmado). Mismo contrato
 * que el portal web (ReproductorVideoInduccion.vue): retoma en
 * `posicion_inicial`, reporta la posición cada `heartbeat_segundos` y el
 * «completado» lo decide el servidor. El anti-adelanto lo respalda el
 * servidor (HLS truncado + heartbeat rechazado); aquí se refuerza
 * regresando al último punto visto.
 */
export function ReproductorVideoInduccion({ avanceId, sesion, onCompletada, onReintentar }: ReproductorVideoInduccionProps) {
  const styles = useEstilos(crearEstilos);
  const token = useAuthStore((state) => state.token);
  const [porcentaje, setPorcentaje] = useState(sesion.porcentajeVisto);
  const [errorReproduccion, setErrorReproduccion] = useState(false);

  const source = useMemo<VideoSource>(
    () => ({
      uri: sesion.urlManifiesto,
      contentType: 'hls',
      useCaching: false,
      headers: token ? { Authorization: `Bearer ${token}`, Accept: 'application/vnd.apple.mpegurl, */*' } : undefined,
    }),
    [sesion.urlManifiesto, token],
  );

  const player = useVideoPlayer(source, (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = 0.5;
  });

  const posicionRef = useRef(sesion.posicionInicial);
  const maximoVistoRef = useRef(sesion.posicionInicial);
  const maximoServidorRef = useRef(sesion.segundoMaximoPermitido);
  const ultimaReportadaRef = useRef(sesion.posicionInicial);
  const completadaRef = useRef(sesion.completada);
  const posicionadoRef = useRef(false);
  const ultimoAvisoRef = useRef(0);
  const onCompletadaRef = useRef(onCompletada);
  useEffect(() => {
    onCompletadaRef.current = onCompletada;
  }, [onCompletada]);

  const avisarAdelanto = () => {
    const ahora = Date.now();
    if (ahora - ultimoAvisoRef.current < 4000) return;
    ultimoAvisoRef.current = ahora;
    toast.warning(AVISO_ADELANTO);
  };

  // Heartbeat: el servidor registra el tramo visto y responde si se permitió.
  const enviarHeartbeat = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    enviarHeartbeat.current = async () => {
      // Antes de retomar en `posicion_inicial` el reproductor marca 0: no se reporta.
      if (!posicionadoRef.current) return;
      const posicion = Math.floor(posicionRef.current);
      if (posicion === ultimaReportadaRef.current) return;
      try {
        const respuesta = await induccionApi.heartbeatVideo(avanceId, posicion);
        maximoServidorRef.current = respuesta.segundoMaximoPermitido;
        setPorcentaje(respuesta.porcentajeVisto);
        if (!respuesta.permitido) {
          try {
            player.currentTime = respuesta.posicionPermitida;
          } catch {
            // El reproductor pudo liberarse al salir de la pantalla.
          }
          posicionRef.current = respuesta.posicionPermitida;
          avisarAdelanto();
        }
        ultimaReportadaRef.current = Math.floor(posicionRef.current);
        if (respuesta.completada && !completadaRef.current) {
          completadaRef.current = true;
          onCompletadaRef.current();
        }
      } catch (error) {
        // Un heartbeat fallido no interrumpe la reproducción: el siguiente lo cubre.
        logError('induccion.video.heartbeat', error);
      }
    };
  });

  useEffect(() => {
    const estado = player.addListener('statusChange', ({ status, error }) => {
      if (status === 'readyToPlay' && !posicionadoRef.current) {
        posicionadoRef.current = true;
        // Retomar donde se quedó (lo máximo ya visto, según el servidor).
        if (sesion.posicionInicial > 0) player.currentTime = sesion.posicionInicial;
      }
      if (status === 'error') {
        logError('induccion.video', error ?? new Error('expo-video'));
        setErrorReproduccion(true);
      }
    });
    const tiempo = player.addListener('timeUpdate', ({ currentTime }) => {
      const { regresarA, maximoVisto } = evaluarSaltoVideo(posicionRef.current, currentTime, maximoVistoRef.current, maximoServidorRef.current);
      maximoVistoRef.current = maximoVisto;
      if (regresarA !== null) {
        player.currentTime = regresarA;
        posicionRef.current = regresarA;
        avisarAdelanto();
        return;
      }
      posicionRef.current = currentTime;
      // Sin cambiar la velocidad (mismo criterio que el portal).
      if (player.playbackRate !== 1) player.playbackRate = 1;
    });
    const fin = player.addListener('playToEnd', () => {
      void enviarHeartbeat.current();
    });
    const pausa = player.addListener('playingChange', ({ isPlaying }) => {
      if (!isPlaying) void enviarHeartbeat.current();
    });
    return () => {
      estado.remove();
      tiempo.remove();
      fin.remove();
      pausa.remove();
    };
  }, [player, sesion.posicionInicial]);

  useEffect(() => {
    const intervalo = setInterval(() => {
      void enviarHeartbeat.current();
    }, sesion.heartbeatSegundos * 1000);
    return () => {
      clearInterval(intervalo);
      // Último reporte al salir (usa la posición guardada: el player ya se libera).
      void enviarHeartbeat.current();
    };
  }, [sesion.heartbeatSegundos]);

  if (errorReproduccion) {
    return (
      <View style={styles.errorBox}>
        <ErrorState
          message="No pudimos reproducir el video de la inducción. Revisa tu conexión e inténtalo de nuevo."
          onRetry={() => {
            setErrorReproduccion(false);
            posicionadoRef.current = false;
            onReintentar();
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.marco}>
        <VideoView player={player} style={styles.video} nativeControls contentFit="contain" allowsPictureInPicture={false} fullscreenOptions={{ enable: true }} />
      </View>
      <View style={styles.avance}>
        <Text style={styles.avanceTexto}>Visto: {Math.floor(porcentaje)} %</Text>
        <AnimatedProgressBar percent={Math.floor(porcentaje)} />
      </View>
    </View>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    container: { gap: Spacing.md },
    marco: { borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: Colors.black },
    video: { width: '100%', aspectRatio: 16 / 9 },
    avance: { gap: Spacing.xs },
    avanceTexto: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textMuted },
    errorBox: { paddingVertical: Spacing.md },
  });
