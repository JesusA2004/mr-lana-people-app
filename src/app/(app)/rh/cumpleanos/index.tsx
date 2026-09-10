import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ErrorState';
import { MascotAssistant } from '@/components/mascot/MascotAssistant';
import { PressableScale } from '@/components/PressableScale';
import { RhBirthdayCard } from '@/components/RhBirthdayCard';
import { SkeletonCardList } from '@/components/SkeletonBlock';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { useRhCumpleanosInfinite } from '@/hooks/queries/useRhCumpleanos';
import type { RhBirthdayPeriodo } from '@/types/rhBirthday';
import { getErrorMessage } from '@/utils/errors';

const FILTERS: { label: string; value: RhBirthdayPeriodo }[] = [
  { label: 'Hoy', value: 'hoy' },
  { label: '7 días', value: '7_dias' },
  { label: '30 días', value: '30_dias' },
  { label: 'Mes', value: 'mes' },
];

/**
 * Bandeja de cumpleaños RH (AGENTS.md de este encargo, sección 5): versión
 * pensada para teléfono, no el calendario de 7 columnas del panel web.
 * Filtros + búsqueda + paginación real, igual patrón que `RhPendientesScreen`.
 */
export default function RhCumpleanosListScreen() {
  const router = useRouter();
  // Deep link de push (`rh_cumpleanos` sin resource_id, ver `utils/appLinks.ts`): preselecciona el filtro.
  const { periodo: periodoParam } = useLocalSearchParams<{ periodo?: string }>();
  const [periodo, setPeriodo] = useState<RhBirthdayPeriodo>(
    (['hoy', '7_dias', '30_dias', 'mes'] as const).includes(periodoParam as RhBirthdayPeriodo) ? (periodoParam as RhBirthdayPeriodo) : 'hoy',
  );
  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    const handle = setTimeout(() => setQ(searchInput.trim()), 350);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const params = useMemo(() => ({ periodo, q: q || undefined }), [periodo, q]);
  const { data, isLoading, isError, error, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useRhCumpleanosInfinite(
    params,
    true,
  );

  const items = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);
  const meta = data?.pages[0]?.meta;

  return (
    <View style={styles.container}>
      <AppHeader title="Cumpleaños" showBack onBackPress={() => router.back()} />

      {meta ? (
        <View style={styles.statsRow}>
          <StatChip icon="today-outline" label="Hoy" value={meta.hoy} />
          <StatChip icon="calendar-outline" label="7 días" value={meta.proximos_7_dias} />
          <StatChip icon="calendar-clear-outline" label="30 días" value={meta.proximos_30_dias} />
        </View>
      ) : null}

      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
        <TextInput
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Nombre o número de empleado"
          placeholderTextColor={Colors.textMuted}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Buscar en cumpleaños"
        />
      </View>

      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={(item) => item.value}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item }) => (
          <PressableScale
            haptic={false}
            accessibilityLabel={item.label}
            onPress={() => setPeriodo(item.value)}
            style={[styles.filterChip, periodo === item.value && styles.filterChipActive] as object}>
            <Text style={[styles.filterLabel, periodo === item.value && styles.filterLabelActive]}>{item.label}</Text>
          </PressableScale>
        )}
      />

      <FlatList
        data={items}
        keyExtractor={(item) => `${item.colaborador.id}-${item.greeting_id ?? 'sin-tarjeta'}`}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={Colors.primary} />}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
        }}
        renderItem={({ item }) => (
          <RhBirthdayCard
            item={item}
            onPress={() =>
              item.greeting_id
                ? router.push(`/(app)/rh/cumpleanos/${item.greeting_id}` as never)
                : undefined
            }
          />
        )}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footerLoading}>
              <Text style={styles.footerLoadingText}>Cargando más…</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          isLoading ? (
            <SkeletonCardList count={4} />
          ) : isError ? (
            <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
          ) : (
            <MascotAssistant message="No hay cumpleaños en este periodo." type="tip" dismissible={false} />
          )
        }
      />
    </View>
  );
}

function StatChip({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: number }) {
  return (
    <View style={styles.statChip}>
      <Ionicons name={icon} size={14} color={Colors.primaryDark} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  statChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  statValue: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
    flexShrink: 1,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  filterRow: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  filterLabelActive: {
    color: Colors.white,
  },
  listContent: {
    padding: Spacing.lg,
    paddingTop: 0,
    flexGrow: 1,
  },
  footerLoading: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  footerLoadingText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
  },
});
