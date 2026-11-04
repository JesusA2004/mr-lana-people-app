import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView, type VideoSource } from 'expo-video';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AnimatedProgressBar } from './AnimatedProgressBar';
import { BarraProgresoVideo } from './BarraProgresoVideo';
import { Button } from './Button';
import { PressableScale } from './PressableScale';

import { induccionApi } from '@/api/induccion';
import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import type { SesionVideoInduccion } from '@/types/induccion';
import { logError } from '@/utils/errors';
import { evaluarSaltoVideo, posicionRetroceder } from '@/utils/induccion';

export interface ReproductorVideoInduccionProps {
  avanceId: number;
  sesion: SesionVideoInduccion;
  /** El servidor reportó el video completo (≥ completion_percent). */
  onCompletada: () => void;
  /** Pide una sesión nueva (URL firmada fresca) tras un error de reproducción. */
  onReintentar: () => void;
}

const AVISO_ADELANTO = 'No puedes adelantar el video sin haberlo visto antes.';
export const MENSAJE_CADUCADA = 'La reproducción caducó, obteniendo una nueva…';
export const MENSAJE_SIN_CONEXION = 'Sin conexión. El video continuará cuando vuelvas a tener internet.';
const MENSAJE_ERROR = 'No pudimos reproducir el video de la inducción. Revisa tu conexión e inténtalo de nuevo.';

/**
 * Video obligatorio de la Inducción Mr. Lana (HLS firmado). Mismo contrato
 * que el portal web (ReproductorVideoInduccion.vue): retoma en
 * `posicion_inicial`, reporta la posición cada `heartbeat_segundos` y el
 * «completado» lo decide el servidor. El servidor entrega el HLS COMPLETO
 * (precarga, no se traba) y solo acredita lo que avanza al ritmo del tiempo
 * real; aquí se bloquea el seek manual más allá de lo visto
 * (evaluarSaltoVideo). La carga o un buffering nunca cuentan como adelanto.
 *
 * Controles PROPIOS, grandes y simples (sin los nativos, que traían «+15»,
 * «siguiente» y velocidad): reproducir/pausa, retroceder 10 s, barra que
 * solo deja moverse dentro de lo ya visto, y pantalla completa.
 *
 * Errores: sin conexión → aviso y retoma solo al volver la red; con
 * conexión, lo común es la URL firmada vencida → se pide una nueva UNA vez
 * automáticamente antes de mostrar el error.
 */
export function ReproductorVideoInduccion({ avanceId, sesion, onCompletada, onReintentar }: ReproductorVideoInduccionProps) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const token = useAuthStore((state) => state.token);
  const { isOffline } = useNetworkStatus();
  const [porcentaje, setPorcentaje] = useState(sesion.porcentajeVisto);
  const [errorReproduccion, setErrorReproduccion] = useState(false);
  // «Obteniendo una nueva…» mientras la sesión sigue siendo la que falló.
  const [sesionQueFallo, setSesionQueFallo] = useState<SesionVideoInduccion | null>(null);
  const reintentando = sesionQueFallo === sesion;
  /** Errores de reproducción de esta pantalla: el 1.º reintenta solo (URL vencida). */
  const [fallos, setFallos] = useState(0);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [duracionPlayer, setDuracionPlayer] = useState(0);
  const [tiempo, setTiempo] = useState({ actual: sesion.posicionInicial, visto: sesion.posicionInicial });
  const videoRef = useRef<VideoView>(null);

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
  // Los controles propios mueven el reproductor desde handlers: vía ref.
  const playerRef = useRef(player);
  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  const posicionRef = useRef(sesion.posicionInicial);
  const maximoVistoRef = useRef(sesion.posicionInicial);
  const maximoServidorRef = useRef(sesion.segundoMaximoPermitido);
  const ultimaReportadaRef = useRef(sesion.posicionInicial);
  const completadaRef = useRef(sesion.completada);
  const posicionadoRef = useRef(false);
  const ultimoAvisoRef = useRef(0);
  /** Reloj real de la última lectura de timeUpdate (0 = reiniciar). */
  const ultimaLecturaRef = useRef(0);
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
          // Solo se rechaza un avance más rápido que el tiempo real (nunca
          // por buffering): es un adelanto de verdad.
          maximoVistoRef.current = Math.min(maximoVistoRef.current, respuesta.posicionPermitida);
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
      setCargando(status === 'loading');
      if (status === 'readyToPlay' && player.duration > 0) setDuracionPlayer(player.duration);
      if (status === 'readyToPlay' && !posicionadoRef.current) {
        posicionadoRef.current = true;
        // Retomar donde se quedó (lo máximo ya visto, según el servidor).
        if (sesion.posicionInicial > 0) player.currentTime = sesion.posicionInicial;
      }
      if (status === 'error') {
        logError('induccion.video', error ?? new Error('expo-video'));
        setFallos((n) => n + 1);
        setErrorReproduccion(true);
      }
    });
    const tiempoListener = player.addListener('timeUpdate', ({ currentTime }) => {
      const ahora = Date.now();
      const segundosReales = ultimaLecturaRef.current > 0 ? (ahora - ultimaLecturaRef.current) / 1000 : 0;
      ultimaLecturaRef.current = ahora;
      const { regresarA, maximoVisto } = evaluarSaltoVideo(
        posicionRef.current,
        currentTime,
        maximoVistoRef.current,
        maximoServidorRef.current,
        segundosReales,
      );
      maximoVistoRef.current = maximoVisto;
      if (regresarA !== null) {
        player.currentTime = regresarA;
        posicionRef.current = regresarA;
        avisarAdelanto();
        setTiempo({ actual: regresarA, visto: maximoVistoRef.current });
        return;
      }
      posicionRef.current = currentTime;
      setTiempo({ actual: currentTime, visto: maximoVistoRef.current });
      // Sin cambiar la velocidad (mismo criterio que el portal).
      if (player.playbackRate !== 1) player.playbackRate = 1;
    });
    const fin = player.addListener('playToEnd', () => {
      void enviarHeartbeat.current();
    });
    const pausa = player.addListener('playingChange', ({ isPlaying }) => {
      setReproduciendo(isPlaying);
      // Tras una pausa o un buffering el reloj real vuelve a contar desde aquí.
      ultimaLecturaRef.current = isPlaying ? Date.now() : 0;
      if (!isPlaying) void enviarHeartbeat.current();
    });
    return () => {
      estado.remove();
      tiempoListener.remove();
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

  const reintentarRef = useRef(() => {});
  useEffect(() => {
    reintentarRef.current = () => {
      setErrorReproduccion(false);
      setSesionQueFallo(sesion);
      posicionadoRef.current = false;
      onReintentar();
    };
  });

  // Con conexión: primer error → URL nueva automática (una sola vez).
  useEffect(() => {
    if (errorReproduccion && !isOffline && fallos === 1) reintentarRef.current();
  }, [errorReproduccion, isOffline, fallos]);

  // Volvió la conexión con el video detenido por error: retoma solo.
  const sinConexionAntesRef = useRef(isOffline);
  useEffect(() => {
    const volvio = sinConexionAntesRef.current && !isOffline;
    sinConexionAntesRef.current = isOffline;
    // (Con un solo fallo ya lo cubre el reintento automático de arriba.)
    if (volvio && errorReproduccion && fallos > 1) reintentarRef.current();
  }, [isOffline, errorReproduccion, fallos]);

  const alternar = () => {
    try {
      const p = playerRef.current;
      if (p.playing) p.pause();
      else p.play();
    } catch (error) {
      logError('induccion.video.alternar', error);
    }
  };

  const irA = (segundos: number) => {
    try {
      playerRef.current.currentTime = segundos;
      posicionRef.current = segundos;
      setTiempo({ actual: segundos, visto: maximoVistoRef.current });
    } catch (error) {
      logError('induccion.video.irA', error);
    }
  };

  const duracion = sesion.duracionSegundos ?? duracionPlayer;

  if (reintentando) {
    return (
      <View style={styles.estadoBox} accessibilityLiveRegion="polite">
        <ActivityIndicator color={Colors.primary} />
        <Text style={styles.estadoTexto}>{MENSAJE_CADUCADA}</Text>
      </View>
    );
  }

  if (errorReproduccion && (isOffline || fallos > 1)) {
    return (
      <View style={styles.estadoBox} accessibilityLiveRegion="polite">
        <Ionicons name={isOffline ? 'cloud-offline-outline' : 'alert-circle-outline'} size={32} color={Colors.warning} />
        <Text style={styles.estadoTexto}>{isOffline ? MENSAJE_SIN_CONEXION : MENSAJE_ERROR}</Text>
        {isOffline ? null : (
          <Button title="Intentar de nuevo" variant="outline" leftIcon="refresh" fullWidth={false} onPress={() => reintentarRef.current()} />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isOffline ? (
        <View style={styles.avisoRed}>
          <Ionicons name="cloud-offline-outline" size={16} color={Colors.warning} />
          <Text style={styles.avisoRedTexto}>{MENSAJE_SIN_CONEXION}</Text>
        </View>
      ) : null}
      <View style={styles.marco}>
        <VideoView
          ref={videoRef}
          player={player}
          style={styles.video}
          nativeControls={false}
          contentFit="contain"
          allowsPictureInPicture={false}
          fullscreenOptions={{ enable: true }}
        />
        {cargando ? (
          <View style={styles.capaCarga} pointerEvents="none">
            <ActivityIndicator color={Colors.white} size="large" />
          </View>
        ) : null}
      </View>

      {/* Controles propios: grandes, sin adelantar ni cambiar velocidad. */}
      <BarraProgresoVideo duracion={duracion} actual={tiempo.actual} maximoVisto={tiempo.visto} onBuscar={irA} />
      <View style={styles.controles}>
        <PressableScale accessibilityRole="button" accessibilityLabel="Retroceder 10 segundos" onPress={() => irA(posicionRetroceder(posicionRef.current, 10))}>
          <View style={styles.botonSecundario}>
            <Ionicons name="play-back" size={22} color={Colors.primaryDark} />
            <Text style={styles.botonTexto}>10 s</Text>
          </View>
        </PressableScale>
        <PressableScale accessibilityRole="button" accessibilityLabel={reproduciendo ? 'Pausar' : 'Reproducir'} onPress={alternar}>
          <View style={styles.botonPrincipal}>
            <Ionicons name={reproduciendo ? 'pause' : 'play'} size={34} color={Colors.white} />
          </View>
        </PressableScale>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Pantalla completa"
          onPress={() => {
            videoRef.current?.enterFullscreen().catch((error: unknown) => logError('induccion.video.fullscreen', error));
          }}>
          <View style={styles.botonSecundario}>
            <Ionicons name="expand" size={22} color={Colors.primaryDark} />
            <Text style={styles.botonTexto}>Completa</Text>
          </View>
        </PressableScale>
      </View>

      <View style={styles.avance}>
        <Text style={styles.avanceTexto}>Visto: {Math.floor(porcentaje)} %</Text>
        <AnimatedProgressBar percent={Math.floor(porcentaje)} />
        <Text style={styles.nota}>Puedes regresar a cualquier parte que ya viste; lo nuevo se ve completo, sin adelantar.</Text>
      </View>
    </View>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    container: { gap: Spacing.md },
    marco: { borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: Colors.black },
    video: { width: '100%', aspectRatio: 16 / 9 },
    capaCarga: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
    controles: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly' },
    botonPrincipal: {
      width: 72,
      height: 72,
      borderRadius: Radius.full,
      backgroundColor: Colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    botonSecundario: {
      minWidth: 72,
      minHeight: 56,
      borderRadius: Radius.lg,
      backgroundColor: Colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.md,
      gap: 2,
    },
    botonTexto: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primaryDark },
    avance: { gap: Spacing.xs },
    avanceTexto: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textMuted },
    nota: { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 17 },
    avisoRed: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.warningSoft, borderRadius: Radius.md, padding: Spacing.sm },
    avisoRedTexto: { flex: 1, fontSize: FontSize.sm, color: Colors.text },
    estadoBox: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xl, paddingHorizontal: Spacing.lg },
    estadoTexto: { fontSize: FontSize.md, color: Colors.text, textAlign: 'center', lineHeight: 22 },
  });
