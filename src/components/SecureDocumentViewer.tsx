import { File, Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import * as ScreenCapture from 'expo-screen-capture';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedProgressBar } from './AnimatedProgressBar';

import { Button } from './Button';
import { ErrorState } from './ErrorState';
import { PdfViewer } from './PdfViewer';
import { SecurityWatermark } from './SecurityWatermark';
import { SkeletonBlock } from './SkeletonBlock';

import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useEstilos } from '@/theme/ThemeProvider';
import { API_URL } from '@/constants/config';
import type { ArchivoLocal } from '@/hooks/useDescargaDocumento';
import { useAuthStore } from '@/store/authStore';
import { mensajeParaErrorDescarga, porcentajeDescarga, statusDesdeErrorDescarga } from '@/utils/descargaDocumento';
import { extensionForSniffedType, isPreviewableSniffedType, sniffFileType, type SniffedFileType } from '@/utils/fileSniff';
import { logError } from '@/utils/errors';
import { uniqueTempFileName } from '@/utils/tempFileName';

export interface SecureDocumentViewerProps {
  /** Ruta relativa a la API (ej. `rhDocumentosApi.verPath(id)`) — nunca una URL absoluta expuesta al cliente. */
  path?: string;
  title: string;
  /**
   * Nombre del usuario RH + fecha/hora (AGENTS.md sección 11) — nunca datos
   * del colaborador dueño del documento. Omitir cuando el documento no
   * necesita marca de agua (ej. un colaborador viendo su propio contrato):
   * sin este prop, `SecurityWatermark` no se dibuja.
   */
  watermarkLabel?: string;
  onClose: () => void;
  /** Archivo que el llamador ya bajó (y conserva): el visor no descarga nada ni lo borra. */
  archivoLocal?: ArchivoLocal | null;
  /**
   * Obtención propia del archivo, para documentos que NO salen de un GET
   * (p. ej. la vista previa de la carta compromiso, que es un POST): debe
   * escribir el archivo en `destino` y devolverlo. Con este prop, `path` solo
   * identifica el documento (cambiarlo vuelve a cargar). Debe ser estable
   * (`useCallback`) para no recargar en cada render.
   */
  descargar?: (destino: File, signal: AbortSignal) => Promise<File>;
  /** El documento se dibujó de verdad (no al abrir ni al cerrar el visor). */
  onDibujado?: () => void;
  /** No se pudo dibujar (visor, archivo dañado o tipo sin vista previa). */
  onFalloVisualizacion?: (mensaje: string) => void;
}

/** Clave PROPIA de protección de captura — nunca la del hook global (`useAppPrivacyProtection`), para que ninguno libere la protección del otro por accidente (ver `expo-screen-capture`: las claves llevan cuenta independiente, `allowScreenCaptureAsync` de una clave nunca apaga la de otra mientras siga activa). */
const DOCUMENT_VIEWER_PROTECTION_KEY = 'mrlana-secure-document-viewer';

type ViewerStatus = 'loading' | 'ready' | 'error' | 'unsupported';

/**
 * Visor seguro reutilizable (AGENTS.md sección 11, generalizado en la
 * extensión "documents intelligence and hr tools", sección 32): PDF/JPG/PNG
 * vía streaming autenticado con Bearer (nunca la ruta física del NAS),
 * protección de captura de pantalla mientras está abierto y watermark
 * opcional. NUNCA guarda, comparte ni entrega el archivo a otra app: eso solo
 * existe en `DocumentoProtegido` modo `descarga`. Las pantallas no lo usan
 * directo: es el motor de los modos `consulta` y `firma`.
 *
 * Descarga a disco (auditoría de integración — "ARCHIVOS GRANDES"):
 * en vez de pedir el archivo completo como `ArrayBuffer` en JS (costoso en
 * memoria para PDFs de varios MB) se usa `File.createDownloadTask` de
 * expo-file-system — el cuerpo de la respuesta se escribe directo a disco
 * desde nativo, sin pasar por un buffer de JS completo. NUNCA se hace un
 * `HEAD` previo (puede fallar distinto al GET real con streamed responses/
 * proxy/NAS — sección 38 del encargo móvil): la descarga ES la verificación
 * de acceso. Cuando el servidor responde con un status distinto de 2xx, la
 * promesa de `downloadAsync()` se rechaza con un error cuyo mensaje incluye
 * el código HTTP real (`statusFromDownloadError()`), así que el status se
 * puede distinguir sin necesidad de un segundo request. El tipo de archivo
 * se determina leyendo la firma binaria del archivo YA en disco (nunca
 * confiar en `Content-Type` ni en la extensión del título), y el archivo se
 * renombra a su extensión real antes de mostrarlo — necesario para que el
 * visor de PDF nativo de Android/iOS reconozca `file://...pdf` dentro del
 * WebView.
 */
export function SecureDocumentViewer({ path, title, watermarkLabel, onClose, archivoLocal, descargar, onDibujado, onFalloVisualizacion }: SecureDocumentViewerProps) {
  const styles = useEstilos(crearEstilos);
  const token = useAuthStore((state) => state.token);
  const expirarSesion = useAuthStore((state) => state.expirarSesion);
  const previsualizable = archivoLocal ? isPreviewableSniffedType(archivoLocal.tipo) : false;
  const [status, setStatus] = useState<ViewerStatus>(archivoLocal ? (previsualizable ? 'ready' : 'unsupported') : 'loading');
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [fileUri, setFileUri] = useState<string | null>(archivoLocal?.uri ?? null);
  const [sniffedType, setSniffedType] = useState<SniffedFileType | null>(archivoLocal?.tipo ?? null);
  const [progreso, setProgreso] = useState<number | null>(null);
  /** El archivo bajó bien pero el visor (pdf.js / WebView) no pudo dibujarlo. */
  const [vistaPreviaFallo, setVistaPreviaFallo] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    void ScreenCapture.preventScreenCaptureAsync(DOCUMENT_VIEWER_PROTECTION_KEY);
    return () => {
      void ScreenCapture.allowScreenCaptureAsync(DOCUMENT_VIEWER_PROTECTION_KEY);
    };
  }, []);

  const avisarFallo = useCallback(
    (mensaje: string) => {
      setVistaPreviaFallo(true);
      onFalloVisualizacion?.(mensaje);
    },
    [onFalloVisualizacion],
  );

  const tieneArchivoPropio = Boolean(archivoLocal);

  useEffect(() => {
    if (tieneArchivoPropio) return undefined;
    let cancelled = false;
    let downloadedFile: File | null = null;
    const controller = new AbortController();

    (async () => {
      setStatus('loading');
      setProgreso(null);
      setVistaPreviaFallo(false);
      try {
        // Descarga real, directo a disco, sin ArrayBuffer completo en JS.
        const tempFile = new File(Paths.cache, uniqueTempFileName('bin'));
        // Se guarda la referencia ANTES de `downloadAsync()`, no después:
        // si el componente se desmonta (o `path` cambia) a mitad de la
        // descarga, `controller.abort()` corta la transferencia pero el
        // archivo parcial ya escrito en disco seguía sin nadie que lo
        // borrara — `downloadedFile` solo se asignaba una vez que la
        // promesa resolvía, y una descarga abortada nunca resuelve. Bug
        // corregido en la sincronización 2026-09-15 (sección 10).
        downloadedFile = tempFile;
        const downloaded = descargar
          ? await descargar(tempFile, controller.signal)
          : await File.createDownloadTask(`${API_URL}${path}`, tempFile, {
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
              signal: controller.signal,
              onProgress: ({ bytesWritten, totalBytes }) => {
                if (!cancelled) setProgreso(porcentajeDescarga(bytesWritten, totalBytes));
              },
            }).downloadAsync();
        if (cancelled) return;
        if (!downloaded || downloaded.size === 0) {
          throw new Error('El archivo descargado está vacío.');
        }
        downloadedFile = downloaded;

        // Nunca confiar en extensión/Content-Type: se reconoce el tipo
        // real por firma binaria, leyendo solo los primeros bytes.
        const head = new Uint8Array(await downloaded.slice(0, 8).arrayBuffer());
        const sniffed = sniffFileType(head);

        // Renombra a la extensión real (necesario para que el WebView
        // reconozca un PDF local por su extensión).
        const finalFile = new File(Paths.cache, uniqueTempFileName(extensionForSniffedType(sniffed)));
        await downloaded.move(finalFile);
        downloadedFile = finalFile;

        if (cancelled) return;
        setSniffedType(sniffed);

        // Bug corregido en la sincronización 2026-09-15: antes, un tipo no
        // reconocido (p. ej. un DOCX, que el sniffer no distinguía) cortaba
        // aquí con `return` ANTES de `setFileUri()` — el archivo quedaba
        // descargado en disco pero la UI nunca se enteraba.
        //
        // El tamaño ya se validó (`size === 0` lanzó arriba) y la descarga
        // completa tuvo éxito (un status no-2xx ya habría rechazado la
        // promesa más arriba): un archivo no-vacío que no es PDF/PNG/JPEG
        // sigue siendo un archivo VÁLIDO, solo que este visor no sabe
        // dibujarlo (p. ej. DOCX). Estados conceptuales:
        //   - previewable      → PDF/PNG/JPEG: se dibuja en el visor.
        //   - downloadable-only → cualquier otro tipo no vacío (DOCX,
        //     binarios no reconocidos): este visor no lo dibuja.
        //   - invalid          → 0 bytes/corrupto: ya se descartó arriba,
        //     nunca llega a tener `fileUri`.
        setFileUri(finalFile.uri);
        setStatus(isPreviewableSniffedType(sniffed) ? 'ready' : 'unsupported');
      } catch (error) {
        if (cancelled) return;
        logError('SecureDocumentViewer', error);
        if (statusDesdeErrorDescarga(error) === 401) void expirarSesion();
        setErrorMessage(mensajeParaErrorDescarga(error));
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      // Si el componente se desmonta (o `path` cambia) a media descarga, no
      // tiene sentido seguir bajando un documento que ya nadie va a ver —
      // libera la conexión/memoria de inmediato en vez de dejar que
      // termine en segundo plano (AGENTS.md: "requests sin cancelar").
      controller.abort();
      try {
        downloadedFile?.delete();
      } catch {
        // No crítico: el sistema operativo limpia `Paths.cache` eventualmente.
      }
    };
  }, [tieneArchivoPropio, path, token, retryCount, expirarSesion, descargar]);

  // Un tipo sin vista previa no se «abrió»: quien espera el dibujo debe saberlo.
  useEffect(() => {
    if (status === 'unsupported') onFalloVisualizacion?.('Este archivo no puede mostrarse en la app.');
  }, [status, onFalloVisualizacion]);

  const isPdf = sniffedType === 'pdf';

  const sinVistaPrevia = status === 'unsupported' || vistaPreviaFallo;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.headerActions}>
          <Button title="Cerrar" variant="ghost" onPress={onClose} fullWidth={false} leftIcon="close" style={styles.closeButton} />
        </View>
      </View>

      <View style={styles.viewerArea}>
        {status === 'loading' ? (
          <View style={styles.padded} accessibilityLiveRegion="polite" accessibilityLabel="Descargando documento">
            <View style={styles.progressRow}>
              <Text style={styles.progressText}>Descargando documento…</Text>
              {progreso !== null ? <Text style={styles.progressText}>{progreso}%</Text> : null}
            </View>
            {progreso !== null ? <AnimatedProgressBar percent={progreso} height={6} /> : null}
            <SkeletonBlock height={420} radius={Radius.lg} />
          </View>
        ) : status === 'error' ? (
          <ErrorState message={errorMessage} onRetry={() => setRetryCount((c) => c + 1)} />
        ) : sinVistaPrevia ? (
          <View style={styles.unsupportedBox}>
            <Text style={styles.unsupportedText}>Este archivo no puede mostrarse en este teléfono.</Text>
            <Text style={styles.unsupportedHint}>Consúltalo en el portal web de PEOPLE.</Text>
          </View>
        ) : fileUri && isPdf ? (
          // iOS: visor nativo de WKWebView. Android: pdf.js (su WebView no
          // dibuja PDFs). Si falla, se avisa: el visor nunca saca el archivo de la app.
          <PdfViewer fileUri={fileUri} style={styles.webview} onError={avisarFallo} onRendered={onDibujado} />
        ) : fileUri ? (
          // Sin caché: por defecto expo-image guarda una copia en disco que sobreviviría al cerrar.
          <Image source={{ uri: fileUri }} cachePolicy="none" style={styles.image} contentFit="contain" accessibilityLabel={title} onLoad={() => onDibujado?.()} onError={() => avisarFallo('No se pudo mostrar este documento en este teléfono.')} />
        ) : null}

        {status === 'ready' && !vistaPreviaFallo && watermarkLabel ? <SecurityWatermark label={watermarkLabel} /> : null}
      </View>

    </SafeAreaView>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
    marginRight: Spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    minHeight: 36,
  },
  viewerArea: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  padded: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  webview: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  image: {
    flex: 1,
  },
  unsupportedBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  unsupportedText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
  },
  unsupportedHint: {
    fontSize: FontSize.sm,
    color: Colors.skeleton,
    textAlign: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  progressText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.white,
  },
});
