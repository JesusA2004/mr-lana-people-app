import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { queryClient } from '@/api/queryClient';
import { queryKeys } from '@/api/queryKeys';
import { colaboradorApi } from '@/api/colaborador';
import { incorporacionApi } from '@/api/incorporacion';
import { BiometricEnrollPrimer } from '@/components/BiometricEnrollPrimer';
import { ExperienceSelectorPrimer } from '@/components/ExperienceSelectorPrimer';
import { LockScreen } from '@/components/LockScreen';
import { PrivacyOverlay } from '@/components/PrivacyOverlay';
import { PushPermissionPrimer } from '@/components/PushPermissionPrimer';
import { useAppPrivacyProtection } from '@/hooks/useAppPrivacyProtection';
import { useBackgroundPrivacy } from '@/hooks/useBackgroundPrivacy';
import { useBirthdayAutoCelebration } from '@/hooks/useBirthdayAutoCelebration';
import { useBirthdayGreeting } from '@/hooks/queries/useBirthday';
import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';
import { useNotificationBadgeSync } from '@/hooks/queries/useNotificaciones';
import { useAppLockStore } from '@/store/appLockStore';
import { useExperienceStore } from '@/store/experienceStore';
import { canUseRhExperience } from '@/utils/capabilities';

/**
 * Este layout SOLO se monta cuando `isAuthenticated` es verdadero (ver
 * `Stack.Protected` en `src/app/_layout.tsx`) — por eso basta llamar estos
 * hooks aquí, sin condicionales, para que la protección se active al entrar
 * a la app y se libere sola al desmontarse (logout). `login.tsx`/`(auth)`
 * nunca pasan por este árbol, así que nunca quedan protegidos ni bloqueados.
 *
 * También decide qué árbol de navegación se muestra — Mi espacio o Gestión
 * RH (AGENTS.md sección 3) — con el mismo patrón `Stack.Protected` que ya
 * usa `src/app/_layout.tsx` para auth/onboarding: cambiar `experience` en
 * `useExperienceStore` re-renderiza automáticamente hacia el árbol correcto,
 * sin duplicar login ni crear otro token.
 */
export default function AppLayout() {
  useAppPrivacyProtection(true);
  const appState = useBackgroundPrivacy(true);
  const isLocked = useAppLockStore((state) => state.isLocked);
  useNotificationBadgeSync();

  const bootstrap = useMobileBootstrap(true);
  const experience = useExperienceStore((state) => state.experience);
  const loadExperience = useExperienceStore((state) => state.load);

  const birthday = useBirthdayGreeting(true);
  useBirthdayAutoCelebration(birthday.data);

  useEffect(() => {
    void loadExperience();
  }, [loadExperience]);

  useEffect(() => {
    // Prefetch de lo que el colaborador casi siempre visita después del
    // dashboard (AGENTS.md sección 110 de V4) — no bloquea la entrada: si el
    // usuario ya navegó a Perfil/Expediente antes de que resuelva, React
    // Query solo reutiliza el resultado en caché.
    void queryClient.prefetchQuery({ queryKey: queryKeys.perfil, queryFn: colaboradorApi.getPerfil });
    void queryClient.prefetchQuery({ queryKey: queryKeys.incorporacion, queryFn: incorporacionApi.get });
  }, []);

  const canUseRh = bootstrap.data ? canUseRhExperience(bootstrap.data.capabilities, bootstrap.data.features) : false;
  const showRhTree = canUseRh && experience === 'rh';

  return (
    <View style={styles.flex}>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Protected guard={!showRhTree}>
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen
            name="solicitud/nueva"
            options={{ presentation: 'modal', animation: 'slide_from_bottom', gestureEnabled: false }}
          />
          <Stack.Screen name="solicitud/[id]" />
          <Stack.Screen name="expediente/[tipoId]" />
          <Stack.Screen name="incorporacion" />
        </Stack.Protected>

        <Stack.Protected guard={showRhTree}>
          <Stack.Screen name="rh" options={{ animation: 'fade' }} />
        </Stack.Protected>

        {/* Compartidas entre Mi espacio y Gestión RH — nunca duplicar login ni crear otro token al cambiar de experiencia. */}
        <Stack.Screen name="cumpleanos" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="notificaciones" />
        <Stack.Screen name="configuracion" />
        <Stack.Screen name="ayuda" />
        <Stack.Screen name="guia" options={{ animation: 'fade' }} />
      </Stack>

      <PrivacyOverlay visible={appState !== 'active' && !isLocked} />
      <LockScreen visible={isLocked} />
      <PushPermissionPrimer />
      <BiometricEnrollPrimer />
      <ExperienceSelectorPrimer />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
