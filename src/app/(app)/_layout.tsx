import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { queryClient } from '@/api/queryClient';
import { queryKeys } from '@/api/queryKeys';
import { colaboradorApi } from '@/api/colaborador';
import { incorporacionApi } from '@/api/incorporacion';
import { BiometricEnrollPrimer } from '@/components/BiometricEnrollPrimer';
import { LockScreen } from '@/components/LockScreen';
import { PrivacyOverlay } from '@/components/PrivacyOverlay';
import { PushPermissionPrimer } from '@/components/PushPermissionPrimer';
import { useAppPrivacyProtection } from '@/hooks/useAppPrivacyProtection';
import { useBackgroundPrivacy } from '@/hooks/useBackgroundPrivacy';
import { useNotificationBadgeSync } from '@/hooks/queries/useNotificaciones';
import { useAppLockStore } from '@/store/appLockStore';

/**
 * Este layout SOLO se monta cuando `isAuthenticated` es verdadero (ver
 * `Stack.Protected` en `src/app/_layout.tsx`) — por eso basta llamar estos
 * hooks aquí, sin condicionales, para que la protección se active al entrar
 * a la app y se libere sola al desmontarse (logout). `login.tsx`/`(auth)`
 * nunca pasan por este árbol, así que nunca quedan protegidos ni bloqueados.
 */
export default function AppLayout() {
  useAppPrivacyProtection(true);
  const appState = useBackgroundPrivacy(true);
  const isLocked = useAppLockStore((state) => state.isLocked);
  useNotificationBadgeSync();

  useEffect(() => {
    // Prefetch de lo que el colaborador casi siempre visita después del
    // dashboard (V4 sección 110) — no bloquea la entrada: si el usuario ya
    // navegó a Perfil/Expediente antes de que resuelva, React Query solo
    // reutiliza el resultado en caché.
    void queryClient.prefetchQuery({ queryKey: queryKeys.perfil, queryFn: colaboradorApi.getPerfil });
    void queryClient.prefetchQuery({ queryKey: queryKeys.incorporacion, queryFn: incorporacionApi.get });
  }, []);

  return (
    <View style={styles.flex}>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen
          name="solicitud/nueva"
          options={{ presentation: 'modal', animation: 'slide_from_bottom', gestureEnabled: false }}
        />
        <Stack.Screen name="solicitud/[id]" />
        <Stack.Screen name="expediente/[tipoId]" />
        <Stack.Screen name="incorporacion" />
        <Stack.Screen name="notificaciones" />
        <Stack.Screen name="configuracion" />
        <Stack.Screen name="ayuda" />
        <Stack.Screen name="guia" options={{ animation: 'fade' }} />
      </Stack>

      <PrivacyOverlay visible={appState !== 'active' && !isLocked} />
      <LockScreen visible={isLocked} />
      <PushPermissionPrimer />
      <BiometricEnrollPrimer />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
