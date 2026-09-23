import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ErrorState';
import { FadeInView } from '@/components/FadeInView';
import { EmptyState } from '@/components/EmptyState';
import { PressableScale } from '@/components/PressableScale';
import { RhPendienteCard } from '@/components/RhPendienteCard';
import { SkeletonCardList } from '@/components/SkeletonBlock';
import { Colors, FontSize, Layout, Radius, Spacing } from '@/constants/colors';
import { useRhPendientesInfinite } from '@/hooks/queries/useRhPendientes';
import type { RhPendienteFiltro } from '@/types/rh';
import { getErrorMessage } from '@/utils/errors';
import { rhPendienteDetailRoute } from '@/utils/rhRoutes';

const FILTERS: { label: string; value: RhPendienteFiltro }[] = [
  { label: 'Todos', value: 'todos' },
  { label: 'Solicitudes', value: 'solicitud' },
  { label: 'Vacaciones', value: 'vacaciones' },
  { label: 'Documentos', value: 'documento' },
  { label: 'Incorporaciones', value: 'incorporacion' },
];

/** Bandeja RH unificada (AGENTS.md sección 7): filtros + búsqueda + paginación real, siempre resueltos por el backend. */
export default function RhPendientesScreen() {
  const router = useRouter();
  const [tipo, setTipo] = useState<RhPendienteFiltro>('todos');
  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    const handle = setTimeout(() => setQ(searchInput.trim()), 350);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const params = useMemo(() => ({ tipo: tipo === 'todos' ? undefined : tipo, q: q || undefined }), [tipo, q]);
  const { data, isLoading, isError, error, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useRhPendientesInfinite(
    params,
    true,
  );

  const pendientes = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);

  return (
    <View style={styles.container}>
      <AppHeader title="Pendientes" subtitle={data?.pages[0]?.meta.total ? `${data.pages[0].meta.total} en total` : undefined} />

      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
        <TextInput
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Nombre, número de empleado o folio"
          placeholderTextColor={Colors.textMuted}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Buscar en pendientes"
        />
        {searchInput ? (
          <PressableScale haptic={false} accessibilityLabel="Limpiar búsqueda" onPress={() => setSearchInput('')}>
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </PressableScale>
        ) : null}
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
            onPress={() => setTipo(item.value)}
            style={[styles.filterChip, tipo === item.value && styles.filterChipActive] as object}>
            <Text style={[styles.filterLabel, tipo === item.value && styles.filterLabelActive]}>{item.label}</Text>
          </PressableScale>
        )}
      />

      <FlatList
        data={pendientes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={Colors.primary} />}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
        }}
        renderItem={({ item, index }) => (
          <FadeInView index={index % 8}>
            <RhPendienteCard pendiente={item} onPress={() => router.push(rhPendienteDetailRoute(item) as never)} />
          </FadeInView>
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
          ) : tipo === 'todos' && !q ? (
            <EmptyState icon="checkmark-done-circle-outline" message="No hay pendientes por revisar. ¡Buen trabajo!" />
          ) : (
            <View style={styles.emptyFilter}>
              <Text style={styles.emptyFilterText}>No hay pendientes que coincidan.</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    alignSelf: 'center',
    padding: Spacing.lg,
    paddingTop: 0,
    flexGrow: 1,
  },
  emptyFilter: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
  emptyFilterText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
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
