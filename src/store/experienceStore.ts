import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const EXPERIENCE_KEY_PREFIX = 'mrlana-experience';
/** Llave del esquema anterior (una sola preferencia global por dispositivo). */
const LEGACY_GLOBAL_KEY = 'mrlana-experience';

function storageKeyFor(userId: string | number): string {
  return `${EXPERIENCE_KEY_PREFIX}:${userId}`;
}

export type Experience = 'colaborador' | 'rh';

interface ExperienceState {
  isLoading: boolean;
  /** `null` hasta que se resuelva el valor persistido — RootNavigator espera antes de decidir qué árbol mostrar. */
  experience: Experience | null;
  /** Cuenta para la que `experience` es válido — `null` mientras no hay sesión. */
  userId: string | number | null;
  load: (userId: string | number | null) => Promise<void>;
  setExperience: (value: Experience) => Promise<void>;
}

/**
 * Selector de experiencia: un colaborador que también tiene capacidades RH
 * puede cambiar entre "Mi espacio" y "Gestión RH" sin cerrar sesión. Se
 * persiste POR CUENTA (`mrlana-experience:{userId}`): la cuenta A y la
 * cuenta B pueden tener cada una su propia preferencia en el mismo teléfono
 * sin contaminarse, y la preferencia de una cuenta sobrevive su logout —
 * al volver a iniciar sesión se restaura la última experiencia válida para
 * esa cuenta (nunca se borra en `authStore.logout()`).
 *
 * Antes la llave era global para todo el dispositivo (`mrlana-experience`,
 * sin sufijo) y se borraba explícitamente en cada logout para no filtrarse a
 * la siguiente cuenta. `load()` migra en limpio: la primera cuenta que lee
 * su llave por-usuario y no encuentra nada adopta el valor de la llave
 * global antigua (si existía) y esa llave global se borra, así no se
 * reaplica después a ninguna otra cuenta.
 *
 * El backend nunca decide esto, solo si la opción existe
 * (`capabilities.rh`, ver `useMobileBootstrap`); si la cuenta pierde el
 * permiso RH, `(app)/_layout.tsx` corrige automáticamente la preferencia
 * guardada a "colaborador".
 */
/**
 * Versión de la última elección explícita. Si `setExperience` ocurre mientras
 * `load()` todavía lee SecureStore (cold start por un push de Gestión RH), el
 * valor persistido que llega después NO debe pisar esa elección — antes lo
 * hacía y la navegación pendiente del push quedaba esperando un árbol que
 * nunca se montaba.
 */
let explicitSelection = 0;

export const useExperienceStore = create<ExperienceState>((set, get) => ({
  isLoading: true,
  experience: null,
  userId: null,

  async load(userId) {
    if (userId === null) {
      set({ experience: null, isLoading: false, userId: null });
      return;
    }

    const selectionAtStart = explicitSelection;
    set({ isLoading: true, userId });

    let stored: string | null = null;
    try {
      stored = await SecureStore.getItemAsync(storageKeyFor(userId));
      if (stored === null) {
        const legacy = await SecureStore.getItemAsync(LEGACY_GLOBAL_KEY);
        if (legacy === 'rh' || legacy === 'colaborador') {
          stored = legacy;
          await SecureStore.setItemAsync(storageKeyFor(userId), legacy);
          await SecureStore.deleteItemAsync(LEGACY_GLOBAL_KEY);
        }
      }
    } catch {
      stored = null;
    }

    // Una elección explícita posterior, o un cambio de cuenta mientras esta
    // lectura seguía en vuelo, no debe pisarse con este resultado tardío.
    if (selectionAtStart !== explicitSelection || get().userId !== userId) {
      set({ isLoading: false });
      return;
    }
    set({ experience: stored === 'rh' || stored === 'colaborador' ? stored : null, isLoading: false });
  },

  async setExperience(value) {
    explicitSelection += 1;
    const { userId } = get();
    set({ experience: value });
    if (userId === null) return;
    try {
      await SecureStore.setItemAsync(storageKeyFor(userId), value);
    } catch {
      // No crítico: en el peor caso vuelve a preguntar la próxima sesión.
    }
  },
}));
