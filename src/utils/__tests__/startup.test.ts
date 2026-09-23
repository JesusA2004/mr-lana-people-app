import { isSplashReady, resolveStartupView, type StartupState } from '../startup';

const ALL_STATES: StartupState[] = [];
for (const isInitializing of [true, false])
  for (const pendingVerification of [true, false])
    for (const isOnboardingLoading of [true, false]) ALL_STATES.push({ isInitializing, pendingVerification, isOnboardingLoading });

describe('arranque', () => {
  it.each(ALL_STATES)('ningún estado se queda sin pantalla: %o', (state) => {
    expect(['fallback', 'session-verification', 'navigator']).toContain(resolveStartupView(state));
  });

  it('restaurando sesión → logo + progreso', () => {
    expect(resolveStartupView({ isInitializing: true, pendingVerification: false, isOnboardingLoading: true })).toBe('fallback');
  });

  it('sesión sin verificar por red → pantalla con Reintentar aunque el onboarding siga cargando', () => {
    const state = { isInitializing: false, pendingVerification: true, isOnboardingLoading: true };
    expect(resolveStartupView(state)).toBe('session-verification');
    expect(isSplashReady(state)).toBe(true);
  });

  it('onboarding leyéndose → fallback y splash aún visible', () => {
    const state = { isInitializing: false, pendingVerification: false, isOnboardingLoading: true };
    expect(resolveStartupView(state)).toBe('fallback');
    expect(isSplashReady(state)).toBe(false);
  });

  it('todo resuelto → navegador y splash oculto', () => {
    const state = { isInitializing: false, pendingVerification: false, isOnboardingLoading: false };
    expect(resolveStartupView(state)).toBe('navigator');
    expect(isSplashReady(state)).toBe(true);
  });

  it('mientras se restaura la sesión el splash nunca se oculta por "listo"', () => {
    expect(ALL_STATES.filter((s) => s.isInitializing).every((s) => !isSplashReady(s))).toBe(true);
  });
});
