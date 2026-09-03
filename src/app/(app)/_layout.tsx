import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="solicitud/nueva" options={{ presentation: 'modal' }} />
      <Stack.Screen name="solicitud/[id]" />
      <Stack.Screen name="notificaciones" />
      <Stack.Screen name="configuracion" />
    </Stack>
  );
}
