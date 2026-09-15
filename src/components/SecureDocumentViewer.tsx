import { File, Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import * as ScreenCapture from 'expo-screen-capture';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { apiClient } from '@/api/client';
import { Button } from './Button';
import { ErrorState } from './ErrorState';
import { SecurityWatermark } from './SecurityWatermark';
import { SkeletonBlock } from './SkeletonBlock';

import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { API_URL } from '@/constants/config';
import { useAuthStore } from '@/store/authStore';
import { extensionForSniffedType, isPreviewableSniffedType, sniffFileType, type SniffedFileType } from '@/utils/fileSniff';
import { getErrorMessage, logError } from '@/utils/errors';
import { uniqueTempFileName } from '@/utils/tempFileName';

export interface SecureDocumentViewerProps {
  /** Ruta relativa a la API (ej. `rhDocumentosApi.verPath(id)`) — nunca una URL absoluta expuesta al cliente. */
  path: string;
  title: string;
  /**
   * Nombre del usuario RH + fecha/hora (AGENTS.md sección 11) — nunca datos
   * del colaborador dueño del documento. Omitir cuando el documento no
   * necesita marca de agua (ej. un colaborador viendo su propio contrato):
   * sin este prop, `SecurityWatermark` no se dibuja.
   */
  watermarkLabel?: string;
  onClose: () => void;
  /**
   * true solo cuando el backend ya autorizó descarga para este documento
   * concreto (`puede_descargar`/`acciones_permitidas` incluye `"download"`)
   * — nunca un botón de guardar/compartir incondicional (sección 33: RH
   * nunca descarga documentos internos por defecto). Reutiliza el archivo
   * ya descargado para el visor: abre el sheet nativo de compartir/guardar
   * (`expo-sharing`) en vez de una segunda descarga.
   */
  allowDownload?: boolean;
  /**
   * Nombre BASE (sin extensión) sugerido al guardar/compartir — la
   * extensión siempre es la real, detectada por firma binaria del archivo
   * (sección 73: nunca exponer UUID/ruta del NAS ni confiar en una
   * extensión que no se verificó). Usar `slugifyFilename()` para
   * construirlo.
   */
  downloadFileName?: string;
}

/** Clave PROPIA de protección de captura — nunca la del hook global (`useAppPrivacyProtection`), para que ninguno libere la protección del otro por accidente (ver `expo-screen-capture`: las claves llevan cuenta independiente, `allowScreenCaptureAsync` de una clave nunca apaga la de otra mientras siga activa). */
const DOCUMENT_VIEWER_PROTECTION_KEY = 'mrlana-secure-document-viewer';

type ViewerStatus = 'loading' | 'ready' | 'error' | 'unsupported';

/**
 * Visor seguro reutilizable (AGENTS.md sección 11, generalizado en la
 * extensión "documents intelligence and hr tools", sección 32): PDF/JPG/PNG
 * vía streaming autenticado con Bearer (nunca la ruta física del NAS),
 * protección de captura de pantalla mientras está abierto, watermark
 * opcional, y descarga opcional solo cuando el backend la autoriza
 * explícitamente. Usado por expediente colaborador/RH, adjuntos de
 * solicitud RH, formatos generados, documentos laborales y recibos de
 * nómina — un solo componente, nunca duplicado por tipo de documento.
 *
 * Descarga a disco (auditoría de integración — "ARCHIVOS GRANDES"):
 * en vez de pedir el archivo completo como `ArrayBuffer` en JS (costoso en
 * memoria para PDFs de varios MB) se usa `File.createDownloadTask` de
 * expo-file-system — el cuerpo de la respuesta se escribe directo a disco
 * desde nativo, sin pasar por un buffer de JS completo. Como esa API
 * nativa no expone el status HTTP ni los headers de la respuesta, primero
 * se hace un `HEAD` con el cliente axios normal (mismos interceptores de
 * siempre: 401 real cierra sesión, 403/404/etc. se normalizan igual que en
 * el resto de la app) — si el HEAD falla, nunca se llega a descargar nada.
 * El tipo de archivo se determina leyendo la firma binaria del archivo YA
 * en disco (nunca confiar en `Content-Type` ni en la extensión del
 * título), y el archivo se renombra a su extensión real antes de
 * mostrarlo — necesario para que el visor de PDF nativo de Android/iOS
 * reconozca `file://...pdf` dentro del WebView.
 */
export function SecureDocumentViewer({ path, title, watermarkLabel, onClose, allowDownload = false, downloadFileName }: SecureDocumentViewerProps) {
  const token = useAuthStore((state) => state.token);
  const [status, setStatus] = useState<ViewerStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [sniffedType, setSniffedType] = useState<SniffedFileType | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    void ScreenCapture.preventScreenCaptureAsync(DOCUMENT_VIEWER_PROTECTION_KEY);
    return () => {
      void ScreenCapture.allowScreenCaptureAsync(DOCUMENT_VIEWER_PROTECTION_KEY);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let downloadedFile: File | null = null;
    const controller = new AbortController();

    (async () => {
      setStatus('loading');
      try {
        // 1) Chequeo de acceso vía axios (mismo pipeline de interceptores
        // que el resto de la app: 401 real → cierra sesión, no un timeout
        // ni un error de red; 403/404/etc. → mensaje normalizado). Laravel
        // registra HEAD automáticamente para toda ruta GET, así que corre
        // las mismas verificaciones de permiso/alcance del controlador
        // antes de que el body se genere.
        await apiClient.head(path, { signal: controller.signal });
        if (cancelled) return;

        // 2) Descarga real, directo a disco, sin ArrayBuffer completo en JS.
        const tempFile = new File(Paths.cache, uniqueTempFileName('bin'));
        // Se guarda la referencia ANTES de `downloadAsync()`, no después:
        // si el componente se desmonta (o `path` cambia) a mitad de la
        // descarga, `controller.abort()` corta la transferencia pero el
        // archivo parcial ya escrito en disco seguía sin nadie que lo
        // borrara — `downloadedFile` solo se asignaba una vez que la
        // promesa resolvía, y una descarga abortada nunca resuelve. Bug
        // corregido en la sincronización 2026-09-15 (sección 10).
        downloadedFile = tempFile;
        const task = File.createDownloadTask(`${API_URL}${path}`, tempFile, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          signal: controller.signal,
        });
        const downloaded = await task.downloadAsync();
        if (cancelled) return;
        if (!downloaded || downloaded.size === 0) {
          throw new Error('El archivo descargado está vacío.');
        }
        downloadedFile = downloaded;

        // 3) Nunca confiar en extensión/Content-Type: se reconoce el tipo
        // real por firma binaria, leyendo solo los primeros bytes.
        const head = new Uint8Array(await downloaded.slice(0, 8).arrayBuffer());
        const sniffed = sniffFileType(head);

        // 4) Renombra a la extensión real (necesario para que el WebView
        // reconozca un PDF local por su extensión, y para que
        // "Guardar o compartir" ofrezca la extensión correcta).
        const finalFile = new File(Paths.cache, uniqueTempFileName(extensionForSniffedType(sniffed)));
        await downloaded.move(finalFile);
        downloadedFile = finalFile;

        if (cancelled) return;
        setSniffedType(sniffed);

        // Bug corregido en la sincronización 2026-09-15: antes, un tipo no
        // reconocido (p. ej. un DOCX, que el sniffer no distinguía) cortaba
        // aquí con `return` ANTES de `setFileUri()` — el archivo quedaba
        // descargado en disco pero la UI nunca se enteraba, así que
        // "Guardar o compartir" jamás aparecía para un documento
        // perfectamente válido.
        //
        // El tamaño ya se validó (`size === 0` lanzó arriba) y el HEAD +
        // la descarga completa tuvieron éxito: un archivo no-vacío que no
        // es PDF/PNG/JPEG sigue siendo un archivo VÁLIDO, solo que este
        // visor no sabe dibujarlo (p. ej. DOCX). Estados conceptuales:
        //   - previewable      → PDF/PNG/JPEG: se dibuja en el visor.
        //   - downloadable-only → cualquier otro tipo no vacío (DOCX,
        //     binarios no reconocidos): no se previsualiza, pero SIGUE
        //     pudiendo guardarse/compartirse si `allowDownload` lo permite.
        //   - invalid          → 0 bytes/corrupto: ya se descartó arriba,
        //     nunca llega a tener `fileUri`.
        setFileUri(finalFile.uri);
        setStatus(isPreviewableSniffedType(sniffed) ? 'ready' : 'unsupported');
      } catch (error) {
        if (cancelled) return;
        logError('SecureDocumentViewer', error);
        setErrorMessage(getErrorMessage(error));
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
  }, [path, token]);

  const handleSaveOrShare = async () => {
    if (!fileUri) return;
    setSharing(true);
    // Copia con nombre legible para compartir (ver abajo) — solo existe
    // mientras dura esta función. Se borra en el `finally`, nunca se deja
    // viviendo en `Paths.cache`: un contrato o recibo no debe quedar en
    // disco más tiempo del que tarda el sheet de compartir en abrirse
    // (sección 9 de esta sincronización).
    let sharedCopy: File | null = null;
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        logError('SecureDocumentViewer.saveOrShare', new Error('Sharing no disponible en este dispositivo'));
        return;
      }
      // No hay una API de "Descargar a la carpeta de descargas" multiplataforma
      // sin permisos adicionales de almacenamiento — el sheet nativo de
      // compartir/guardar es el mecanismo estándar de Expo para esto (deja
      // elegir "Guardar en archivos"/galería). Nunca se expone el Bearer
      // token ni la ruta física: el archivo ya está en el temporal local.
      // El botón dice "Guardar o compartir" (nunca "Descargar") porque
      // eso es exactamente lo que hace esta acción.
      let shareUri = fileUri;
      if (downloadFileName && sniffedType) {
        // Sharing.shareAsync usa el nombre del archivo tal cual está en
        // disco — se copia a un nombre legible sugerido justo antes de
        // compartir, nunca se usa ese nombre como path de trabajo interno
        // (ver `uniqueTempFileName`).
        const suggested = new File(Paths.cache, `${downloadFileName}.${extensionForSniffedType(sniffedType)}`);
        try {
          await new File(fileUri).copy(suggested);
          shareUri = suggested.uri;
          sharedCopy = suggested;
        } catch {
          // Si falla la copia (nombre inválido, etc.), comparte el archivo original.
        }
      }
      await Sharing.shareAsync(shareUri, { dialogTitle: title });
    } catch (error) {
      logError('SecureDocumentViewer.saveOrShare', error);
    } finally {
      setSharing(false);
      try {
        sharedCopy?.delete();
      } catch {
        // No crítico: el sistema operativo limpia Paths.cache eventualmente.
      }
    }
  };

  const isPdf = sniffedType === 'pdf';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.headerActions}>
          {allowDownload && status === 'ready' && fileUri ? (
            <Button
              title="Guardar o compartir"
              variant="ghost"
              onPress={() => void handleSaveOrShare()}
              loading={sharing}
              fullWidth={false}
              leftIcon="share-outline"
              style={styles.closeButton}
            />
          ) : null}
          <Button title="Cerrar" variant="ghost" onPress={onClose} fullWidth={false} leftIcon="close" style={styles.closeButton} />
        </View>
      </View>

      <View style={styles.viewerArea}>
        {status === 'loading' ? (
          <View style={styles.padded}>
            <SkeletonBlock height={420} radius={Radius.lg} />
          </View>
        ) : status === 'error' ? (
          <ErrorState message={errorMessage} />
        ) : status === 'unsupported' ? (
          <View style={styles.unsupportedBox}>
            <Text style={styles.unsupportedText}>Este archivo no puede previsualizarse.</Text>
            {allowDownload ? <Text style={styles.unsupportedHint}>Puedes guardarlo o compartirlo con &ldquo;Guardar o compartir&rdquo;.</Text> : null}
          </View>
        ) : fileUri && isPdf ? (
          <WebView
            source={{ uri: fileUri }}
            originWhitelist={['*']}
            allowFileAccess
            allowUniversalAccessFromFileURLs
            allowingReadAccessToURL={fileUri}
            style={styles.webview}
          />
        ) : fileUri ? (
          <Image source={{ uri: fileUri }} style={styles.image} contentFit="contain" accessibilityLabel={title} />
        ) : null}

        {status === 'ready' && watermarkLabel ? <SecurityWatermark label={watermarkLabel} /> : null}
      </View>

      {/* El botón de descarga cuando el archivo no pudo previsualizarse vive
          fuera del `viewerArea` para no competir con el mensaje de arriba. */}
      {status === 'unsupported' && allowDownload && fileUri ? (
        <View style={styles.unsupportedActions}>
          <Button title="Guardar o compartir" onPress={() => void handleSaveOrShare()} loading={sharing} leftIcon="share-outline" />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  unsupportedActions: {
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
