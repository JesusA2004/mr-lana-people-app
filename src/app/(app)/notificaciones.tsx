import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { notificacionesApi } from '@/api/notificaciones';
import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ErrorState';
import { FadeInView } from '@/components/FadeInView';
import { MascotAssistant } from '@/components/mascot/MascotAssistant';
import { PressableScale } from '@/components/PressableScale';
import { SkeletonCardList } from '@/components/SkeletonBlock';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { MascotMessages } from '@/constants/mascotMessages';
import type { NotificationItem } from '@/types/notification';
import { getErrorMessage, logError } from '@/utils/errors';

type ViewState = 'loading' | 'success' | 'error';
type Tab = 'todas' | 'no_leidas';

const ICON_BY_TYPE: Record<string, keyof typeof Ionicons.glyphMap> = {
  solicitud: 'document-text-outline',
  vacaciones: 'airplane-outline',
  documento: 'folder-open-outline',
  expediente: 'folder-open-outline',
};

function iconFor(tipo?: string | null): keyof typeof Ionicons.glyphMap {
  if (!tipo) return 'notifications-outline';
  return ICON_BY_TYPE[tipo] ?? 'notifications-outline';
}

export default function NotificacionesScreen() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [state, setState] = useState<ViewState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('todas');

  const load = useCallback(async () => {
    setState('loading');
    setErrorMessage(null);
    try {
      const result = await notificacionesApi.getAll();
      setItems(result);
      setState('success');
    } catch (error) {
      logError('notificaciones.getAll', error);
      setErrorMessage(getErrorMessage(error));
      setState('error');
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  const filtered = useMemo(() => (tab === 'no_leidas' ? items.filter((item) => !item.leida) : items), [items, tab]);
  const unreadCount = useMemo(() => items.filter((item) => !item.leida).length, [items]);

  const handlePress = async (item: NotificationItem) => {
    if (!item.leida) {
      const previous = items;
      setItems((current) => current.map((n) => (n.id === item.id ? { ...n, leida: true } : n)));
      try {
        await notificacionesApi.markAsRead(item.id);
      } catch (error) {
        logError('notificaciones.markAsRead', error);
        setItems(previous);
      }
    }

    // Navegación al recurso relacionado solo cuando el backend entrega una
    // ruta interna reconocible (ver AGENTS.md sección 29); nunca se adivina.
    if (item.url && item.url.startsWith('/')) {
      try {
        router.push(item.url as never);
      } catch (error) {
        logError('notificaciones.navigate', error);
      }
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Notificaciones" showBack onBackPress={() => router.back()} />

      <View style={styles.tabRow}>
        <TabButton label="Todas" active={tab === 'todas'} onPress={() => setTab('todas')} />
        <TabButton label={`No leídas${unreadCount > 0 ? ` (${unreadCount})` : ''}`} active={tab === 'no_leidas'} onPress={() => setTab('no_leidas')} />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        renderItem={({ item, index }) => {
          const read = Boolean(item.leida);
          return (
            <FadeInView index={index}>
              <PressableScale
                haptic={false}
                onPress={() => void handlePress(item)}
                style={[styles.item, !read && styles.itemUnread] as object}>
                <View style={[styles.iconWrapper, !read && styles.iconWrapperUnread]}>
                  <Ionicons name={iconFor(item.tipo)} size={18} color={!read ? Colors.primaryDark : Colors.textMuted} />
                </View>
                <View style={styles.itemBody}>
                  <Text style={[styles.itemTitle, !read && styles.itemTitleUnread]}>{item.titulo || 'Notificación'}</Text>
                  {item.mensaje ? (
                    <Text style={styles.itemMessage} numberOfLines={3}>
                      {item.mensaje}
                    </Text>
                  ) : null}
                  {item.creada_en ? <Text style={styles.itemDate}>{item.creada_en}</Text> : null}
                </View>
                {!read ? <View style={styles.dot} /> : null}
              </PressableScale>
            </FadeInView>
          );
        }}
        ListEmptyComponent={
          state === 'loading' ? (
            <SkeletonCardList count={4} />
          ) : state === 'error' ? (
            <ErrorState message={errorMessage ?? undefined} onRetry={() => void load()} />
          ) : (
            <MascotAssistant message={MascotMessages.estasAlDia} type="success" dismissible={false} />
          )
        }
      />
    </View>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <PressableScale haptic={false} onPress={onPress} style={[styles.tabButton, active && styles.tabButtonActive] as object}>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tabRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  tabButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  tabLabelActive: {
    color: Colors.white,
  },
  listContent: {
    padding: Spacing.lg,
    paddingTop: 0,
    flexGrow: 1,
  },
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
  itemUnread: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primarySoft,
  },
  iconWrapper: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapperUnread: {
    backgroundColor: Colors.surface,
  },
  itemBody: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  itemTitleUnread: {
    fontWeight: '800',
  },
  itemMessage: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  itemDate: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 6,
  },
});
