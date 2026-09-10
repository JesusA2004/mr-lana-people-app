import { Stack } from 'expo-router';

import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';
import { isFeatureEnabled } from '@/utils/featureFlags';

/**
 * Stack de la experiencia "Gestión RH" (AGENTS.md sección 5): tabs propios
 * + pantallas de detalle de cada bandeja. Vive bajo el segmento real `rh`
 * (sin paréntesis) para que las rutas tengan su propio prefijo de URL
 * (`/rh/...`), necesario para que `resolveResourceRoute` navegue por push
 * sin colisionar con las rutas de Mi espacio.
 *
 * Feature flags profundas (AGENTS.md de este encargo, sección 47): no basta
 * ocultar la card del home — las rutas de cumpleaños/formatos/organigrama
 * también se protegen aquí con `Stack.Protected`, mismo patrón que ya usa
 * `(app)/_layout.tsx`. `useMobileBootstrap` reutiliza la misma query
 * (mismo queryKey/staleTime) que el resto de la app — lectura de caché, no
 * dispara un fetch nuevo.
 */
export default function RhLayout() {
  const bootstrap = useMobileBootstrap(true);
  const cumpleanosEnabled = isFeatureEnabled(bootstrap.data?.features, 'cumpleanos');
  const formatosEnabled = isFeatureEnabled(bootstrap.data?.features, 'formatos');
  const organigramaEnabled = isFeatureEnabled(bootstrap.data?.features, 'organigrama');

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      <Stack.Screen name="solicitudes/[id]" />
      <Stack.Screen name="vacaciones/[id]" />
      <Stack.Screen name="documentos/[id]" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      <Stack.Screen name="incorporaciones/[colaborador]" />
      <Stack.Screen name="colaboradores/[id]" />
      <Stack.Screen name="expedientes/[colaborador]" />
      <Stack.Screen name="expedientes/[colaborador]/documentos/[documento]" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />

      <Stack.Protected guard={cumpleanosEnabled}>
        <Stack.Screen name="cumpleanos/index" />
        <Stack.Screen name="cumpleanos/[id]" />
      </Stack.Protected>

      <Stack.Protected guard={formatosEnabled}>
        <Stack.Screen name="formatos/index" />
        <Stack.Screen name="formatos/generar" />
      </Stack.Protected>

      <Stack.Protected guard={organigramaEnabled}>
        <Stack.Screen name="organizacion/index" />
      </Stack.Protected>
    </Stack>
  );
}
