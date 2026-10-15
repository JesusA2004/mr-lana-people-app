import { Stack } from 'expo-router';

import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';
import { isFeatureEnabled } from '@/utils/featureFlags';
import { isRhModuleEnabled, type RhModule } from '@/utils/modules';

/**
 * Stack de la experiencia "Gestión RH" (AGENTS.md sección 5): tabs propios
 * + pantallas de detalle de cada bandeja. Vive bajo el segmento real `rh`
 * (sin paréntesis) para que las rutas tengan su propio prefijo de URL
 * (`/rh/...`), necesario para que `resolveResourceRoute` navegue por push
 * sin colisionar con las rutas de Mi espacio.
 *
 * Feature flags profundas (AGENTS.md de este encargo, sección 47): no basta
 * ocultar la card del home — las rutas de cumpleaños
 * también se protegen aquí con `Stack.Protected`, mismo patrón que ya usa
 * `(app)/_layout.tsx`. `useMobileBootstrap` reutiliza la misma query
 * (mismo queryKey/staleTime) que el resto de la app — lectura de caché, no
 * dispara un fetch nuevo.
 */
export default function RhLayout() {
  const bootstrap = useMobileBootstrap(true);
  const cumpleanosEnabled = isFeatureEnabled(bootstrap.data?.features, 'cumpleanos');
  const permissions = bootstrap.data?.user.permissions;
  const features = bootstrap.data?.features;
  const moduloOn = (module: RhModule) => isRhModuleEnabled(features, permissions, module);

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      <Stack.Screen name="solicitudes/[id]" />
      {/* Ruta LEGACY: ya no se enlaza desde ninguna pantalla nueva, pero
          `RhPendientesService` sigue devolviendo pendientes con `tipo:
          "vacaciones"` mientras queden registros de `solicitudes_vacaciones`
          sin cerrar — si RH toca uno, la ruta tiene que existir (sección
          18). Una vacación creada por la app nueva llega a
          `solicitudes/[id]`. */}
      <Stack.Screen name="vacaciones/[id]" />
      <Stack.Screen name="documentos/[id]" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      <Stack.Screen name="incorporaciones/[colaborador]" />
      <Stack.Screen name="colaboradores/[id]" />
      <Stack.Screen name="onboarding/[colaborador]" />
      <Stack.Screen name="expedientes/[colaborador]" />
      <Stack.Screen name="expedientes/[colaborador]/documentos/[documento]" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />


      <Stack.Protected guard={cumpleanosEnabled}>
        <Stack.Screen name="cumpleanos/index" />
        <Stack.Screen name="cumpleanos/[id]" />
      </Stack.Protected>

      {/* Ciclo laboral (backend 2026-09-22): cada ruta profunda protegida
          con el MISMO permiso que exige su endpoint (`utils/modules.ts`). */}
      <Stack.Protected guard={moduloOn('documentos_laborales')}>
        <Stack.Screen name="documentos-laborales/[id]" />
      </Stack.Protected>
      <Stack.Protected guard={moduloOn('contratos')}>
        <Stack.Screen name="contratos/por-vencer" />
      </Stack.Protected>
      <Stack.Protected guard={moduloOn('cierres')}>
        <Stack.Screen name="cierres/[id]" />
      </Stack.Protected>
      <Stack.Protected guard={moduloOn('prestamos')}>
        <Stack.Screen name="prestamos/[id]" />
      </Stack.Protected>
      <Stack.Protected guard={moduloOn('actas')}>
        <Stack.Screen name="actas/index" />
        <Stack.Screen name="actas/[id]" />
      </Stack.Protected>
      <Stack.Protected guard={moduloOn('candidatos')}>
        <Stack.Screen name="candidatos/index" />
        <Stack.Screen name="candidatos/[id]" />
      </Stack.Protected>
      <Stack.Protected guard={moduloOn('reingresos')}>
        <Stack.Screen name="reingresos/index" />
      </Stack.Protected>
    </Stack>
  );
}
