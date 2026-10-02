import { create } from 'zustand';

import type { AppThemeColors } from '@/types/theme';

interface AppThemeState {
  /** `null` hasta que `GET /app/theme` responde por primera vez en esta sesión. */
  colors: AppThemeColors | null;
  version: string | null;
  setTheme: (colors: AppThemeColors, version: string | null) => void;
}

/**
 * Tema institucional dinámico (AGENTS.md sección 26/48). Vive en memoria
 * nada más: no hay almacenamiento síncrono disponible en este proyecto
 * (ni AsyncStorage ni MMKV) para leerlo ANTES de que `StyleSheet.create`
 * de cada pantalla resuelva `constants/colors.ts` al cargar el bundle —
 * por diseño el backend lo sirve público y la app lo consulta al
 * arrancar, no antes.
 *
 * Por eso la paleta estática de `constants/colors.ts` sigue siendo la
 * base de TODA la app (nunca se rompe sin conexión ni mientras carga el
 * tema). Esta store es el canal para la minoría de superficies que SÍ
 * pintan en tiempo de ejecución (`expo-system-ui`, estilos en línea que
 * llamen a `useAppThemeColor`) — no repinta los `StyleSheet.create` ya
 * evaluados.
 */
export const useAppThemeStore = create<AppThemeState>((set) => ({
  colors: null,
  version: null,
  setTheme: (colors, version) => set({ colors, version }),
}));
