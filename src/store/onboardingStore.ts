import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const ONBOARDING_KEY = 'mrlana-onboarding-completed';

interface OnboardingState {
  /** true mientras se lee el valor persistido; evita parpadeo del onboarding. */
  isLoading: boolean;
  completed: boolean;
  load: () => Promise<void>;
  complete: () => Promise<void>;
}

/**
 * Persistencia local del onboarding (AGENTS.md sección 7: "no mostrar
 * onboarding cada vez"). No es información sensible, pero se reutiliza
 * SecureStore por ser el mecanismo de almacenamiento ya presente en la app
 * (mismo patrón que el token de sesión) en vez de sumar una dependencia
 * nueva solo para esta bandera.
 */
export const useOnboardingStore = create<OnboardingState>((set) => ({
  isLoading: true,
  completed: false,

  async load() {
    try {
      const value = await SecureStore.getItemAsync(ONBOARDING_KEY);
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
