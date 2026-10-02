import { File } from 'expo-file-system';
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { SkeletonBlock } from './SkeletonBlock';

import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { logError } from '@/utils/errors';

/**
 * Dibuja un PDF local (`file://…pdf`, ya descargado/validado por quien lo
 * usa).
 *
 * - iOS: el WebView (WKWebView) trae visor de PDF nativo → se abre el
 *   archivo directo.
 * - Android: el WebView de Android NO tiene visor de PDF — abrir un
 *   `file://…pdf` deja la pantalla en negro (era el bug de "abrir documento
 *   se pone en negro"). Ahí se pinta con pdf.js: el PDF viaja como base64
 *   dentro del HTML (nunca sale del teléfono) y pdf.js lo dibuja página por
 *   página en canvas.
 */
export function PdfViewer({ fileUri, style, onError }: { fileUri: string; style?: StyleProp<ViewStyle>; onError?: (message: string) => void }) {
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

const PDFJS_VERSION = '3.11.174';
const PDFJS_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
const PDFJS_WORKER_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

function AndroidPdfViewer({ fileUri, style, onError }: { fileUri: string; style?: StyleProp<ViewStyle>; onError?: (message: string) => void }) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Ref: un callback inline del padre no debe volver a leer el archivo en cada render.
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const base64 = await new File(fileUri).base64();
        if (cancelled) return;
        setHtml(buildHtml(base64));
      } catch (err) {
        if (cancelled) return;
        logError('PdfViewer.leer', err);
        setError('No se pudo leer el documento.');
        onErrorRef.current?.('No se pudo leer el documento.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fileUri]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as { type?: string; message?: string };
      if (data.type === 'error') {
        const message = 'No se pudo mostrar el documento. Revisa tu conexión e inténtalo de nuevo.';
        logError('PdfViewer.render', new Error(data.message ?? 'pdf.js'));
        setError(message);
        onErrorRef.current?.(message);
      }
    } catch {
      // Mensaje ajeno al visor: se ignora.
    }
  };

  if (error) {
    return (
      <View style={[styles.errorBox, style]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!html) {
    return (
      <View style={[styles.loading, style]}>
        <SkeletonBlock height={420} radius={Radius.lg} />
      </View>
    );
  }

  return (
    <WebView
      source={{ html, baseUrl: 'https://localhost/' }}
      originWhitelist={['https://*']}
      javaScriptEnabled
      domStorageEnabled={false}
      allowFileAccess={false}
      setSupportMultipleWindows={false}
      onMessage={handleMessage}
      onShouldStartLoadWithRequest={(request) => request.url === 'https://localhost/' || request.url.startsWith('about:')}
      style={[styles.webview, style]}
    />
  );
}

function buildHtml(base64: string): string {
  return `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
<style>
  html,body{margin:0;padding:0;background:#2b2b2b;}
  #paginas{display:flex;flex-direction:column;align-items:center;gap:8px;padding:8px 0;}
  canvas{background:#fff;max-width:100%;height:auto;box-shadow:0 1px 4px rgba(0,0,0,.4);}
  #estado{color:#ddd;font:14px sans-serif;text-align:center;padding:24px;}
</style>
<script src="${PDFJS_URL}"></script>
</head><body>
<div id="estado">Cargando documento…</div>
<div id="paginas"></div>
<script>
(function(){
  function avisar(tipo, mensaje){ if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({type: tipo, message: String(mensaje || '')})); }
  try {
    if (!window.pdfjsLib) { avisar('error', 'pdfjs no cargó'); return; }
    pdfjsLib.GlobalWorkerOptions.workerSrc = '${PDFJS_WORKER_URL}';
    var binario = atob('${base64}');
    var bytes = new Uint8Array(binario.length);
    for (var i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
    pdfjsLib.getDocument({ data: bytes }).promise.then(function(pdf){
      document.getElementById('estado').remove();
      var contenedor = document.getElementById('paginas');
      var ancho = Math.max(window.innerWidth - 16, 200);
      var escalaPantalla = window.devicePixelRatio || 1;
      var cadena = Promise.resolve();
      for (var n = 1; n <= pdf.numPages; n++) {
        (function(numero){
          cadena = cadena.then(function(){
            return pdf.getPage(numero).then(function(pagina){
              var base = pagina.getViewport({ scale: 1 });
              var escala = ancho / base.width;
              var vista = pagina.getViewport({ scale: escala * escalaPantalla });
              var canvas = document.createElement('canvas');
              canvas.width = vista.width; canvas.height = vista.height;
              canvas.style.width = (vista.width / escalaPantalla) + 'px';
              contenedor.appendChild(canvas);
              return pagina.render({ canvasContext: canvas.getContext('2d'), viewport: vista }).promise;
            });
          });
        })(n);
      }
      return cadena.then(function(){ avisar('listo'); });
    }).catch(function(e){ avisar('error', e && e.message); });
  } catch (e) { avisar('error', e && e.message); }
})();
</script>
</body></html>`;
}

const styles = StyleSheet.create({
  webview: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  loading: {
    flex: 1,
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
