import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { ErrorState } from '@/components/ErrorState';
import { ToastHost } from '@/components/ToastHost';
import { IS_API_URL_CONFIGURED } from '@/constants/config';
import { usePushRegistration } from '@/hooks/usePushRegistration';
import { useAuthStore } from '@/store/authStore';
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
  const loadOnboarding = useOnboardingStore((state) => state.load);

  useEffect(() => {
    void restoreSession();
    void loadOnboarding();
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
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SplashScreenController />
      <AppErrorBoundary>
        <RootNavigator />
      </AppErrorBoundary>
      <ToastHost />
    </SafeAreaProvider>
  );
}
