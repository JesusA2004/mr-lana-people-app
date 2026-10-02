import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { BirthdayCelebration } from '@/components/BirthdayCelebration';
import { ErrorState } from '@/components/ErrorState';
import { SkeletonBlock } from '@/components/SkeletonBlock';
import { Colors, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useEstilos } from '@/theme/ThemeProvider';
import { useBirthdayGreeting } from '@/hooks/queries/useBirthday';
import { useAuthStore } from '@/store/authStore';
import { getErrorMessage } from '@/utils/errors';
import { joinName } from '@/utils/formatters';

/**
 * `GET /colaborador/cumpleanos/felicitacion-actual` (AGENTS.md sección 31).
 * Se llega aquí desde el hero del Dashboard, el push `cumpleanos` y el
 * modal automático de primera vez del día (`useBirthdayAutoCelebration`).
 */
export default function CumpleanosScreen() {
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { data: greeting, isLoading, isError, error, refetch } = useBirthdayGreeting(true);

  useEffect(() => {
    // Ya no es cumpleaños hoy (la felicitación venció entre que se agendó la
    // navegación y se abrió la pantalla) — nunca dejar una pantalla vacía o rota.
    if (!isLoading && !isError && !greeting) {
      if (router.canGoBack()) router.back();
      else router.replace('/(app)/(tabs)');
    }
  }, [isLoading, isError, greeting, router]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <SkeletonBlock height={220} radius={Radius.xl} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.loading}>
        <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
      </View>
    );
  }

  if (!greeting) return null;

  return <BirthdayCelebration greeting={greeting} nombre={joinName(user?.nombre, user?.apellidos)} />;
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.xl,
    justifyContent: 'center',
  },
});
