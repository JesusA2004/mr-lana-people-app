import { supportsRemotePush } from './runtime';

/**
 * Badge del ícono de la app = notificaciones no leídas (V4 sección 19).
 * Best-effort: no todas las plataformas lo soportan (Android depende del
 * launcher del fabricante) y nunca debe romper nada si falla. Importa
 * `expo-notifications` dinámicamente — mismo criterio que el resto del
 * módulo de push, nunca a nivel de archivo para no arrastrarlo a Expo Go.
 */
export async function setBadgeCount(count: number): Promise<void> {
  if (!supportsRemotePush) return;
  try {
    const Notifications = await import('expo-notifications');
    await Notifications.setBadgeCountAsync(Math.max(0, count));
  } catch {
    // Silencioso a propósito: el badge es una mejora visual, no una garantía de plataforma.
  }
}
