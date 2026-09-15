import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { FadeInView } from '@/components/FadeInView';
import { PressableScale } from '@/components/PressableScale';
import { SkeletonCardList } from '@/components/SkeletonBlock';
import { StatusBadge } from '@/components/StatusBadge';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';
import { useRhVacantes } from '@/hooks/queries/useRhVacantes';
import type { RhVacante } from '@/types/rhVacante';
import { hasPermission } from '@/utils/capabilities';
import { formatDateLong } from '@/utils/dates';
import { getErrorMessage } from '@/utils/errors';
import { openRhWeb } from '@/utils/openRhWeb';

/**
 * Vacantes — SOLO LECTURA (`GET /api/v1/rh/vacantes`, permiso
 * `vacantes.ver`). El backend no expone crear/editar/cubrir/cancelar desde
 * la API móvil a propósito: esa gestión se queda en el Portal RH web
 * (sección 23). Esta pantalla NUNCA debe dibujar un botón de administración;
 * para eso está el CTA "Abrir Portal RH" al final.
 *
 * Tampoco es un tab principal: se llega desde Inicio → Vacantes.
 */
const ESTADO_FILTERS: { label: string; value: string | 'todos' }[] = [
  { label: 'Todas', value: 'todos' },
  { label: 'Abiertas', value: 'abierta' },
  { label: 'En proceso', value: 'en_proceso' },
  { label: 'Cubiertas', value: 'cubierta' },
  { label: 'Canceladas', value: 'cancelada' },
];

export default function RhVacantesScreen() {
  const router = useRouter();
  const bootstrap = useMobileBootstrap(true);
  const [estado, setEstado] = useState<string | 'todos'>('todos');

  const puedeVer = hasPermission(bootstrap.data?.user.permissions, 'vacantes.ver');
  const params = useMemo(() => ({ estado: estado === 'todos' ? undefined : estado }), [estado]);
  const query = useRhVacantes(params, puedeVer);

  const vacantes = useMemo(() => query.data?.pages.flatMap((page) => page.data) ?? [], [query.data]);
  const total = query.data?.pages[0]?.meta?.total;

  // Fail-closed: sin el permiso real que protege el endpoint, el módulo no
  // existe — nunca se muestra una pantalla que va a responder 403.
  if (!bootstrap.isLoading && !puedeVer) {
    return (
      <View style={styles.container}>
        <AppHeader title="Vacantes" showBack onBackPress={() => router.back()} />
        <View style={styles.deniedWrapper}>
          <Ionicons name="lock-closed-outline" size={32} color={Colors.textMuted} />
          <Text style={styles.deniedText}>No tienes acceso al tablero de vacantes.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Vacantes" showBack onBackPress={() => router.back()} />

      <View style={styles.readOnlyBanner}>
        <Ionicons name="eye-outline" size={16} color={Colors.primaryDark} />
        <Text style={styles.readOnlyText}>Consulta. Abrir, editar o cubrir una vacante se hace en el Portal RH.</Text>
      </View>

      <FlatList
        horizontal
        data={ESTADO_FILTERS}
        keyExtractor={(item) => item.value}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item }) => (
          <PressableScale
            haptic={false}
            onPress={() => setEstado(item.value)}
            style={[styles.filterChip, estado === item.value && styles.filterChipActive] as object}>
            <Text style={[styles.filterLabel, estado === item.value && styles.filterLabelActive]}>{item.label}</Text>
          </PressableScale>
        )}
      />

      <FlatList
        data={vacantes}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={Colors.primary} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        ListHeaderComponent={
          typeof total === 'number' && vacantes.length > 0 ? (
            <Text style={styles.total}>
              {total} {total === 1 ? 'vacante' : 'vacantes'} en tu alcance
            </Text>
          ) : null
        }
        renderItem={({ item, index }) => (
          <FadeInView index={index}>
            <VacanteCard vacante={item} />
          </FadeInView>
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            {query.isFetchingNextPage ? <Text style={styles.footerLoadingText}>Cargando más…</Text> : null}
            {vacantes.length > 0 ? (
              <PressableScale onPress={() => void openRhWeb('rh/vacantes')} style={styles.webCta}>
                <Ionicons name="open-outline" size={18} color={Colors.primaryDark} />
                <Text style={styles.webCtaText}>Abrir Portal RH para gestionar vacantes</Text>
              </PressableScale>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          query.isLoading ? (
            <SkeletonCardList count={4} />
          ) : query.isError ? (
            <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />
          ) : (
            <View style={styles.empty}>
              <Ionicons name="briefcase-outline" size={28} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No hay vacantes con ese filtro.</Text>
            </View>
          )
        }
      />
    </View>
  );
}

function VacanteCard({ vacante }: { vacante: RhVacante }) {
  const meta = [vacante.departamento, vacante.sucursal].filter(Boolean).join(' · ');

  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {vacante.puesto ?? 'Puesto sin nombre'}
        </Text>
        <StatusBadge status={vacante.estado} label={vacante.estado_etiqueta} />
      </View>

      {meta ? <Text style={styles.cardMeta}>{meta}</Text> : null}
      {vacante.motivo ? <Text style={styles.cardMotivo}>Motivo: {vacante.motivo}</Text> : null}

      <View style={styles.plazasRow}>
        <PlazaTile label="Requeridas" value={vacante.plazas_requeridas} />
        <PlazaTile label="Cubiertas" value={vacante.plazas_cubiertas} />
        <PlazaTile label="Disponibles" value={vacante.plazas_disponibles} highlight />
      </View>

      <View style={styles.cardFooter}>
        {vacante.fecha_apertura ? <Text style={styles.cardFooterText}>Abierta el {formatDateLong(vacante.fecha_apertura)}</Text> : null}
        <View style={styles.badgeRow}>
          {vacante.generada_automaticamente ? (
            <View style={styles.tag}>
              <Ionicons name="flash-outline" size={12} color={Colors.primaryDark} />
              <Text style={styles.tagText}>Automática</Text>
            </View>
          ) : null}
          <View style={styles.tag}>
            <Ionicons name="people-outline" size={12} color={Colors.primaryDark} />
            <Text style={styles.tagText}>
              {vacante.candidatos_count} {vacante.candidatos_count === 1 ? 'candidato' : 'candidatos'}
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );
}

function PlazaTile({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <View style={[styles.plazaTile, highlight && styles.plazaTileHighlight]}>
      <Text style={[styles.plazaValue, highlight && styles.plazaValueHighlight]}>{value}</Text>
      <Text style={styles.plazaLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  readOnlyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
  },
  readOnlyText: { flex: 1, fontSize: FontSize.xs, color: Colors.text },
  filterRow: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, gap: Spacing.sm },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted },
  filterLabelActive: { color: Colors.white },
  listContent: { padding: Spacing.lg, paddingTop: 0, flexGrow: 1 },
  total: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600', marginBottom: Spacing.md },
  card: { gap: Spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.sm },
  cardTitle: { flex: 1, fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  cardMeta: { fontSize: FontSize.xs, color: Colors.textMuted },
  cardMotivo: { fontSize: FontSize.xs, color: Colors.textMuted },
  plazasRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  plazaTile: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
  },
  plazaTileHighlight: { backgroundColor: Colors.primarySoft },
  plazaValue: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  plazaValueHighlight: { color: Colors.primaryDark },
  plazaLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '600' },
  cardFooter: { gap: Spacing.sm, marginTop: Spacing.xs },
  cardFooterText: { fontSize: FontSize.xs, color: Colors.textMuted },
  badgeRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.primarySoft,
  },
  tagText: { fontSize: 11, fontWeight: '700', color: Colors.primaryDark },
  footer: { paddingTop: Spacing.lg, gap: Spacing.md, alignItems: 'center' },
  footerLoadingText: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600' },
  webCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  webCtaText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primaryDark },
  empty: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xxl },
  emptyText: { fontSize: FontSize.sm, color: Colors.textMuted },
  deniedWrapper: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.lg },
  deniedText: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center' },
});
