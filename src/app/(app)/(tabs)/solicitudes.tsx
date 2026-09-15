import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ErrorState';
import { FadeInView } from '@/components/FadeInView';
import { MascotAssistant } from '@/components/mascot/MascotAssistant';
import { PressableScale } from '@/components/PressableScale';
import { RequestCard } from '@/components/RequestCard';
import { SkeletonCardList } from '@/components/SkeletonBlock';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { MascotMessages } from '@/constants/mascotMessages';
import { requestFamily, type RequestFamily } from '@/constants/requestTypes';
import { useSolicitudesInfinite } from '@/hooks/queries/useSolicitudes';
import type { RequestStatus, Solicitud } from '@/types/request';
import { getErrorMessage } from '@/utils/errors';
import { humanizeRequestStatus } from '@/utils/formatters';

/**
 * Filtros por FAMILIA de tipo (sección 48). Vacaciones aparece aquí como una
 * familia más porque ya es una solicitud unificada: la pantalla "Mis
 * vacaciones" es la misma lista con este filtro fijo, no otro módulo.
 */
const FAMILY_FILTERS: { label: string; value: RequestFamily | 'todas' }[] = [
  { label: 'Todas', value: 'todas' },
  { label: 'Vacaciones', value: 'vacaciones' },
  { label: 'Permisos', value: 'permisos' },
  { label: 'Incapacidades', value: 'incapacidades' },
  { label: 'Préstamos', value: 'prestamos' },
  { label: 'Otras', value: 'otras' },
];

const STATUS_FILTERS: { label: string; value: RequestStatus | 'todos' }[] = [
  { label: 'Cualquier estado', value: 'todos' },
  { label: humanizeRequestStatus('enviada'), value: 'enviada' },
  { label: humanizeRequestStatus('en_revision'), value: 'en_revision' },
  { label: humanizeRequestStatus('requiere_correccion'), value: 'requiere_correccion' },
  { label: humanizeRequestStatus('aprobada'), value: 'aprobada' },
  { label: humanizeRequestStatus('rechazada'), value: 'rechazada' },
  { label: humanizeRequestStatus('cancelada'), value: 'cancelada' },
];

function matchesSearch(solicitud: Solicitud, query: string): boolean {
  if (!query) return true;
  const haystack = `${solicitud.folio ?? ''} ${solicitud.tipo_etiqueta ?? solicitud.tipo ?? ''} ${solicitud.motivo ?? ''}`.toLowerCase();
  return haystack.includes(query.toLowerCase());
}

export default function SolicitudesScreen() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useSolicitudesInfinite();
  const [family, setFamily] = useState<RequestFamily | 'todas'>('todas');
  const [estado, setEstado] = useState<RequestStatus | 'todos'>('todos');
  const [search, setSearch] = useState('');

  const solicitudes = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);
  const filtered = useMemo(
    () =>
      solicitudes.filter(
        (item) =>
          (family === 'todas' || requestFamily(item.tipo) === family) &&
          (estado === 'todos' || item.estado === estado) &&
          matchesSearch(item, search),
      ),
    [solicitudes, family, estado, search],
  );
  const hasActiveFilter = family !== 'todas' || estado !== 'todos' || Boolean(search);

  return (
    <View style={styles.container}>
      <AppHeader
        title="Mis solicitudes"
        right={
          <PressableScale
            accessibilityLabel="Nueva solicitud"
            onPress={() => router.push('/solicitud/nueva')}
            style={styles.newButton}>
            <Ionicons name="add" size={22} color={Colors.white} />
          </PressableScale>
        }
      />

      {!isLoading && solicitudes.length > 0 ? (
        <View style={styles.searchWrapper}>
          <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por folio o tipo"
            placeholderTextColor={Colors.textMuted}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search ? (
            <PressableScale haptic={false} accessibilityLabel="Limpiar búsqueda" onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </PressableScale>
          ) : null}
        </View>
      ) : null}

      {!isLoading && solicitudes.length > 0 ? (
        <>
          <FlatList
            horizontal
            data={FAMILY_FILTERS}
            keyExtractor={(item) => item.value}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
            renderItem={({ item }) => (
              <PressableScale
                haptic={false}
                onPress={() => setFamily(item.value)}
                style={[styles.filterChip, family === item.value && styles.filterChipActive] as object}>
                <Text style={[styles.filterLabel, family === item.value && styles.filterLabelActive]}>{item.label}</Text>
              </PressableScale>
            )}
          />
          <FlatList
            horizontal
            data={STATUS_FILTERS}
            keyExtractor={(item) => item.value}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
            renderItem={({ item }) => (
              <PressableScale
                haptic={false}
                onPress={() => setEstado(item.value)}
                style={[styles.statusChip, estado === item.value && styles.statusChipActive] as object}>
                <Text style={[styles.statusLabel, estado === item.value && styles.statusLabelActive]}>{item.label}</Text>
              </PressableScale>
            )}
          />
        </>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={Colors.primary} />}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
        }}
        renderItem={({ item, index }) => (
          <FadeInView index={index}>
            <RequestCard
              solicitud={item}
              onPress={() => router.push({ pathname: '/solicitud/[id]', params: { id: String(item.id) } })}
            />
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
          ) : !hasActiveFilter ? (
            <MascotAssistant
              message={MascotMessages.todoTranquilo}
              type="tip"
              dismissible={false}
              actionLabel="Crear solicitud"
              onAction={() => router.push('/solicitud/nueva')}
            />
          ) : (
            <View style={styles.emptyFilter}>
              <Text style={styles.emptyFilterText}>No hay solicitudes que coincidan.</Text>
            </View>
          )
        }
      />

      {!isLoading && solicitudes.length === 0 ? (
        <View style={styles.fabWrapper}>
          <Button title="Nueva solicitud" onPress={() => router.push('/solicitud/nueva')} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  newButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
  statusChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceMuted,
    marginRight: Spacing.sm,
  },
  statusChipActive: {
    backgroundColor: Colors.primarySoft,
  },
  statusLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  statusLabelActive: {
    color: Colors.primaryDark,
    fontWeight: '800',
  },
  listContent: {
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
  fabWrapper: {
    padding: Spacing.lg,
  },
});
