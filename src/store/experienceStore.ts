import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const EXPERIENCE_KEY = 'mrlana-experience';

export type Experience = 'colaborador' | 'rh';

interface ExperienceState {
  isLoading: boolean;
  /** `null` hasta que se resuelva el valor persistido — RootNavigator espera antes de decidir qué árbol mostrar. */
  experience: Experience | null;
  load: () => Promise<void>;
  setExperience: (value: Experience) => Promise<void>;
  /** Logout: limpia la preferencia persistida (AGENTS.md sección 52) para que no se filtre a la siguiente cuenta que use el dispositivo. */
  reset: () => Promise<void>;
}

/**
 * Selector de experiencia (AGENTS.md sección 3): un colaborador que
 * también tiene capacidades RH puede cambiar entre "Mi espacio" y "Gestión
 * RH" sin cerrar sesión. Se persiste localmente para recordar la última
 * elegida — el backend nunca decide esto, solo si la opción existe
 * (`capabilities.rh`, ver `useMobileBootstrap`).
 */
export const useExperienceStore = create<ExperienceState>((set) => ({
  isLoading: true,
  experience: null,

  async load() {
    try {
      const stored = await SecureStore.getItemAsync(EXPERIENCE_KEY);
      set({ experience: stored === 'rh' || stored === 'colaborador' ? stored : null, isLoading: false });
    } catch {
      set({ experience: null, isLoading: false });
    }
  },

  async setExperience(value) {
    set({ experience: value });
    try {
      await SecureStore.setItemAsync(EXPERIENCE_KEY, value);
    } catch {
      // No crítico: en el peor caso vuelve a preguntar la próxima sesión.
    }
  },

  async reset() {
    set({ experience: null });
    try {
      await SecureStore.deleteItemAsync(EXPERIENCE_KEY);
    } catch {
      // No crítico.
    }
  },
}));
