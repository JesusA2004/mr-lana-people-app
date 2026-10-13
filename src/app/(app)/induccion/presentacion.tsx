import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Screen } from '@/components/ciclo/Screen';
import { VisorPdfPaginado } from '@/components/VisorPdfPaginado';
import { usePresentacionInduccion } from '@/hooks/queries/useInduccion';
import { useColores } from '@/theme/ThemeProvider';

/**
 * Inducción Mr. Lana en MODO PRESENTACIÓN — compartida por colaborador y RH
 * (p. ej. para presentarla por Meet): el PDF oficial, sin registrar el
 * avance de nadie ni habilitar evaluaciones.
 */
export default function PresentacionInduccionScreen() {
  const Colors = useColores();
  const router = useRouter();
  const pdf = usePresentacionInduccion();

  if (!pdf.data) {
    return <Screen title="Inducción Mr. Lana" isLoading={pdf.isLoading} error={pdf.error} onRetry={() => void pdf.refetch()} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <AppHeader title="Inducción Mr. Lana" subtitle="Modo presentación" showBack onBackPress={() => router.back()} />
      <VisorPdfPaginado path={pdf.data.path} cacheName={`induccion-${pdf.data.totalPaginas}.pdf`} titulo={pdf.data.titulo} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
