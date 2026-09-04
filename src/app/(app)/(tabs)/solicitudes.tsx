import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

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
import { useSolicitudes } from '@/hooks/queries/useSolicitudes';
import type { RequestStatus } from '@/types/request';
import { getErrorMessage } from '@/utils/errors';
import { humanizeRequestStatus } from '@/utils/formatters';

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
  const { data, isLoading, isError, error, refetch, isRefetching } = useSolicitudes();
  const [filter, setFilter] = useState<RequestStatus | 'todas'>('todas');

  const solicitudes = useMemo(() => data ?? [], [data]);
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

      {!isLoading && solicitudes.length > 0 ? (
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
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={Colors.primary} />}
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
          isLoading ? (
            <SkeletonCardList count={4} />
          ) : isError ? (
            <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
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
