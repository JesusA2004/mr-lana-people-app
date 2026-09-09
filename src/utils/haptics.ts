import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Punto único para disparar haptics — evita `import * as Haptics from
 * 'expo-haptics'` repetido en cada componente y centraliza el criterio de
 * "cuándo sí vibra la app" (solo acciones importantes, nunca por cualquier
 * toque — ver AGENTS.md sección 3). Todas las llamadas son best-effort:
 * nunca deben interrumpir un flujo si el haptic falla o no está disponible
 * (web, algunos Android).
 */
function safeCall(run: () => Promise<void>): void {
  if (Platform.OS === 'web') return;
  run().catch(() => {});
}

export const haptics = {
  /** Toque ligero — selección, tab, press de un elemento interactivo común. */
  tap(): void {
    safeCall(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },
  /** Confirmación de una acción completada con éxito (documento subido, solicitud enviada). */
  success(): void {
    safeCall(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },
  /** Advertencia — algo requiere atención pero no es un error duro. */
  warning(): void {
    safeCall(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
  },
  /** Error — una acción falló. */
  error(): void {
    safeCall(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
  },
  /** Selección dentro de un grupo (stepper, segmented control) — más discreto que `tap`. */
  selection(): void {
    safeCall(() => Haptics.selectionAsync());
  },
};
