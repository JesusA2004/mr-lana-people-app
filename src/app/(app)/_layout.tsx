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
import { SHOW_DEV_TOOLS } from '@/constants/config';
import { useAppPrivacyProtection } from '@/hooks/useAppPrivacyProtection';
import { useBackgroundPrivacy } from '@/hooks/useBackgroundPrivacy';
import { useBirthdayAutoCelebration } from '@/hooks/useBirthdayAutoCelebration';
import { useBirthdayGreeting } from '@/hooks/queries/useBirthday';
import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';
import { useNotificationBadgeSync } from '@/hooks/queries/useNotificaciones';
import { useAppLockStore } from '@/store/appLockStore';
import { useExperienceStore } from '@/store/experienceStore';
import { usePendingNavigationStore } from '@/store/pendingNavigationStore';
import { experienceAvailability, resolveExperience, shouldCorrectStoredExperience, type ExperienceAvailability } from '@/utils/experience';
import { getErrorMessage } from '@/utils/errors';
import { isFeatureEnabled } from '@/utils/featureFlags';
import { isSelfServiceModuleEnabled } from '@/utils/modules';

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
  const setExperience = useExperienceStore((state) => state.setExperience);
  const availability = experienceAvailability(bootstrap.data?.capabilities, bootstrap.data?.features);

  // Preferencia guardada que ya no aplica (p. ej. le retiraron permisos de
  // RH): se corrige para no volver a intentar un árbol inválido.
  const correccion = bootstrap.data && !isExperienceLoading ? shouldCorrectStoredExperience(experience, availability) : null;
  useEffect(() => {
    if (correccion) void setExperience(correccion);
  }, [correccion, setExperience]);

  // AGENTS.md sección 16 ("feature flags... las rutas profundas también
  // deben manejarlo"): mientras el bootstrap no ha resuelto se asume
  // habilitado (fail-open, ver `isFeatureEnabled`) para no ocultar nada de
  // golpe antes de tiempo — módulos CORE ya existentes.
  const cumpleanosEnabled = isFeatureEnabled(bootstrap.data?.features, 'cumpleanos');
  const incorporacionEnabled = isFeatureEnabled(bootstrap.data?.features, 'incorporacion');
  // Ciclo laboral (backend 2026-09-22): API estable protegida por Policy —
  // visible salvo que el backend mande el feature explícito en `false`
  // (ver `utils/modules.ts` y docs/MOBILE_BACKEND_SYNC_2026_09_22.md).
  const features = bootstrap.data?.features;
  const documentosLaboralesEnabled = isSelfServiceModuleEnabled(features, 'documentos_laborales');
  const contratosEnabled = isSelfServiceModuleEnabled(features, 'contratos');
  const recibosEnabled = isSelfServiceModuleEnabled(features, 'recibos');
  const prestamosEnabled = isSelfServiceModuleEnabled(features, 'prestamos');
  const jerarquiaEnabled = isSelfServiceModuleEnabled(features, 'jerarquia');
  const equipoEnabled = isSelfServiceModuleEnabled(features, 'equipo');
  const evaluacionesEnabled = isSelfServiceModuleEnabled(features, 'evaluaciones');
  const tareasEnabled = isSelfServiceModuleEnabled(features, 'tareas');

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

  // Autoridad final: capabilities/features del backend (nunca el rol).
  // Solo RH → Gestión RH directo; solo colaborador → Mi espacio; ambas →
  // la elegida. Un permiso retirado nunca deja montado el árbol RH.
  const showRhTree = resolveExperience(experience, availability) === 'rh';

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
          {/* Solicitar préstamo es una solicitud: disponible aunque el módulo Préstamos esté apagado. */}
          <Stack.Screen name="prestamos/solicitar" />
          <Stack.Screen name="expediente/[tipoId]" />
          <Stack.Protected guard={incorporacionEnabled}>
            <Stack.Screen name="incorporacion" />
          </Stack.Protected>
          <Stack.Protected guard={documentosLaboralesEnabled}>
            <Stack.Screen name="documentos-laborales/index" />
            <Stack.Screen name="documentos-laborales/[id]" />
          </Stack.Protected>
          <Stack.Protected guard={contratosEnabled}>
            <Stack.Screen name="contratos" />
          </Stack.Protected>
          <Stack.Protected guard={recibosEnabled}>
            <Stack.Screen name="recibos/index" />
            <Stack.Screen name="recibos/[id]" />
          </Stack.Protected>
          <Stack.Protected guard={prestamosEnabled}>
            <Stack.Screen name="prestamos/index" />
            <Stack.Screen name="prestamos/[id]" />
          </Stack.Protected>
          <Stack.Protected guard={jerarquiaEnabled}>
            <Stack.Screen name="jerarquia" />
          </Stack.Protected>
        </Stack.Protected>

        <Stack.Protected guard={showRhTree}>
          <Stack.Screen name="rh" options={{ animation: 'fade' }} />
        </Stack.Protected>

        {/* Compartidas entre Mi espacio y Gestión RH — nunca duplicar login ni crear otro token al cambiar de experiencia. */}
        <Stack.Protected guard={cumpleanosEnabled}>
          <Stack.Screen name="cumpleanos" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="muro-cumpleanos/[id]" />
        </Stack.Protected>
        {/* Jefe / evaluaciones / bandeja: compartidas — un jefe o RH/Dirección
            las usa desde cualquiera de las dos experiencias. */}
        <Stack.Protected guard={equipoEnabled}>
          <Stack.Screen name="equipo" />
        </Stack.Protected>
        <Stack.Protected guard={evaluacionesEnabled}>
          <Stack.Screen name="evaluaciones/index" />
          <Stack.Screen name="evaluaciones/[id]" />
        </Stack.Protected>
        <Stack.Protected guard={tareasEnabled}>
          <Stack.Screen name="tareas" />
        </Stack.Protected>
        <Stack.Screen name="notificaciones" />
        <Stack.Screen name="configuracion" />
        <Stack.Screen name="ayuda" />
        <Stack.Screen name="guia" options={{ animation: 'fade' }} />
        {/* QA (Diagnóstico Push / Design QA): solo dev o builds preview — en producción la ruta no existe. */}
        <Stack.Protected guard={SHOW_DEV_TOOLS}>
          <Stack.Screen name="dev/diagnostico-push" />
          <Stack.Screen name="dev/design-qa" />
        </Stack.Protected>
      </Stack>

      <PrivacyOverlay visible={appState !== 'active' && !isLocked} />
      <LockScreen visible={isLocked} />
      <PushPermissionPrimer />
      <BiometricEnrollPrimer />
      <ExperienceSelectorPrimer />
      <PendingPushNavigationController showRhTree={showRhTree} availability={availability} />
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
function PendingPushNavigationController({ showRhTree, availability }: { showRhTree: boolean; availability: ExperienceAvailability }) {
  const router = useRouter();
  const pending = usePendingNavigationStore((state) => state.pending);
  const clearPendingPushNavigation = usePendingNavigationStore((state) => state.clearPendingPushNavigation);

  useEffect(() => {
    if (!pending) return;
    // Destino en Gestión RH pero la cuenta ya no puede usarla (permiso
    // retirado o feature apagado): nunca dejar la navegación colgada ni
    // abrir una ruta desmontada — cae en el centro de notificaciones.
    if ((pending.experience === 'rh' && !availability.rh) || (pending.experience === 'colaborador' && !availability.colaborador)) {
      router.push('/notificaciones');
      clearPendingPushNavigation();
      return;
    }
    if (pending.experience !== null && (pending.experience === 'rh') !== showRhTree) return;
    router.push(pending.route as never);
    clearPendingPushNavigation();
  }, [pending, showRhTree, availability.rh, availability.colaborador, router, clearPendingPushNavigation]);

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
