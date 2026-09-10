import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const ONBOARDING_KEY_PREFIX = 'mrlana-onboarding-completed';

function storageKeyFor(userId: string | number): string {
  return `${ONBOARDING_KEY_PREFIX}:${userId}`;
}

interface OnboardingState {
  /** true mientras se lee el valor persistido; evita parpadeo del onboarding. */
  isLoading: boolean;
  completed: boolean;
  /** Usuario para el que `completed` es válido — `null` mientras no hay sesión. */
  userId: string | number | null;
  /**
   * Lee el onboarding del usuario indicado (o limpia el estado si `userId`
   * es `null`, ej. todavía no se restauró sesión). Debe llamarse de nuevo
   * cada vez que cambia el usuario autenticado (login, restoreSession,
   * registro por QR, logout) — nunca se lee una sola vez al montar la app.
   */
  load: (userId: string | number | null) => Promise<void>;
  complete: () => Promise<void>;
}

/**
 * Persistencia local del onboarding, POR USUARIO (AGENTS.md sección 7: "no
 * mostrar onboarding cada vez"; corrección de bug real: la llave era global
 * — `mrlana-onboarding-completed` sin sufijo — así que dos colaboradores
 * distintos que compartieran el mismo teléfono heredaban el onboarding uno
 * del otro, incluyendo un colaborador nuevo registrado por QR sobre un
 * dispositivo ya usado antes por alguien más). Ahora la llave incluye el
 * `id` del usuario (`mrlana-onboarding-completed:{userId}`), así que cada
 * cuenta tiene su propio estado sin necesidad de borrar nada en logout — la
 * preferencia de A se conserva intacta para la próxima vez que A inicie
 * sesión en ese mismo teléfono. Se reutiliza SecureStore por ser el mismo
 * mecanismo ya usado para el token de sesión.
 */
export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  isLoading: true,
  completed: false,
  userId: null,

  async load(userId) {
    if (userId === null) {
      set({ completed: false, isLoading: false, userId: null });
      return;
    }

    set({ isLoading: true, userId });
    try {
      const value = await SecureStore.getItemAsync(storageKeyFor(userId));
      // Si mientras se leía el storage ya se pidió el onboarding de OTRO
      // usuario (cambio rápido de sesión), esta respuesta quedó obsoleta —
      // no debe pisar el estado del usuario que sí sigue activo.
      if (get().userId !== userId) return;
      set({ completed: value === 'true', isLoading: false });
    } catch {
      if (get().userId !== userId) return;
      set({ completed: false, isLoading: false });
    }
  },

  async complete() {
    const { userId } = get();
    if (userId === null) return;
    set({ completed: true });
    try {
      await SecureStore.setItemAsync(storageKeyFor(userId), 'true');
    } catch {
      // Si no se pudo persistir, el onboarding podría reaparecer en el
      // siguiente arranque — no es crítico, no debe romper la navegación.
    }
  },
}));
