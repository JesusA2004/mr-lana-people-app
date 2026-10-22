import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { FiltroChips } from '@/components/FiltroChips';
import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ErrorState';
import { FadeInView } from '@/components/FadeInView';
import { EmptyState } from '@/components/EmptyState';
import { RhPendienteCard } from '@/components/RhPendienteCard';
import { SkeletonCardList } from '@/components/SkeletonBlock';
import { CampoBusqueda } from '@/components/ui/CampoBusqueda';
import { FontSize, Layout, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';
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
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const [tipo, setTipo] = useState<RhPendienteFiltro>('todos');
  // «Vacaciones» es la tabla LEGACY (las nuevas llegan en Solicitudes): el
  // filtro solo aparece mientras quede alguna por cerrar (contador del backend).
  const bootstrap = useMobileBootstrap(true);
  const vacacionesLegacy = bootstrap.data?.counts.rh_vacaciones ?? 0;
  const filtros = useMemo(() => FILTERS.filter((f) => f.value !== 'vacaciones' || vacacionesLegacy > 0 || tipo === 'vacaciones'), [vacacionesLegacy, tipo]);
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

  // Sin duplicados: si entra un pendiente nuevo mientras se pagina, la
  // página siguiente repite el último de la anterior (misma key).
  const pendientes = useMemo(() => {
    const vistos = new Set<string>();
    return (data?.pages.flatMap((page) => page.data) ?? []).filter((p) => {
      if (vistos.has(p.id)) return false;
      vistos.add(p.id);
      return true;
    });
  }, [data]);

  return (
    <View style={styles.container}>
      <AppHeader title="Pendientes" subtitle={data?.pages[0]?.meta.total ? `${data.pages[0].meta.total} en total` : undefined} />

      <CampoBusqueda
        value={searchInput}
        onChangeText={setSearchInput}
        placeholder="Nombre, número de empleado o folio"
        accessibilityLabel="Buscar en pendientes"
        style={styles.searchWrapper}
      />

      <FiltroChips opciones={filtros} valor={tipo} onChange={setTipo} />

      <FlatList
        data={pendientes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
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
            <EmptyState
              icon="search-outline"
              title="Sin coincidencias"
              message="No hay pendientes que coincidan con tu búsqueda o filtro."
              actionLabel="Quitar filtros"
              onAction={() => {
                setTipo('todos');
                setSearchInput('');
              }}
            />
          )
        }
      />
    </View>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchWrapper: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  listContent: {
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    alignSelf: 'center',
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
