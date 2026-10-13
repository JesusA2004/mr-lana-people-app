import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BirthdayWallBanner } from '@/components/BirthdayWallBanner';
import { Card } from '@/components/Card';
import { ModuleGrid, ModuleTile } from '@/components/ciclo/ModuleTile';
import { ErrorState } from '@/components/ErrorState';
import { FadeInView } from '@/components/FadeInView';
import { PressableScale } from '@/components/PressableScale';
import { RhIdentityBadge } from '@/components/RhIdentityBadge';
import { RhPendienteCard } from '@/components/RhPendienteCard';
import { SkeletonBlock, SkeletonCardList } from '@/components/SkeletonBlock';
import { FontSize, Layout, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';
import { useRhContratosPorVencer } from '@/hooks/queries/useRhCicloLaboral';
import { useRhCumpleanosInfinite } from '@/hooks/queries/useRhCumpleanos';
import { useRhDashboard } from '@/hooks/queries/useRhDashboard';
import { useTareasConteos } from '@/hooks/queries/useTrabajo';
import { useAuthStore } from '@/store/authStore';
import { hasPermission } from '@/utils/capabilities';
import { getErrorMessage } from '@/utils/errors';
import { isExperimentalFeatureEnabled, isFeatureEnabled } from '@/utils/featureFlags';
import { joinName } from '@/utils/formatters';
import { isRhModuleEnabled, type RhModule } from '@/utils/modules';
import { openRhWeb } from '@/utils/openRhWeb';
import { rhPendienteDetailRoute } from '@/utils/rhRoutes';

const HEADER_TOP_EXTRA = 20;

/**
 * Home de Gestión RH. Jerarquía: header con la identidad RH → resumen
 * (solo contadores que entrega el backend) → avisos accionables → accesos
 * principales → operación → gestión y análisis → urgentes/recientes →
 * Portal RH. Cada módulo aparece SOLO con el permiso/feature real.
 */
export default function RhDashboardScreen() {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);

  const { data, isLoading, isError, error, refetch, isRefetching } = useRhDashboard(true);
  const bootstrap = useMobileBootstrap(true);
  // Feature encendido Y permiso: sin `rh.cumpleanos.ver` el backend responde
  // 403, así que ni se pide ni se muestra el acceso.
  const cumpleanosEnabled =
    isFeatureEnabled(bootstrap.data?.features, 'cumpleanos') && hasPermission(bootstrap.data?.user.permissions, 'rh.cumpleanos.ver');
  // Formatos/extracción OCR: fail-CLOSED (bug de producto corregido) —
  // ausente = oculto, sin importar que el backend real ya tenga el
  // catálogo/OCR funcionando (ver docs/BACKEND_GAPS_FINAL.md: ambos quedan
  // ocultos hasta que el backend mande el flag explícito, decisión de
  // producto de esta auditoría).
  const extractionEnabled = isExperimentalFeatureEnabled(bootstrap.data?.features, 'document_extraction');

  const permissions = bootstrap.data?.user.permissions;
  const features = bootstrap.data?.features;
  const moduloOn = (module: RhModule) => isRhModuleEnabled(features, permissions, module);
  const tareas = useTareasConteos(true);
  const tareasCount = tareas.data?.abiertas ?? 0;
  const porVencer = useRhContratosPorVencer(30, moduloOn('contratos'));


  type Modulo = { route: string; icon: keyof typeof Ionicons.glyphMap; label: string; badge?: number };
  const only = (items: (Modulo | false)[]) => items.filter((m): m is Modulo => m !== false);

  // La app de RH es para RESOLVER rápido (web = administrar): solo atajos
  // a lo que se decide desde el teléfono. Nómina, documentos maestros,
  // importadores, reportes, catálogos y configuración viven en el Portal
  // Web (tarjeta «Continuar en el Portal Web»). Cada atajo aparece SOLO
  // con el permiso real que exige su endpoint (`utils/modules.ts`).
  const atajos = only([
    // Mismo permiso que GET /rh/colaboradores; un gerente sin él ve a su gente en «Mi equipo».
    hasPermission(permissions, 'rh.colaboradores.ver') && { route: '/(app)/rh/(tabs)/colaboradores', icon: 'search-outline', label: 'Buscar persona' },
    moduloOn('candidatos') && { route: '/(app)/rh/candidatos', icon: 'people-circle-outline', label: 'Candidatos' },
    moduloOn('evaluaciones') && { route: '/evaluaciones', icon: 'clipboard-outline', label: 'Evaluaciones' },
    // Mismo permiso que GET /rh/cambios-foto (CambioFotoPerfilPolicy).
    hasPermission(permissions, 'expedientes.revisar') && { route: '/(app)/rh/cambios-foto', icon: 'image-outline', label: 'Cambios de foto' },
  ]);

  const cumpleanosHoy = useRhCumpleanosInfinite({ periodo: 'hoy' }, cumpleanosEnabled);
  const hoyCount = cumpleanosHoy.data?.pages[0]?.meta.hoy ?? 0;
  // Nunca inventar el contador: el backend real hoy no manda
  // `counts.rh_document_extractions_pending` — ausente = sin badge, no 0 forzado.
  const extractionsPending = bootstrap.data?.counts.rh_document_extractions_pending;

  const nombre = joinName(user?.nombre, user?.apellidos);
  const puesto = bootstrap.data?.user.puesto?.nombre ?? null;
  const { width } = useWindowDimensions();
  const wide = width >= Layout.twoColumnBreakpoint;

  // Resumen: solo contadores que el backend entrega — nada se calcula aquí.
  type Stat = { key: string; label: string; value: number; highlight?: boolean; route: string };
  const stats: Stat[] = data
    ? [
        { key: 'pendientes', label: 'Pendientes', value: data.resumen.pendientes_total, highlight: true, route: '/(app)/rh/(tabs)/pendientes' },
        ...(moduloOn('contratos') && porVencer.data
          ? [{ key: 'contratos', label: 'Contratos por vencer', value: porVencer.data.contratos.length, route: '/(app)/rh/contratos/por-vencer' }]
          : []),
        { key: 'documentos', label: 'Documentos por revisar', value: data.resumen.documentos, route: '/(app)/rh/(tabs)/pendientes' },
        { key: 'incorporaciones', label: 'Incorporaciones', value: data.resumen.incorporaciones, route: '/(app)/rh/(tabs)/pendientes' },
      ]
    : [];

  const open = (route: string) => router.push(route as never);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + HEADER_TOP_EXTRA }]}>
        <View style={styles.headerInner}>
          <RhIdentityBadge size="lg" animated accessibilityLabel="Gestión RH" />
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>Gestión RH</Text>
            <Text style={styles.name} numberOfLines={1}>
              {nombre ?? 'Equipo RH'}
            </Text>
            {puesto ? (
              <Text style={styles.puesto} numberOfLines={1}>
                {puesto}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={Colors.primary} />}>
        <View style={styles.inner}>
          {isLoading ? (
            <View style={styles.skeletonWrapper}>
              <SkeletonBlock height={110} radius={Radius.lg} />
              <SkeletonCardList count={3} />
            </View>
          ) : isError ? (
            <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
          ) : !data ? null : (
            <>
              {/* "Vacaciones" YA NO es un contador propio: `resumen.vacaciones`
                  es de la tabla LEGACY; las vacaciones nuevas cuentan dentro
                  de `resumen.solicitudes` (sección 35). */}
              <View style={styles.statGrid}>
                {stats.map((stat) => (
                  <StatTile key={stat.key} label={stat.label} value={stat.value} highlight={stat.highlight} wide={wide} onPress={() => open(stat.route)} />
                ))}
              </View>

              {data.resumen.vacaciones > 0 ? (
                <Card onPress={() => open('/(app)/rh/(tabs)/pendientes')} style={styles.legacyCard}>
                  <Ionicons name="airplane-outline" size={20} color={Colors.textMuted} />
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>
                      {data.resumen.vacaciones} {data.resumen.vacaciones === 1 ? 'vacación anterior' : 'vacaciones anteriores'} por cerrar
                    </Text>
                    <Text style={styles.rowSubtitle}>Las vacaciones nuevas llegan dentro de Solicitudes.</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                </Card>
              ) : null}

              {extractionEnabled && extractionsPending ? (
                <Card onPress={() => open('/(app)/rh/(tabs)/pendientes')} style={styles.accentCard}>
                  <Ionicons name="sparkles-outline" size={20} color={Colors.primaryDark} />
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>Documentos con revisión automática</Text>
                    <Text style={styles.rowSubtitle}>
                      {extractionsPending} {extractionsPending === 1 ? 'documento requiere' : 'documentos requieren'} tu revisión
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                </Card>
              ) : null}

              {tareasCount > 0 ? (
                <Card onPress={() => open('/tareas')} style={styles.accentCard}>
                  <Ionicons name="checkbox-outline" size={20} color={Colors.primaryDark} />
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>Bandeja de tareas</Text>
                    <Text style={styles.rowSubtitle}>
                      {tareasCount} {tareasCount === 1 ? 'tarea abierta' : 'tareas abiertas'}
                      {tareas.data?.vencidas ? ` · ${tareas.data.vencidas} vencida(s)` : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                </Card>
              ) : null}

              {cumpleanosEnabled && hoyCount > 0 ? (
                <Card onPress={() => open('/(app)/rh/cumpleanos?periodo=hoy')} style={styles.rowCard}>
                  <Ionicons name="gift-outline" size={20} color={Colors.celebration} />
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>Cumpleaños de hoy</Text>
                    <Text style={styles.rowSubtitle}>
                      {hoyCount} {hoyCount === 1 ? 'persona' : 'personas'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                </Card>
              ) : null}

              <Text style={styles.sectionTitle} accessibilityRole="header">
                Pendientes importantes
              </Text>
              {data.urgentes.length === 0 ? (
                <Card>
                  <View style={styles.emptyRow}>
                    <Ionicons name="checkmark-circle-outline" size={22} color={Colors.success} />
                    <Text style={styles.emptyText}>No hay pendientes urgentes por ahora.</Text>
                  </View>
                </Card>
              ) : (
                <View style={styles.list}>
                  {data.urgentes.slice(0, 5).map((pendiente, index) => (
                    <FadeInView key={pendiente.id} index={index}>
                      <RhPendienteCard pendiente={pendiente} onPress={() => open(rhPendienteDetailRoute(pendiente))} />
                    </FadeInView>
                  ))}
                </View>
              )}


              <BirthdayWallBanner enabled={cumpleanosEnabled} />

              <ModuleSection title="Resolver" modulos={atajos} onOpen={open} />

              {/* Administración (nómina, documentos maestros, altas,
                  importaciones, reportes, configuración): Portal Web. */}
              <PressableScale
                onPress={() => void openRhWeb()}
                style={styles.webCta}
                accessibilityRole="link"
                accessibilityLabel="Continuar en el Portal Web">
                <Ionicons name="open-outline" size={18} color={Colors.primaryDark} />
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>Continuar en el Portal Web</Text>
                  <Text style={styles.rowSubtitle}>Nómina, documentos, altas, reportes y configuración se administran ahí.</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              </PressableScale>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

type ModuloItem = { route: string; icon: keyof typeof Ionicons.glyphMap; label: string; badge?: number };

function ModuleSection({ title, modulos, onOpen }: { title: string; modulos: ModuloItem[]; onOpen: (route: string) => void }) {
  const styles = useEstilos(crearEstilos);
  if (modulos.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      <ModuleGrid>
        {modulos.map((modulo) => (
          <ModuleTile key={modulo.route} icon={modulo.icon} label={modulo.label} badge={modulo.badge} onPress={() => onOpen(modulo.route)} />
        ))}
      </ModuleGrid>
    </View>
  );
}

function StatTile({ label, value, highlight = false, wide, onPress }: { label: string; value: number; highlight?: boolean; wide: boolean; onPress: () => void }) {
  const styles = useEstilos(crearEstilos);
  return (
    <PressableScale
      accessibilityLabel={`${label}: ${value}`}
      onPress={onPress}
      style={[styles.statTile, wide && styles.statTileWide, highlight && styles.statTileHighlight]}>
      <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>{value}</Text>
      <Text style={[styles.statLabel, highlight && styles.statLabelHighlight]} numberOfLines={2}>
        {label}
      </Text>
    </PressableScale>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  headerInner: {
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  eyebrow: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.rhInk,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  name: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
  },
  puesto: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  inner: {
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    alignSelf: 'center',
    gap: Spacing.lg,
  },
  skeletonWrapper: {
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.md,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  statTile: {
    flexBasis: '46%',
    flexGrow: 1,
    minHeight: Layout.minTouchTarget,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: 2,
  },
  statTileWide: {
    flexBasis: '22%',
  },
  statTileHighlight: {
    backgroundColor: Colors.rhInk,
    borderColor: Colors.rhInk,
  },
  statValue: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
  },
  statValueHighlight: {
    color: Colors.onRhInk,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  statLabelHighlight: {
    color: Colors.onRhInk,
    opacity: 0.85,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  list: {
    gap: Spacing.md,
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  accentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primarySoft,
  },
  legacyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceMuted,
    borderColor: Colors.border,
  },
  webCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowTitle: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.text,
  },
  rowSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
  },
});
