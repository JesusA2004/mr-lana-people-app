import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { construirTema, type Tema } from './tema';

import { type ColorPalette } from '@/constants/colors';
import { useAppThemeStore } from '@/store/appThemeStore';

const TemaContext = createContext<Tema>(construirTema(null));

/**
 * Tema de la app: SIEMPRE claro (no sigue el modo oscuro del sistema). Se
 * recalcula en la misma sesión cuando llega/cambia el tema institucional
 * del backend (`useAppThemeStore`). Los componentes base (Button, Card,
 * Screen, AppHeader, Input, StatusBadge, ItemCard, FormSheet, barra de
 * pestañas…) leen de aquí; las pantallas los heredan.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const remoto = useAppThemeStore((state) => state.colors);
  const tema = useMemo(() => construirTema(remoto), [remoto]);

  return <TemaContext.Provider value={tema}>{children}</TemaContext.Provider>;
}

export function useTema(): Tema {
  return useContext(TemaContext);
}

export function useColores(): ColorPalette {
  return useContext(TemaContext).colors;
}

/**
 * Estilos (`StyleSheet.create`) que se recalculan cuando cambia el tema (en vez de
 * quedar congelado con la paleta del arranque).
 */
export function useEstilos<T>(fabrica: (c: ColorPalette) => T): T {
  const colors = useColores();
  // La fábrica es estable por componente (definida a nivel de módulo, ya
  // llama a StyleSheet.create): solo se recalcula si cambia la paleta.
  return useMemo(() => fabrica(colors), [fabrica, colors]);
}
