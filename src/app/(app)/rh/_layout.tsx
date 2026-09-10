import { Stack } from 'expo-router';

/**
 * Stack de la experiencia "Gestión RH" (AGENTS.md sección 5): tabs propios
 * + pantallas de detalle de cada bandeja. Vive bajo el segmento real `rh`
 * (sin paréntesis) para que las rutas tengan su propio prefijo de URL
 * (`/rh/...`), necesario para que `resolveResourceRoute` navegue por push
 * sin colisionar con las rutas de Mi espacio.
 */
export default function RhLayout() {
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
    </Stack>
  );
}
