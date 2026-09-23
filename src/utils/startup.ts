export interface StartupState {
  isInitializing: boolean;
  pendingVerification: boolean;
  isOnboardingLoading: boolean;
}

export type StartupView = 'fallback' | 'session-verification' | 'navigator';

/**
 * Qué dibuja `RootNavigator` en cada estado del arranque. Nunca devuelve
 * "nada": cada combinación tiene una pantalla (logo + progreso, verificación
 * de sesión con Reintentar, o el navegador real).
 */
export function resolveStartupView({ isInitializing, pendingVerification, isOnboardingLoading }: StartupState): StartupView {
  if (isInitializing) return 'fallback';
  if (pendingVerification) return 'session-verification';
  if (isOnboardingLoading) return 'fallback';
  return 'navigator';
}

/**
 * El splash nativo se oculta en cuanto hay algo real que mostrar: sesión
 * restaurada y onboarding leído — o sesión pendiente de verificar (que no
 * depende del onboarding). El watchdog de `_layout.tsx` cubre lo imprevisto.
 */
export function isSplashReady({ isInitializing, pendingVerification, isOnboardingLoading }: StartupState): boolean {
  return !isInitializing && (!isOnboardingLoading || pendingVerification);
}
