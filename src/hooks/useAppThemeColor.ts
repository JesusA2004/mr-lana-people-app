import { Colors } from '@/constants/colors';
import { useAppThemeStore } from '@/store/appThemeStore';
import type { AppThemeColors } from '@/types/theme';

/** Tokens dinámicos con un equivalente directo en la paleta estática (respaldo seguro por clave). */
const FALLBACK: Record<keyof AppThemeColors, string> = {
  primary: Colors.primary,
  primaryAlt: Colors.primaryDark,
  success: Colors.success,
  deepGreen: Colors.rhInk,
  secondary: Colors.secondary,
  gold: Colors.warning,
  goldDark: Colors.warning,
  muted: Colors.textMuted,
  navy: Colors.rhInk,
  accent: Colors.secondary,
  danger: Colors.danger,
  background: Colors.background,
  surface: Colors.surface,
};

/**
 * Color institucional en tiempo de ejecución (Administración → Configuración
 * → Apariencia), para estilos EN LÍNEA que puedan releerse en cada render.
 * Nunca para `StyleSheet.create`: ese objeto se evalúa una sola vez al
 * cargar el bundle, antes de que el tema termine de llegar por red — por
 * eso la mayoría de la app sigue usando `Colors` estático de
 * `constants/colors.ts`, que es también el respaldo de este hook si el
 * tema no ha llegado o no trae esa clave.
 */
export function useAppThemeColor(token: keyof AppThemeColors): string {
  const colors = useAppThemeStore((state) => state.colors);
  return colors?.[token] ?? FALLBACK[token];
}
