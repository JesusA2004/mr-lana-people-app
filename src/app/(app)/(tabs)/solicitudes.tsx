import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { FiltroChips } from '@/components/FiltroChips';
import { Button } from '@/components/Button';
import { AppHeader } from '@/components/AppHeader';
import { BarraAccionInferior } from '@/components/BarraAccionInferior';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { FadeInView } from '@/components/FadeInView';
import { MascotAssistant } from '@/components/mascot/MascotAssistant';
import { PressableScale } from '@/components/PressableScale';
import { RequestCard } from '@/components/RequestCard';
import { SkeletonCardList } from '@/components/SkeletonBlock';
import { CampoBusqueda } from '@/components/ui/CampoBusqueda';
import { FontSize, Layout, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
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
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
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
        <CampoBusqueda value={search} onChangeText={setSearch} placeholder="Buscar por folio o tipo" style={styles.searchWrapper} />
      ) : null}

      {!isLoading && solicitudes.length > 0 ? (
        <>
          <FiltroChips opciones={FAMILY_FILTERS} valor={family} onChange={setFamily} />
          <FiltroChips opciones={STATUS_FILTERS} valor={estado} onChange={setEstado} />
        </>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
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
            <EmptyState
              icon="search-outline"
              title="Sin resultados"
              message="Ninguna solicitud coincide con tu búsqueda o filtros."
              actionLabel="Quitar filtros"
              onAction={() => {
                setFamily('todas');
                setEstado('todos');
                setSearch('');
              }}
            />
          )
        }
      />

      {!isLoading && solicitudes.length === 0 ? (
        <BarraAccionInferior sobreTeclado={false}>
          <Button title="Nueva solicitud" leftIcon="add-circle-outline" onPress={() => router.push('/solicitud/nueva')} />
        </BarraAccionInferior>
      ) : null}
    </View>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  newButton: {
    width: Layout.minTouchTarget,
    height: Layout.minTouchTarget,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
