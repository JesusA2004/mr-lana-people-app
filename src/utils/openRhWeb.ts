import { Linking } from 'react-native';

import { RH_WEB_URL } from '@/constants/config';
import { toast } from '@/store/toastStore';
import { logError } from '@/utils/errors';

/**
 * Procesos que el backend resuelve SOLO en el Portal RH web (finiquitos,
 * headcount, matriz comercial, configuración de formatos, reclutamiento
 * completo, reportes, administración). No son un error de la app: son
 * administración pesada que a propósito no se llevó a móvil (secciones
 * 24/27/56 del encargo).
 *
 * Nunca se agregan token ni credenciales a la URL: el navegador abre el
 * portal y el usuario inicia sesión ahí por su cuenta.
 */
export async function openRhWeb(path?: string): Promise<void> {
  const base = RH_WEB_URL.replace(/\/+$/, '');
  const suffix = path ? `/${path.replace(/^\/+/, '')}` : '';
  const url = `${base}${suffix}`;

  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      toast.error('No pudimos abrir el Portal RH en este dispositivo.');
      return;
    }
    await Linking.openURL(url);
  } catch (error) {
    logError('openRhWeb', error);
    toast.error('No pudimos abrir el Portal RH. Intenta desde tu navegador.');
  }
}

/** Ruta web del detalle de una solicitud en el Portal RH. */
export function rhWebSolicitudPath(id: number | string): string {
  return `rh/solicitudes/${id}`;
}
