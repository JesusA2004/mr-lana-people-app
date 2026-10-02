import { File } from 'expo-file-system';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { SkeletonBlock } from './SkeletonBlock';

import { Colors, FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useEstilos } from '@/theme/ThemeProvider';
import { construirHtmlVisorPdf, partirEnTrozos } from '@/utils/pdfViewerHtml';
import { logError } from '@/utils/errors';

/**
 * Dibuja un PDF local (`file://…pdf`, ya descargado/validado por quien lo
 * usa).
 *
 * - iOS: WKWebView trae visor de PDF nativo → se abre el archivo directo.
 * - Android: su WebView NO dibuja PDFs (antes la pantalla quedaba en negro).
 *   Se usa pdf.js EMPAQUETADO en la app (`src/vendor/pdfjs.generated.ts`):
 *   funciona sin internet y con CDNs bloqueados. El PDF nunca sale del
 *   teléfono: se lee del disco y se pasa al WebView en trozos por
 *   `postMessage` (un PDF de 10+ MB no se incrusta en el HTML).
 */
export function PdfViewer({ fileUri, style, onError }: { fileUri: string; style?: StyleProp<ViewStyle>; onError?: (message: string) => void }) {
  const styles = useEstilos(crearEstilos);
  if (Platform.OS === 'ios') {
    return (
      <WebView
        source={{ uri: fileUri }}
        originWhitelist={['file://*']}
        allowFileAccess
        allowingReadAccessToURL={fileUri}
        javaScriptEnabled={false}
        style={[styles.webview, style]}
      />
    );
  }

  return <AndroidPdfViewer fileUri={fileUri} style={style} onError={onError} />;
}

const MENSAJE_ERROR = 'No se pudo mostrar este documento. Puedes guardarlo o compartirlo para abrirlo con otra aplicación.';

function AndroidPdfViewer({ fileUri, style, onError }: { fileUri: string; style?: StyleProp<ViewStyle>; onError?: (message: string) => void }) {
  const styles = useEstilos(crearEstilos);
  const webviewRef = useRef<WebView>(null);
  const base64Ref = useRef<string | null>(null);
  const listoRef = useRef(false);
  const enviadoRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const html = useMemo(() => construirHtmlVisorPdf(), []);

  // Un callback inline del padre no debe volver a leer el archivo en cada render.
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const fallar = (detalle: unknown) => {
    logError('PdfViewer', detalle instanceof Error ? detalle : new Error(String(detalle)));
    setError(MENSAJE_ERROR);
    setCargando(false);
    onErrorRef.current?.(MENSAJE_ERROR);
  };

  // Envía el PDF en cuanto el WebView avisó que pdf.js está listo Y el
  // archivo ya se leyó (cualquiera de los dos puede terminar primero).
  const enviarSiListo = () => {
    const base64 = base64Ref.current;
    const webview = webviewRef.current;
    if (!listoRef.current || base64 === null || webview === null || enviadoRef.current) return;
    enviadoRef.current = true;
    const trozos = partirEnTrozos(base64);
    trozos.forEach((data, index) => webview.postMessage(JSON.stringify({ type: 'chunk', index, data })));
    webview.postMessage(JSON.stringify({ type: 'end', total: trozos.length }));
  };

  useEffect(() => {
    let cancelado = false;
    base64Ref.current = null;
    enviadoRef.current = false;

    (async () => {
      try {
        const base64 = await new File(fileUri).base64();
        if (cancelado) return;
        if (!base64) throw new Error('PDF vacío');
        base64Ref.current = base64;
        enviarSiListo();
      } catch (err) {
        if (!cancelado) fallar(err);
      }
    })();

    return () => {
      cancelado = true;
      base64Ref.current = null;
    };
  }, [fileUri]);

  const handleMessage = (event: WebViewMessageEvent) => {
    let data: { type?: string; message?: string } = {};
    try {
      data = JSON.parse(event.nativeEvent.data) as typeof data;
    } catch {
      return;
    }
    if (data.type === 'ready') {
      listoRef.current = true;
      enviarSiListo();
    } else if (data.type === 'rendered') {
      setCargando(false);
    } else if (data.type === 'error') {
      fallar(data.message ?? 'pdf.js');
    }
  };

  if (error) {
    return (
      <View style={[styles.errorBox, style]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.flex, style]}>
      <WebView
        ref={webviewRef}
        source={{ html, baseUrl: 'about:blank' }}
        originWhitelist={['about:*']}
        javaScriptEnabled
        domStorageEnabled={false}
        allowFileAccess={false}
        setSupportMultipleWindows={false}
        // Sin red: el visor no carga nada de fuera (pdf.js va dentro del HTML).
        onShouldStartLoadWithRequest={(request) => request.url.startsWith('about:')}
        onMessage={handleMessage}
        style={styles.webview}
      />
      {cargando ? (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <SkeletonBlock height={420} radius={Radius.lg} />
        </View>
      ) : null}
    </View>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
  flex: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    padding: Spacing.lg,
  },
  errorBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  errorText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
  },
});
