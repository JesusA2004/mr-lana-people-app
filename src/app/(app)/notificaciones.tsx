import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { notificacionesApi } from '@/api/notificaciones';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { SkeletonCardList } from '@/components/SkeletonBlock';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import type { NotificationItem } from '@/types/notification';
import { formatDateTime } from '@/utils/dates';
import { getErrorMessage, logError } from '@/utils/errors';
import { pickBoolean, pickString } from '@/utils/formatters';

type ViewState = 'loading' | 'success' | 'error';

function isRead(item: NotificationItem): boolean {
  return pickBoolean(item, ['leida']) ?? false;
}

export default function NotificacionesScreen() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [state, setState] = useState<ViewState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setState('loading');
    setErrorMessage(null);
    try {
      const result = await notificacionesApi.getAll();
      const sorted = [...result].sort((a, b) => Number(isRead(a)) - Number(isRead(b)));
      setItems(sorted);
      setState('success');
    } catch (error) {
      logError('notificaciones.getAll', error);
      setErrorMessage(getErrorMessage(error));
      setState('error');
    } finally {
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handlePress = async (item: NotificationItem) => {
    if (isRead(item)) return;

    const previous = items;
    setItems((current) => current.map((n) => (n.id === item.id ? { ...n, leida: true } : n)));

    try {
      await notificacionesApi.markAsRead(item.id);
    } catch (error) {
      logError('notificaciones.markAsRead', error);
      setItems(previous);
      void load(true);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Notificaciones" showBack onBackPress={() => router.back()} />

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={Colors.primary} />}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        renderItem={({ item }) => {
          const read = isRead(item);
          const titulo = pickString(item, ['titulo']) ?? 'Notificación';
          const mensaje = pickString(item, ['mensaje']);
          const fecha = pickString(item, ['creada_en_iso', 'creada_en']);

          return (
            <Pressable onPress={() => void handlePress(item)} style={[styles.item, !read && styles.itemUnread]}>
              <View style={[styles.dot, read && styles.dotRead]} />
              <View style={styles.itemBody}>
                <Text style={[styles.itemTitle, !read && styles.itemTitleUnread]}>{titulo}</Text>
                {mensaje ? <Text style={styles.itemMessage} numberOfLines={3}>{mensaje}</Text> : null}
                {fecha ? <Text style={styles.itemDate}>{item.creada_en_iso ? formatDateTime(fecha) : fecha}</Text> : null}
              </View>
              {!read ? <Ionicons name="ellipse" size={8} color={Colors.primary} /> : null}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          state === 'loading' ? (
            <SkeletonCardList count={4} />
          ) : state === 'error' ? (
            <ErrorState message={errorMessage ?? undefined} onRetry={() => void load()} />
          ) : (
            <EmptyState icon="notifications-outline" title="Sin notificaciones" message="Aquí verás tus notificaciones." />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  listContent: { padding: Spacing.lg, flexGrow: 1 },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  itemUnread: { backgroundColor: Colors.primarySoft, borderColor: Colors.primarySoft },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginTop: 6 },
  dotRead: { backgroundColor: 'transparent' },
  itemBody: { flex: 1, gap: 2 },
  itemTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  itemTitleUnread: { fontWeight: '800' },
  itemMessage: { fontSize: FontSize.sm, color: Colors.textMuted },
  itemDate: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
});
