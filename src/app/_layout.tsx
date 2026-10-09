import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { Appearance } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { bindQueryClientToNetworkStatus, queryClient } from '@/api/queryClient';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { ErrorState } from '@/components/ErrorState';
import { ForceUpdateScreen } from '@/components/ForceUpdateScreen';
import { MaintenanceScreen } from '@/components/MaintenanceScreen';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SessionVerificationScreen } from '@/components/SessionVerificationScreen';
import { StartupFallback } from '@/components/StartupFallback';
import { ToastHost } from '@/components/ToastHost';
import { UpdateBanner } from '@/components/UpdateBanner';
import { Colors } from '@/constants/colors';
import { IS_API_URL_CONFIGURED } from '@/constants/config';
import { useAppConfig } from '@/hooks/queries/useAppRelease';
import { useAppTheme } from '@/hooks/queries/useAppTheme';
import { useNotificationResponseRouting } from '@/hooks/useNotificationResponseRouting';
import { usePushRegistration } from '@/hooks/usePushRegistration';
import { useAppThemeStore } from '@/store/appThemeStore';
import { useAuthStore } from '@/store/authStore';
import { useMaintenanceStore } from '@/store/maintenanceStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { ThemeProvider, useColores } from '@/theme/ThemeProvider';
import { logError } from '@/utils/errors';
import { isSplashReady, resolveStartupView } from '@/utils/startup';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Solo claro (ver `constants/colors.ts`): la UI nativa (Alert, date pickers,
// teclado) se fija a claro aunque el teléfono esté en modo oscuro.
try {
  Appearance.setColorScheme('light');
} catch (error) {
  logError('Appearance.setColorScheme', error);
}
SystemUI.setBackgroundColorAsync(Colors.background).catch(() => {});

/** Íconos oscuros sobre los fondos crema (el login fija los suyos en claro). */
const STATUS_BAR_STYLE = 'dark';

/**
 * Plazo máximo del splash nativo. La restauración ya tiene sus propios
 * timeouts (SecureStore 5 s, `/me` 10 s) — este watchdog es la última red:
 * si algo imprevisto sigue sin resolver, se oculta el splash y se ve
 * `StartupFallback` (logo + progreso), nunca un logo congelado para siempre.
 */
const SPLASH_WATCHDOG_MS = 15000;

function hideSplash(reason: string) {
  SplashScreen.hideAsync().catch((error: unknown) => logError(`SplashScreen.hide(${reason})`, error));
}

/** Oculta el splash nativo cuando restauración de sesión + onboarding terminaron de leerse (o al vencer el watchdog). */
function SplashScreenController() {
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const isOnboardingLoading = useOnboardingStore((state) => state.isLoading);
  const pendingVerification = useAuthStore((state) => state.pendingVerification);
  const ready = isSplashReady({ isInitializing, pendingVerification, isOnboardingLoading });

  useEffect(() => {
    if (ready) hideSplash('ready');
  }, [ready]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (__DEV__) console.warn('[Startup] Watchdog: el arranque tardó más de lo esperado; se oculta el splash.');
      hideSplash('watchdog');
    }, SPLASH_WATCHDOG_MS);
    return () => clearTimeout(timer);
  }, []);

  return null;
}

/**
 * Si por un error de configuración el build no trae la URL de API, el splash
 * nativo también debe cerrarse y mostrar un error entendible (nunca el logo
 * congelado).
 */
function ApiConfigurationError() {
  useEffect(() => {
    hideSplash('config-error');
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style={STATUS_BAR_STYLE} />
      <ErrorState message="La app no tiene configurada la conexión con People. Instala una compilación válida o contacta a soporte." />
    </SafeAreaProvider>
  );
}

/**
 * Consulta `GET /api/v1/app/config` (público, sin sesión) al iniciar la app
 * y sincroniza `MaintenanceScreen` con `maintenance`/`message`.
 */
function AppConfigController() {
  const { data: config } = useAppConfig();
  const setMaintenanceActive = useMaintenanceStore((state) => state.setActive);

  useEffect(() => {
    if (config) setMaintenanceActive(config.maintenance, config.message);
  }, [config, setMaintenanceActive]);

  return null;
}

/**
 * `GET /api/v1/app/theme` (público, Administración → Configuración →
 * Apariencia): guarda el tema en memoria (`useAppThemeStore`, para los
 * estilos en línea que lo consulten con `useAppThemeColor`) y repinta el
 * fondo nativo con `expo-system-ui` — la única superficie que SÍ puede
 * actualizarse en vivo sin tocar los `StyleSheet.create` ya evaluados
 * (ver comentario de `appThemeStore.ts`). Si falla, la app sigue con la
 * paleta estática de `constants/colors.ts`: nunca se rompe por falta de tema.
 */
function AppThemeController() {
  const { data: theme } = useAppTheme();
  const setTheme = useAppThemeStore((state) => state.setTheme);

  useEffect(() => {
    if (!theme) return;
    setTheme(theme.colors, theme.version);
    if (theme.colors.background) {
      SystemUI.setBackgroundColorAsync(theme.colors.background).catch((error: unknown) => logError('SystemUI.setBackgroundColorAsync(theme)', error));
    }
  }, [theme, setTheme]);

  return null;
}

/**
 * Enrutador raíz. Usa `Stack.Protected` en tres tramos: sin sesión → auth;
 * con sesión pero onboarding no visto → onboarding; con sesión y onboarding
 * completo → app. Una sesión guardada que no se pudo verificar por red NO es
 * "sin sesión": muestra `SessionVerificationScreen` en vez de Login.
 */
function RootNavigator() {
  const Colors = useColores();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const pendingVerification = useAuthStore((state) => state.pendingVerification);
  // Contraseña temporal: hasta cambiarla solo existe esa pantalla (el backend
  // responde 403 «cambio_contrasena_requerido» a todo lo demás).
  const debeCambiarContrasena = useAuthStore((state) => state.user?.debe_cambiar_contrasena === true);
  const onboardingCompleted = useOnboardingStore((state) => state.completed);
  const isOnboardingLoading = useOnboardingStore((state) => state.isLoading);

  const sessionReady = isAuthenticated && !debeCambiarContrasena && onboardingCompleted && !isOnboardingLoading;
  usePushRegistration(sessionReady);
  useNotificationResponseRouting(sessionReady);

  const view = resolveStartupView({ isInitializing, pendingVerification, isOnboardingLoading });
  if (view === 'fallback') return <StartupFallback />;
  if (view === 'session-verification') return <SessionVerificationScreen />;

  const showCambioContrasena = isAuthenticated && debeCambiarContrasena;
  const showOnboarding = isAuthenticated && !showCambioContrasena && !onboardingCompleted;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
      <Stack.Protected guard={showCambioContrasena}>
        <Stack.Screen name="cambiar-contrasena" options={{ gestureEnabled: false }} />
      </Stack.Protected>
      <Stack.Protected guard={isAuthenticated && !showCambioContrasena && !showOnboarding}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={showOnboarding}>
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const restoreSession = useAuthStore((state) => state.restoreSession);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const loadOnboarding = useOnboardingStore((state) => state.load);

  useEffect(() => {
    void restoreSession();
    return bindQueryClientToNetworkStatus();
  }, [restoreSession]);

  useEffect(() => {
    if (isInitializing) return;
    void loadOnboarding(userId);
  }, [isInitializing, userId, loadOnboarding]);

  if (!IS_API_URL_CONFIGURED) {
    return <ApiConfigurationError />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style={STATUS_BAR_STYLE} />
        <SplashScreenController />
        <AppConfigController />
        <AppThemeController />
        <ThemeProvider>
          <AppErrorBoundary>
            <RootNavigator />
          </AppErrorBoundary>
        </ThemeProvider>
        <ToastHost />
        <OfflineBanner />
        <UpdateBanner enabled={isAuthenticated} />
        <MaintenanceScreen />
        <ForceUpdateScreen enabled />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
