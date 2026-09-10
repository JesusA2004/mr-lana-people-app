import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { queryClient } from '@/api/queryClient';
import { queryKeys } from '@/api/queryKeys';
import { colaboradorApi } from '@/api/colaborador';
import { incorporacionApi } from '@/api/incorporacion';
import { BiometricEnrollPrimer } from '@/components/BiometricEnrollPrimer';
import { ErrorState } from '@/components/ErrorState';
import { ExperienceSelectorPrimer } from '@/components/ExperienceSelectorPrimer';
import { LockScreen } from '@/components/LockScreen';
import { PrivacyOverlay } from '@/components/PrivacyOverlay';
import { PushPermissionPrimer } from '@/components/PushPermissionPrimer';
import { Colors } from '@/constants/colors';
import { useAppPrivacyProtection } from '@/hooks/useAppPrivacyProtection';
import { useBackgroundPrivacy } from '@/hooks/useBackgroundPrivacy';
import { useBirthdayAutoCelebration } from '@/hooks/useBirthdayAutoCelebration';
import { useBirthdayGreeting } from '@/hooks/queries/useBirthday';
import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';
import { useNotificationBadgeSync } from '@/hooks/queries/useNotificaciones';
import { useAppLockStore } from '@/store/appLockStore';
import { useExperienceStore } from '@/store/experienceStore';
import { usePendingNavigationStore } from '@/store/pendingNavigationStore';
import { canUseRhExperience } from '@/utils/capabilities';
import { getErrorMessage } from '@/utils/errors';
import { isFeatureEnabled } from '@/utils/featureFlags';

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
  const isExperienceLoading = useExperienceStore((state) => state.isLoading);
  const loadExperience = useExperienceStore((state) => state.load);

  // AGENTS.md sección 16 ("feature flags... las rutas profundas también
  // deben manejarlo"): mientras el bootstrap no ha resuelto se asume
  // habilitado (fail-open, ver `isFeatureEnabled`) para no ocultar nada de
  // golpe antes de tiempo.
  const cumpleanosEnabled = isFeatureEnabled(bootstrap.data?.features, 'cumpleanos');
  const incorporacionEnabled = isFeatureEnabled(bootstrap.data?.features, 'incorporacion');
  const documentosLaboralesEnabled = isFeatureEnabled(bootstrap.data?.features, 'documentos_laborales');

  const birthday = useBirthdayGreeting(cumpleanosEnabled);
  useBirthdayAutoCelebration(cumpleanosEnabled ? birthday.data : null);

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

  // AGENTS.md sección 4 (bug corregido): antes el árbol de colaborador se
  // mostraba como adelanto mientras `experienceStore` todavía leía
  // SecureStore o el bootstrap (capabilities/features) seguía en vuelo — un
  // RH cuya última experiencia elegida era "Gestión RH" veía un flash "Mi
  // espacio → Gestión RH" cada vez que abría la app. Ahora NO se monta
  // ningún árbol de navegación definitivo (ni colaborador ni RH) hasta que
  // ambos terminaron de resolver la primera vez.
  const stillResolving = isExperienceLoading || bootstrap.isLoading;

  if (stillResolving) {
    return (
      <View style={styles.centerFlex}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (!bootstrap.data) {
    // No debería ocurrir (enabled siempre true, éxito implica data), pero
    // nunca renderizar el árbol de navegación con capabilities a medias.
    return (
      <View style={styles.centerFlex}>
        <ErrorState message={getErrorMessage(bootstrap.error)} onRetry={() => void bootstrap.refetch()} />
      </View>
    );
  }

  // Autoridad final: si capabilities/features ya NO ofrecen RH (permiso
  // retirado, feature flag apagado), se fuerza la experiencia colaborador
  // sin importar qué haya elegido esta cuenta antes — `canUseRh &&` manda.
  const canUseRh = canUseRhExperience(bootstrap.data.capabilities, bootstrap.data.features);
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
          <Stack.Protected guard={incorporacionEnabled}>
            <Stack.Screen name="incorporacion" />
          </Stack.Protected>
          <Stack.Protected guard={documentosLaboralesEnabled}>
            <Stack.Screen name="documentos-laborales/index" />
            <Stack.Screen name="documentos-laborales/[id]" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
          </Stack.Protected>
        </Stack.Protected>

        <Stack.Protected guard={showRhTree}>
          <Stack.Screen name="rh" options={{ animation: 'fade' }} />
        </Stack.Protected>

        {/* Compartidas entre Mi espacio y Gestión RH — nunca duplicar login ni crear otro token al cambiar de experiencia. */}
        <Stack.Protected guard={cumpleanosEnabled}>
          <Stack.Screen name="cumpleanos" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        </Stack.Protected>
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
      <PendingPushNavigationController showRhTree={showRhTree} />
    </View>
  );
}

/**
 * Ejecuta la navegación que `useNotificationResponseRouting` solo encoló
 * (AGENTS.md sección 11/12: "no debe intentar router.push antes de que la
 * ruta RH exista/montada", igual para cold start). Vive aquí, DENTRO del
 * `return` que ya montó el árbol correcto (`showRhTree` resuelto, nunca
 * mientras `stillResolving`), así que cuando este componente se monta la
 * ruta destino YA existe — sin `setTimeout` mágicos, solo espera a que
 * `showRhTree` coincida con la experiencia que pide la navegación
 * pendiente (o navega de inmediato si la ruta es compartida).
 */
function PendingPushNavigationController({ showRhTree }: { showRhTree: boolean }) {
  const router = useRouter();
  const pending = usePendingNavigationStore((state) => state.pending);
  const clearPendingPushNavigation = usePendingNavigationStore((state) => state.clearPendingPushNavigation);

  useEffect(() => {
    if (!pending) return;
    if (pending.experience !== null && (pending.experience === 'rh') !== showRhTree) return;
    router.push(pending.route as never);
    clearPendingPushNavigation();
  }, [pending, showRhTree, router, clearPendingPushNavigation]);

  return null;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  centerFlex: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
});
