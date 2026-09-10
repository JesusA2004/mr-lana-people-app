import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { FadeInView } from '@/components/FadeInView';
import { MascotAssistant } from '@/components/mascot/MascotAssistant';
import { PressableScale } from '@/components/PressableScale';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { RhPendienteCard } from '@/components/RhPendienteCard';
import { SkeletonBlock, SkeletonCardList } from '@/components/SkeletonBlock';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { useRhDashboard } from '@/hooks/queries/useRhDashboard';
import { useAuthStore } from '@/store/authStore';
import { getErrorMessage } from '@/utils/errors';
import { joinName } from '@/utils/formatters';
import { rhPendienteDetailRoute } from '@/utils/rhRoutes';

const HEADER_TOP_EXTRA = 20;

export default function RhDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);

  const { data, isLoading, isError, error, refetch, isRefetching } = useRhDashboard(true);

  const nombre = joinName(user?.nombre, user?.apellidos);
  const primerNombre = nombre?.split(' ')[0];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + HEADER_TOP_EXTRA }]}>
        <ProfileAvatar name={nombre} size={44} />
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>Gestión RH</Text>
          <Text style={styles.name} numberOfLines={1}>
            {primerNombre ?? 'Equipo RH'}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={Colors.primary} />}>
        {isLoading ? (
          <View style={styles.skeletonWrapper}>
            <SkeletonBlock height={110} radius={Radius.lg} />
            <SkeletonCardList count={3} />
          </View>
        ) : isError ? (
          <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
        ) : !data ? null : (
          <>
            <View style={styles.statGrid}>
              <StatTile label="Pendientes" value={data.resumen.pendientes_total} highlight onPress={() => router.push('/(app)/rh/(tabs)/pendientes')} />
              <StatTile label="Solicitudes" value={data.resumen.solicitudes} onPress={() => router.push('/(app)/rh/(tabs)/pendientes')} />
              <StatTile label="Vacaciones" value={data.resumen.vacaciones} onPress={() => router.push('/(app)/rh/(tabs)/pendientes')} />
              <StatTile label="Documentos" value={data.resumen.documentos} onPress={() => router.push('/(app)/rh/(tabs)/pendientes')} />
            </View>

            <Text style={styles.sectionTitle}>Urgentes</Text>
            {data.urgentes.length === 0 ? (
              <Card style={styles.emptyCard}>
                <MascotAssistant message="No hay pendientes urgentes por ahora. Buen trabajo." type="tip" dismissible={false} />
              </Card>
            ) : (
              <View style={styles.list}>
                {data.urgentes.map((pendiente, index) => (
                  <FadeInView key={pendiente.id} index={index}>
                    <RhPendienteCard pendiente={pendiente} onPress={() => router.push(rhPendienteDetailRoute(pendiente) as never)} />
                  </FadeInView>
                ))}
              </View>
            )}

            <Text style={styles.sectionTitle}>Recientes</Text>
            {data.recientes.length === 0 ? (
              <Card style={styles.emptyCard}>
                <View style={styles.emptyRow}>
                  <Ionicons name="checkmark-done-circle-outline" size={22} color={Colors.textMuted} />
                  <Text style={styles.emptyText}>Sin actividad reciente.</Text>
                </View>
              </Card>
            ) : (
              <View style={styles.list}>
                {data.recientes.map((pendiente, index) => (
                  <FadeInView key={pendiente.id} index={index}>
                    <RhPendienteCard pendiente={pendiente} onPress={() => router.push(rhPendienteDetailRoute(pendiente) as never)} />
                  </FadeInView>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function StatTile({ label, value, highlight = false, onPress }: { label: string; value: number; highlight?: boolean; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} style={[styles.statTile, highlight && styles.statTileHighlight]}>
      <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerText: {
    flexShrink: 1,
    gap: 1,
  },
  eyebrow: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  name: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: 0,
    gap: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  skeletonWrapper: {
    gap: Spacing.lg,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  statTile: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: 2,
  },
  statTileHighlight: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primarySoft,
  },
  statValue: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
  },
  statValueHighlight: {
    color: Colors.primaryDark,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  list: {
    gap: Spacing.md,
  },
  emptyCard: {
    gap: Spacing.sm,
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
});
