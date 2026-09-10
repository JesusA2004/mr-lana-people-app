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
import { useRhCumpleanosInfinite } from '@/hooks/queries/useRhCumpleanos';
import { useRhDashboard } from '@/hooks/queries/useRhDashboard';
import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';
import { useAuthStore } from '@/store/authStore';
import { getErrorMessage } from '@/utils/errors';
import { isExperimentalFeatureEnabled, isFeatureEnabled, isOrganigramaEnabled } from '@/utils/featureFlags';
import { joinName } from '@/utils/formatters';
import { rhPendienteDetailRoute } from '@/utils/rhRoutes';

const HEADER_TOP_EXTRA = 20;

/**
 * Home de Gestión RH (AGENTS.md de este encargo, sección 39/64): prioridad
 * 1) pendientes críticos, 2) documentos/revisiones, 3) cumpleaños, 4)
 * accesos secundarios — nunca saturado, cada bloque solo aparece si el
 * feature/permiso correspondiente está habilitado.
 */
export default function RhDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);

  const { data, isLoading, isError, error, refetch, isRefetching } = useRhDashboard(true);
  const bootstrap = useMobileBootstrap(true);
  const cumpleanosEnabled = isFeatureEnabled(bootstrap.data?.features, 'cumpleanos');
  // Formatos/extracción OCR: fail-CLOSED (bug de producto corregido) —
  // ausente = oculto, sin importar que el backend real ya tenga el
  // catálogo/OCR funcionando (ver docs/BACKEND_GAPS_FINAL.md: ambos quedan
  // ocultos hasta que el backend mande el flag explícito, decisión de
  // producto de esta auditoría).
  const formatosEnabled = isExperimentalFeatureEnabled(bootstrap.data?.features, 'formatos');
  const extractionEnabled = isExperimentalFeatureEnabled(bootstrap.data?.features, 'document_extraction');
  const organigramaEnabled = isOrganigramaEnabled(bootstrap.data?.features, bootstrap.data?.user.permissions);

  const cumpleanosHoy = useRhCumpleanosInfinite({ periodo: 'hoy' }, cumpleanosEnabled);
  const hoyCount = cumpleanosHoy.data?.pages[0]?.meta.hoy ?? 0;
  // Nunca inventar el contador: el backend real hoy no manda
  // `counts.rh_document_extractions_pending` — ausente = sin badge, no 0 forzado.
  const extractionsPending = bootstrap.data?.counts.rh_document_extractions_pending;

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

            {extractionEnabled && extractionsPending ? (
              <Card onPress={() => router.push('/(app)/rh/(tabs)/pendientes')} style={styles.ocrCard}>
                <Ionicons name="sparkles-outline" size={20} color={Colors.primaryDark} />
                <View style={styles.ocrTextColumn}>
                  <Text style={styles.ocrTitle}>Documentos con revisión automática</Text>
                  <Text style={styles.ocrSubtitle}>
                    {extractionsPending} {extractionsPending === 1 ? 'documento requiere' : 'documentos requieren'} tu revisión
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              </Card>
            ) : null}

            {cumpleanosEnabled && hoyCount > 0 ? (
              <Card onPress={() => router.push('/(app)/rh/cumpleanos?periodo=hoy' as never)} style={styles.birthdayCard}>
                <Ionicons name="gift-outline" size={20} color={Colors.primaryDark} />
                <View style={styles.ocrTextColumn}>
                  <Text style={styles.ocrTitle}>Cumpleaños de hoy</Text>
                  <Text style={styles.ocrSubtitle}>
                    {hoyCount} {hoyCount === 1 ? 'persona' : 'personas'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              </Card>
            ) : null}

            {formatosEnabled || cumpleanosEnabled || organigramaEnabled ? (
              <>
                <Text style={styles.sectionTitle}>Acciones rápidas</Text>
                <View style={styles.quickGrid}>
                  <QuickAction icon="search-outline" label="Buscar colaborador" onPress={() => router.push('/(app)/rh/(tabs)/colaboradores')} />
                  {formatosEnabled ? (
                    <QuickAction icon="document-text-outline" label="Formatos" onPress={() => router.push('/(app)/rh/formatos' as never)} />
                  ) : null}
                  {cumpleanosEnabled ? (
                    <QuickAction icon="gift-outline" label="Cumpleaños" onPress={() => router.push('/(app)/rh/cumpleanos' as never)} />
                  ) : null}
                  {organigramaEnabled ? (
                    <QuickAction icon="git-network-outline" label="Organización" onPress={() => router.push('/(app)/rh/organizacion' as never)} />
                  ) : null}
                </View>
              </>
            ) : null}

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

function QuickAction({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <PressableScale accessibilityLabel={label} onPress={onPress} style={styles.quickAction}>
      <View style={styles.quickIcon}>
        <Ionicons name={icon} size={20} color={Colors.primaryDark} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
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
  ocrCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primarySoft,
  },
  birthdayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  ocrTextColumn: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  ocrTitle: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.text,
  },
  ocrSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  quickAction: {
    width: '47%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    minHeight: 96,
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
});
