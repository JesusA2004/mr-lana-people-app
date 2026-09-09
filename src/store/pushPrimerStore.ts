import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const PUSH_PRIMER_KEY = 'mrlana-push-primer-shown';

interface PushPrimerState {
  /** true mientras se lee el valor persistido — evita mostrar el primer de golpe antes de saber si ya se preguntó. */
  isLoading: boolean;
  hasBeenAsked: boolean;
  load: () => Promise<void>;
  markAsked: () => Promise<void>;
}

/**
 * Recuerda si ya le preguntamos al colaborador sobre notificaciones push
 * (V4 sección 9: "no pedir permiso brutalmente al abrir la app" — se
 * pregunta con nuestra propia explicación una sola vez; después de eso,
 * activarlas o no queda en Configuración → Notificaciones push, no se
 * vuelve a insistir).
 */
export const usePushPrimerStore = create<PushPrimerState>((set) => ({
  isLoading: true,
  hasBeenAsked: false,

  async load() {
    try {
      const value = await SecureStore.getItemAsync(PUSH_PRIMER_KEY);
      set({ hasBeenAsked: value === 'true', isLoading: false });
    } catch {
      set({ hasBeenAsked: false, isLoading: false });
    }
  },

  async markAsked() {
    set({ hasBeenAsked: true });
    try {
      await SecureStore.setItemAsync(PUSH_PRIMER_KEY, 'true');
    } catch {
      // No crítico: en el peor caso se vuelve a preguntar la próxima sesión.
    }
  },
}));
