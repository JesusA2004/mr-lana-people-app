import { Colors } from '@/constants/colors';
import type { NotificationColor, NotificationItem } from '@/types/notification';

/**
 * Traducción de la paleta CERRADA que manda el backend
 * (`NotificacionesService::ESTILOS`: success/info/warning/danger/
 * celebracion/neutral) a tokens de diseño de la app.
 *
 * El backend también expone un hexadecimal de referencia
 * (`colorHexPara()`), pero NO es la autoridad visual de la app: el mismo
 * aviso debe verse con los colores de MR. LANA PEOPLE aquí y con los de
 * Tailwind en la web. Un color desconocido cae en `neutral` — nunca truena
 * ni deja una notificación sin estilo (sección 55).
 */

export interface NotificationStyle {
  emoji: string;
  color: string;
  background: string;
}

const FALLBACK: NotificationStyle = {
  emoji: '🔔',
  color: Colors.neutral,
  background: Colors.neutralSoft,
};

const BY_COLOR: Record<string, { color: string; background: string }> = {
  success: { color: Colors.success, background: Colors.successSoft },
  info: { color: Colors.info, background: Colors.infoSoft },
  warning: { color: Colors.warning, background: Colors.warningSoft },
  danger: { color: Colors.danger, background: Colors.dangerSoft },
  celebracion: { color: Colors.celebration, background: Colors.celebrationSoft },
  neutral: { color: Colors.neutral, background: Colors.neutralSoft },
};

export function notificationPalette(color: NotificationColor | undefined): { color: string; background: string } {
  if (!color) return { color: FALLBACK.color, background: FALLBACK.background };
  return BY_COLOR[color] ?? { color: FALLBACK.color, background: FALLBACK.background };
}

/**
 * Estilo completo de una notificación. El emoji viene resuelto del backend
 * y se usa tal cual — la app ya no mantiene un ícono propio por cada tipo
 * (sección 54); solo pone 🔔 cuando el backend no mandó ninguno.
 */
export function notificationStyle(item: Pick<NotificationItem, 'emoji' | 'color'>): NotificationStyle {
  const palette = notificationPalette(item.color);
  return {
    emoji: item.emoji && item.emoji.trim().length > 0 ? item.emoji : FALLBACK.emoji,
    ...palette,
  };
}
