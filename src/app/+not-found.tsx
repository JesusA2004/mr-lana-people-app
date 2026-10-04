import { Stack, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FontSize, Spacing, type ColorPalette } from '@/constants/colors';
import { useEstilos } from '@/theme/ThemeProvider';

export default function NotFoundScreen() {
  const styles = useEstilos(crearEstilos);
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <Text style={styles.title}>Esta pantalla no existe.</Text>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={styles.link}>
          <Text style={styles.linkText}>Volver al inicio</Text>
        </Pressable>
      </View>
    </>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  link: {
    paddingVertical: Spacing.sm,
  },
  linkText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.primary,
  },
});
