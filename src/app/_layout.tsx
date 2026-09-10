import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { bindQueryClientToNetworkStatus, queryClient } from '@/api/queryClient';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { ErrorState } from '@/components/ErrorState';
import { ForceUpdateScreen } from '@/components/ForceUpdateScreen';
import { MaintenanceScreen } from '@/components/MaintenanceScreen';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ToastHost } from '@/components/ToastHost';
import { UpdateBanner } from '@/components/UpdateBanner';
import { IS_API_URL_CONFIGURED } from '@/constants/config';
import { useAppConfig } from '@/hooks/queries/useAppRelease';
import { useNotificationResponseRouting } from '@/hooks/useNotificationResponseRouting';
import { usePushRegistration } from '@/hooks/usePushRegistration';
import { useAuthStore } from '@/store/authStore';
import { useMaintenanceStore } from '@/store/maintenanceStore';
import { useOnboardingStore } from '@/store/onboardingStore';

SplashScreen.preventAutoHideAsync().catch(() => {});

/** Oculta el splash nativo únicamente cuando restauración de sesión + onboarding terminaron de leerse. */
function SplashScreenController() {
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const isOnboardingLoading = useOnboardingStore((state) => state.isLoading);

  useEffect(() => {
    if (!isInitializing && !isOnboardingLoading) {
      SplashScreen.hide();
    }
  }, [isInitializing, isOnboardingLoading]);

  return null;
}

/**
 * Consulta `GET /api/v1/app/config` (público, sin sesión) al iniciar la app
 * — AGENTS.md sección 38/58 — y sincroniza `MaintenanceScreen` con
 * `maintenance`/`message` sin esperar a que alguna otra request falle con
 * 503. Vive fuera de `RootNavigator` para correr incluso antes de login.
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
 * Enrutador raíz. Usa `Stack.Protected` (patrón recomendado por Expo Router
 * v57 para rutas protegidas) en tres tramos: sin sesión → (auth); con sesión
 * pero onboarding no visto todavía → onboarding; con sesión y onboarding
 * completo → (app). Ver AGENTS.md sección 7: "no mostrar onboarding cada vez".
 */
function RootNavigator() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const onboardingCompleted = useOnboardingStore((state) => state.completed);
  const isOnboardingLoading = useOnboardingStore((state) => state.isLoading);

  usePushRegistration(isAuthenticated && onboardingCompleted);
  useNotificationResponseRouting(isAuthenticated && onboardingCompleted);

  // El splash nativo sigue visible mientras se restaura sesión/onboarding.
  if (isInitializing || isOnboardingLoading) return null;

  const showOnboarding = isAuthenticated && !onboardingCompleted;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isAuthenticated && !showOnboarding}>
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
  const loadOnboarding = useOnboardingStore((state) => state.load);

  useEffect(() => {
    void restoreSession();
    void loadOnboarding();
    return bindQueryClientToNetworkStatus();
  }, [restoreSession, loadOnboarding]);

  if (!IS_API_URL_CONFIGURED) {
    // Error técnico claro: sin EXPO_PUBLIC_API_URL la app no puede funcionar (ver .env.example).
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <ErrorState message="Falta configurar EXPO_PUBLIC_API_URL. Copia .env.example a .env, define la URL de la API en tu red local y reinicia Expo." />
      </SafeAreaProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <SplashScreenController />
        <AppConfigController />
        <AppErrorBoundary>
          <RootNavigator />
        </AppErrorBoundary>
        <ToastHost />
        <OfflineBanner />
        <UpdateBanner enabled={isAuthenticated} />
        <MaintenanceScreen />
        <ForceUpdateScreen enabled />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
