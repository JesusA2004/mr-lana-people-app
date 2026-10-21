import { File, Paths } from 'expo-file-system';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { apiClient } from '@/api/client';
import { BarraAccionInferior } from './BarraAccionInferior';
import { Button } from './Button';
import { DescargaDocumento } from './DescargaDocumento';
import { ErrorState } from './ErrorState';
import { PressableScale } from './PressableScale';
import { SkeletonBlock } from './SkeletonBlock';

import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { API_URL } from '@/constants/config';
import { useAuthStore } from '@/store/authStore';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import { getErrorMessage, logError } from '@/utils/errors';
import { construirHtmlVisorPdfPaginado, partirEnTrozos } from '@/utils/pdfViewerHtml';
import { Ionicons } from '@expo/vector-icons';

const ZOOMS = [1, 1.5, 2] as const;

export interface VisorPdfPaginadoProps {
  /** Ruta relativa a la API (con Bearer); nunca una URL pública. */
  path: string;
  /** Nombre del archivo en caché (mismo documento = no se vuelve a descargar). */
  cacheName: string;
  titulo: string;
  paginaInicial?: number;
  /** Se llama cuando una página QUEDÓ DIBUJADA en pantalla (no al pedirla). */
  onPagina?: (numero: number, total: number) => void;
  /** Acción que reemplaza a «Siguiente» en la última página (p. ej. «Terminé la inducción»). */
  accionFinal?: ReactNode;
  /** Texto discreto entre Anterior y Siguiente (p. ej. «Te faltan 3 páginas»). */
  nota?: string | null;
}

/**
 * Visor del PDF REAL, una página a la vez (pdf.js empaquetado en un
 * WebView, sin red): «Página X de N», zoom, Anterior/Siguiente. Lo usa la
 * inducción (mismo PDF oficial que la web) — nunca se reconstruye el
 * documento en componentes nativos.
 */
export function VisorPdfPaginado({ path, cacheName, titulo, paginaInicial = 1, onPagina, accionFinal, nota }: VisorPdfPaginadoProps) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const token = useAuthStore((state) => state.token);
  const webviewRef = useRef<WebView>(null);
  const base64Ref = useRef<string | null>(null);
  const listoRef = useRef(false);
  const enviadoRef = useRef(false);
  const html = useMemo(() => construirHtmlVisorPdfPaginado(), []);
  const [total, setTotal] = useState(0);
  const [actual, setActual] = useState(Math.max(1, paginaInicial));
  const [zoom, setZoom] = useState<(typeof ZOOMS)[number]>(1);
  const [dibujando, setDibujando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  /** pdf.js no pudo DIBUJAR el archivo (ya descargado): se ofrece descargarlo / abrirlo con otra app. */
  const [errorDibujo, setErrorDibujo] = useState(false);

  const onPaginaRef = useRef(onPagina);
  useEffect(() => {
    onPaginaRef.current = onPagina;
  }, [onPagina]);

  const enviarSiListo = () => {
    const base64 = base64Ref.current;
    const webview = webviewRef.current;
    if (!listoRef.current || base64 === null || webview === null || enviadoRef.current) return;
    enviadoRef.current = true;
    const trozos = partirEnTrozos(base64);
    trozos.forEach((data, index) => webview.postMessage(JSON.stringify({ type: 'chunk', index, data })));
    webview.postMessage(JSON.stringify({ type: 'end', total: trozos.length }));
  };

  // Descarga autenticada (una sola vez por documento: queda en caché).
  useEffect(() => {
    let cancelado = false;
    const controller = new AbortController();
    base64Ref.current = null;
    enviadoRef.current = false;

    (async () => {
      try {
        const destino = new File(Paths.cache, cacheName);
        if (!destino.exists || destino.size === 0) {
          // Mismo pipeline de errores que el resto de la app (401/403/409…).
          await apiClient.head(path, { signal: controller.signal });
          const tarea = File.createDownloadTask(`${API_URL}${path}`, destino, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            signal: controller.signal,
          });
          await tarea.downloadAsync();
        }
        if (cancelado) return;
        const base64 = await destino.base64();
        if (!base64) throw new Error('PDF vacío');
        base64Ref.current = base64;
        enviarSiListo();
      } catch (err) {
        if (cancelado) return;
        logError('VisorPdfPaginado', err);
        try {
          new File(Paths.cache, cacheName).delete();
        } catch {
          // Sin archivo parcial que borrar.
        }
        setError(getErrorMessage(err));
      }
    })();

    return () => {
      cancelado = true;
      controller.abort();
      base64Ref.current = null;
    };
  }, [path, cacheName, token, intento]);

  const pedirPagina = (numero: number, escala: number) => {
    setDibujando(true);
    webviewRef.current?.postMessage(JSON.stringify({ type: 'page', numero, zoom: escala }));
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    let data: { type?: string; message?: string; pages?: number; numero?: number } = {};
    try {
      data = JSON.parse(event.nativeEvent.data) as typeof data;
    } catch {
      return;
    }
    if (data.type === 'ready') {
      listoRef.current = true;
      enviarSiListo();
    } else if (data.type === 'loaded' && data.pages) {
      const paginas = data.pages;
      setTotal(paginas);
      const inicio = Math.min(Math.max(1, paginaInicial), paginas);
      setActual(inicio);
      pedirPagina(inicio, zoom);
    } else if (data.type === 'shown' && data.numero) {
      setDibujando(false);
      onPaginaRef.current?.(data.numero, total);
    } else if (data.type === 'error') {
      logError('VisorPdfPaginado', new Error(data.message ?? 'pdf.js'));
      setError('No se pudo mostrar el documento en este teléfono.');
      setErrorDibujo(true);
    }
  };

  const ir = (numero: number) => {
    if (numero < 1 || numero > total || numero === actual) return;
    setActual(numero);
    pedirPagina(numero, zoom);
  };

  const cambiarZoom = (direccion: 1 | -1) => {
    const i = ZOOMS.indexOf(zoom);
    const siguiente = ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, i + direccion))];
    if (siguiente === zoom) return;
    setZoom(siguiente);
    pedirPagina(actual, siguiente);
  };

  if (error) {
    return (
      <View style={styles.errorBox}>
        {errorDibujo ? (
          <DescargaDocumento
            titulo={titulo}
            path={path}
            motivo="No se pudo mostrar la vista previa en este teléfono. Descárgalo o ábrelo con otra aplicación."
          />
        ) : (
          <ErrorState
            message={error}
            onRetry={() => {
              listoRef.current = false;
              setError(null);
              setIntento((n) => n + 1);
            }}
          />
        )}
      </View>
    );
  }

  const esUltima = total > 0 && actual === total;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.titulo} numberOfLines={1}>
            {titulo}
          </Text>
          <Text style={styles.pagina} accessibilityLiveRegion="polite">
            {total ? `Página ${actual} de ${total}` : 'Abriendo documento…'}
          </Text>
        </View>
        <PressableScale accessibilityRole="button" accessibilityLabel="Alejar" disabled={zoom === ZOOMS[0]} onPress={() => cambiarZoom(-1)} style={styles.iconButton}>
          <Ionicons name="remove" size={20} color={zoom === ZOOMS[0] ? Colors.textMuted : Colors.text} />
        </PressableScale>
        <Text style={styles.zoom}>{Math.round(zoom * 100)}%</Text>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Acercar"
          disabled={zoom === ZOOMS[ZOOMS.length - 1]}
          onPress={() => cambiarZoom(1)}
          style={styles.iconButton}>
          <Ionicons name="add" size={20} color={zoom === ZOOMS[ZOOMS.length - 1] ? Colors.textMuted : Colors.text} />
        </PressableScale>
      </View>

      <View style={styles.flex}>
        <WebView
          ref={webviewRef}
          source={{ html, baseUrl: 'about:blank' }}
          originWhitelist={['about:*']}
          javaScriptEnabled
          domStorageEnabled={false}
          allowFileAccess={false}
          setSupportMultipleWindows={false}
          onShouldStartLoadWithRequest={(request) => request.url.startsWith('about:')}
          onMessage={handleMessage}
          style={styles.webview}
        />
        {total === 0 ? (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <SkeletonBlock height={420} radius={Radius.lg} />
          </View>
        ) : null}
      </View>

      {/* Barra inferior común: respeta la barra de navegación del teléfono (safe area). */}
      <BarraAccionInferior sobreTeclado={false} style={styles.barra}>
        <View style={styles.footer}>
          <Button title="Anterior" variant="outline" fullWidth={false} leftIcon="chevron-back" disabled={actual <= 1 || total === 0 || dibujando} onPress={() => ir(actual - 1)} />
          <Text style={styles.nota} numberOfLines={2}>
            {nota ?? ''}
          </Text>
          {esUltima && accionFinal ? (
            accionFinal
          ) : (
            <Button title="Siguiente" fullWidth={false} rightIcon="chevron-forward" disabled={esUltima || total === 0 || dibujando} onPress={() => ir(actual + 1)} />
          )}
        </View>
      </BarraAccionInferior>
    </View>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    flex: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
      backgroundColor: Colors.surface,
    },
    headerText: {
      flex: 1,
    },
    titulo: {
      fontSize: FontSize.md,
      fontWeight: '700',
      color: Colors.text,
    },
    pagina: {
      fontSize: FontSize.xs,
      color: Colors.textMuted,
    },
    iconButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radius.md,
    },
    zoom: {
      minWidth: 40,
      textAlign: 'center',
      fontSize: FontSize.xs,
      color: Colors.text,
    },
    webview: {
      flex: 1,
      backgroundColor: Colors.surfaceMuted,
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFill,
      padding: Spacing.lg,
    },
    barra: {
      paddingTop: Spacing.sm,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    nota: {
      flex: 1,
      textAlign: 'center',
      fontSize: FontSize.xs,
      color: Colors.textMuted,
    },
    errorBox: {
      flex: 1,
      padding: Spacing.lg,
    },
  });
