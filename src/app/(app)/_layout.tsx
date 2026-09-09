import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { LockScreen } from '@/components/LockScreen';
import { PrivacyOverlay } from '@/components/PrivacyOverlay';
import { useAppPrivacyProtection } from '@/hooks/useAppPrivacyProtection';
import { useBackgroundPrivacy } from '@/hooks/useBackgroundPrivacy';
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

  return (
    <View style={styles.flex}>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="solicitud/nueva" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="solicitud/[id]" />
        <Stack.Screen name="expediente/[tipoId]" />
        <Stack.Screen name="incorporacion" />
        <Stack.Screen name="notificaciones" />
        <Stack.Screen name="configuracion" />
        <Stack.Screen name="ayuda" />
      </Stack>

      <PrivacyOverlay visible={appState !== 'active' && !isLocked} />
      <LockScreen visible={isLocked} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
