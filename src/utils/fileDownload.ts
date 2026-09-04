import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { API_URL } from '@/constants/config';

/**
 * Descarga un archivo protegido por Bearer token a la caché local y lo abre
 * con el visor/compartir nativo del sistema (funciona tanto para PDF como
 * para imágenes sin necesitar una librería de visor embebido). El archivo
 * nunca se guarda de forma permanente (AGENTS.md sección 48): vive en el
 * directorio de caché, que el sistema puede limpiar en cualquier momento.
 */
export async function downloadAndOpenFile(path: string, token: string | null, fileName: string): Promise<void> {
  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  const directory = new Directory(Paths.cache, 'mrlana-documentos');
  if (!directory.exists) {
    directory.create({ intermediates: true });
  }

  const destination = new File(directory, fileName);
  if (destination.exists) {
    destination.delete();
  }

  const downloaded = await File.downloadFileAsync(url, destination, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    idempotent: true,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(downloaded.uri);
  }
}
