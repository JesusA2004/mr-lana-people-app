import { File, Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import * as ScreenCapture from 'expo-screen-capture';
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
import { getErrorMessage, logError } from '@/utils/errors';

export interface SecureDocumentViewerProps {
  /** Ruta relativa a la API (ej. `rhDocumentosApi.verPath(id)`) — nunca una URL absoluta expuesta al cliente. */
  path: string;
  title: string;
  /** Nombre del usuario RH + fecha/hora (AGENTS.md sección 11) — nunca datos del colaborador dueño del documento. */
  watermarkLabel: string;
  onClose: () => void;
}

function extensionForMime(mime: string): string {
  if (mime.includes('pdf')) return 'pdf';
  if (mime.includes('png')) return 'png';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  return 'bin';
}

/**
 * Visor seguro dentro de la app (AGENTS.md sección 11): PDF/JPG/PNG vía
 * streaming autenticado con Bearer (nunca la ruta física del NAS), sin
 * descargar/compartir/guardar, protección de captura de pantalla mientras
 * está abierto, y watermark discreto. El archivo se escribe a un temporal
 * en `Paths.cache` solo para poder pintarlo (Image/WebView necesitan una
 * URI) y se borra al cerrar — nunca queda persistido.
 */
export function SecureDocumentViewer({ path, title, watermarkLabel, onClose }: SecureDocumentViewerProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState('');

  useEffect(() => {
    void ScreenCapture.preventScreenCaptureAsync();
    return () => {
      void ScreenCapture.allowScreenCaptureAsync();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let localFile: File | null = null;
    const controller = new AbortController();

    (async () => {
      setStatus('loading');
      try {
        const response = await apiClient.get(path, { responseType: 'arraybuffer', signal: controller.signal });
        if (cancelled) return;

        const contentType = (response.headers?.['content-type'] as string | undefined) ?? 'application/octet-stream';
        const extension = extensionForMime(contentType);
        localFile = new File(Paths.cache, `mrlana-doc-${Date.now()}.${extension}`);
        localFile.create();
        localFile.write(new Uint8Array(response.data as ArrayBuffer));

        setMimeType(contentType);
        setFileUri(localFile.uri);
        setStatus('ready');
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
        localFile?.delete();
      } catch {
        // No crítico: el sistema operativo limpia `Paths.cache` eventualmente.
      }
    };
  }, [path]);

  const isPdf = mimeType.includes('pdf');

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Button title="Cerrar" variant="ghost" onPress={onClose} fullWidth={false} leftIcon="close" style={styles.closeButton} />
      </View>

      <View style={styles.viewerArea}>
        {status === 'loading' ? (
          <View style={styles.padded}>
            <SkeletonBlock height={420} radius={Radius.lg} />
          </View>
        ) : status === 'error' ? (
          <ErrorState message={errorMessage} />
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

        {status === 'ready' ? <SecurityWatermark label={watermarkLabel} /> : null}
      </View>
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
});
