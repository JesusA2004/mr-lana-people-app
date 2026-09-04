import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { solicitudesApi } from '@/api/solicitudes';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { ErrorState } from '@/components/ErrorState';
import { FadeInView } from '@/components/FadeInView';
import { MascotAssistant } from '@/components/mascot/MascotAssistant';
import { PressableScale } from '@/components/PressableScale';
import { RequestCard } from '@/components/RequestCard';
import { SkeletonCardList } from '@/components/SkeletonBlock';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { MascotMessages } from '@/constants/mascotMessages';
import type { RequestStatus, Solicitud } from '@/types/request';
import { getErrorMessage, logError } from '@/utils/errors';
import { humanizeRequestStatus } from '@/utils/formatters';

type ViewState = 'loading' | 'success' | 'error';

const FILTERS: { label: string; value: RequestStatus | 'todas' }[] = [
  { label: 'Todas', value: 'todas' },
  { label: humanizeRequestStatus('enviada'), value: 'enviada' },
  { label: humanizeRequestStatus('en_revision'), value: 'en_revision' },
  { label: humanizeRequestStatus('requiere_correccion'), value: 'requiere_correccion' },
  { label: humanizeRequestStatus('aprobada'), value: 'aprobada' },
  { label: humanizeRequestStatus('rechazada'), value: 'rechazada' },
];

export default function SolicitudesScreen() {
  const router = useRouter();
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [state, setState] = useState<ViewState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<RequestStatus | 'todas'>('todas');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setState('loading');
    setErrorMessage(null);
    try {
      const result = await solicitudesApi.getAll();
      setSolicitudes(result);
      setState('success');
    } catch (error) {
      logError('solicitudes.getAll', error);
      setErrorMessage(getErrorMessage(error));
      setState('error');
    } finally {
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  const filtered = useMemo(
    () => (filter === 'todas' ? solicitudes : solicitudes.filter((item) => item.estado === filter)),
    [solicitudes, filter],
  );

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

      {state === 'success' && solicitudes.length > 0 ? (
        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={(item) => item.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          renderItem={({ item }) => (
            <PressableScale
              haptic={false}
              onPress={() => setFilter(item.value)}
              style={[styles.filterChip, filter === item.value && styles.filterChipActive] as object}>
              <Text style={[styles.filterLabel, filter === item.value && styles.filterLabelActive]}>{item.label}</Text>
            </PressableScale>
          )}
        />
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={Colors.primary} />}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
        renderItem={({ item, index }) => (
          <FadeInView index={index}>
            <RequestCard
              solicitud={item}
              onPress={() => router.push({ pathname: '/solicitud/[id]', params: { id: String(item.id) } })}
            />
          </FadeInView>
        )}
        ListEmptyComponent={
          state === 'loading' ? (
            <SkeletonCardList count={4} />
          ) : state === 'error' ? (
            <ErrorState message={errorMessage ?? undefined} onRetry={() => void load()} />
          ) : filter === 'todas' ? (
            <MascotAssistant
              message={MascotMessages.todoTranquilo}
              type="tip"
              dismissible={false}
              actionLabel="Crear solicitud"
              onAction={() => router.push('/solicitud/nueva')}
            />
          ) : (
            <View style={styles.emptyFilter}>
              <Text style={styles.emptyFilterText}>No hay solicitudes con este estado.</Text>
            </View>
          )
        }
      />

      {state === 'success' && solicitudes.length === 0 ? (
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
  emptyFilter: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
  emptyFilterText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  fabWrapper: {
    padding: Spacing.lg,
  },
});
