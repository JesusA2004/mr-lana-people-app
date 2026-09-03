import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { ErrorState } from '@/components/ErrorState';
import { IS_API_URL_CONFIGURED } from '@/constants/config';
import { useAuthStore } from '@/store/authStore';

SplashScreen.preventAutoHideAsync().catch(() => {});

/** Oculta el splash nativo únicamente cuando la restauración de sesión terminó. */
function SplashScreenController() {
  const isInitializing = useAuthStore((state) => state.isInitializing);

  useEffect(() => {
    if (!isInitializing) {
      SplashScreen.hide();
    }
  }, [isInitializing]);

  return null;
}

/**
 * Enrutador raíz. Usa `Stack.Protected` (patrón recomendado por Expo Router
 * v57 para rutas protegidas) para mostrar el grupo (app) solo si hay sesión,
 * y el grupo (auth) en caso contrario, sin parpadeos de la pantalla equivocada.
 */
function RootNavigator() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitializing = useAuthStore((state) => state.isInitializing);

  // El splash nativo sigue visible mientras se restaura la sesión.
  if (isInitializing) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const restoreSession = useAuthStore((state) => state.restoreSession);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

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
    </SafeAreaProvider>
  );
}
