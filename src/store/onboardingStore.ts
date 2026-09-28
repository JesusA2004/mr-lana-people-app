import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const ONBOARDING_KEY = 'mrlana-onboarding-completed';

function legacyKeyFor(userId: string | number): string {
  return `${ONBOARDING_KEY}:${userId}`;
}

interface OnboardingState {
  /** true mientras se lee el valor persistido; evita parpadeo del onboarding. */
  isLoading: boolean;
  completed: boolean;
  /**
   * Lee el onboarding global de la instalación. `userId` solo se usa para
   * migrar, una única vez, la llave del esquema anterior (por usuario) si
   * existiera — no cambia el alcance del dato en sí. Debe llamarse de nuevo
   * cada vez que cambia el usuario autenticado (login, restoreSession,
   * registro por QR) porque es cuando hay oportunidad de migrar.
   */
  load: (userId?: string | number | null) => Promise<void>;
  complete: () => Promise<void>;
}

/**
 * Persistencia local del onboarding, GLOBAL POR INSTALACIÓN/DISPOSITIVO (no
 * por usuario): la guía general de la app se muestra una única vez por
 * instalación y nunca vuelve a aparecer automáticamente al cambiar de
 * cuenta en el mismo teléfono — solo se puede volver a ver manualmente desde
 * Configuración → Ayuda → "Ver guía".
 *
 * Antes la llave incluía el `id` del usuario (`mrlana-onboarding-completed:{id}`)
 * para evitar que un colaborador nuevo heredara el onboarding ya visto por
 * otra cuenta en el mismo dispositivo. Se revirtió a una llave global a
 * petición explícita del negocio: el costo de mostrar la guía de nuevo a un
 * colaborador nuevo en un teléfono compartido es menor que el de mostrarla
 * en cada cambio de cuenta durante pruebas/uso normal. `load()` migra en
 * limpio: si la llave global no existe todavía pero la cuenta actual sí
 * tiene la llave antigua en `true`, se adopta como completado global y la
 * llave antigua se borra.
 */
export const useOnboardingStore = create<OnboardingState>((set) => ({
  isLoading: true,
  completed: false,

  async load(userId = null) {
    set({ isLoading: true });
    try {
      let value = await SecureStore.getItemAsync(ONBOARDING_KEY);
      if (value !== 'true' && userId !== null) {
        const legacy = await SecureStore.getItemAsync(legacyKeyFor(userId));
        if (legacy === 'true') {
          await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
          await SecureStore.deleteItemAsync(legacyKeyFor(userId));
          value = 'true';
        }
      }
      set({ completed: value === 'true', isLoading: false });
    } catch {
      set({ completed: false, isLoading: false });
    }
  },

  async complete() {
    set({ completed: true });
    try {
      await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
    } catch {
      // Si no se pudo persistir, el onboarding podría reaparecer en el
      // siguiente arranque — no es crítico, no debe romper la navegación.
    }
  },
}));
