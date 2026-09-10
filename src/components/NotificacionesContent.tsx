import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from './AppHeader';
import { ErrorState } from './ErrorState';
import { FadeInView } from './FadeInView';
import { MascotAssistant } from './mascot/MascotAssistant';
import { PressableScale } from './PressableScale';
import { SkeletonCardList } from './SkeletonBlock';

import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { MascotMessages } from '@/constants/mascotMessages';
import { useMarkAllNotificacionesLeidas, useMarkNotificacionLeida, useNotificaciones } from '@/hooks/queries/useNotificaciones';
import { toast } from '@/store/toastStore';
import type { NotificationItem } from '@/types/notification';
import { getErrorMessage, logError } from '@/utils/errors';

type Tab = 'todas' | 'no_leidas';

const ICON_BY_TYPE: Record<string, keyof typeof Ionicons.glyphMap> = {
  solicitud: 'document-text-outline',
  vacaciones: 'airplane-outline',
  documento: 'folder-open-outline',
  expediente: 'folder-open-outline',
  incorporacion: 'person-add-outline',
  cumpleanos: 'gift-outline',
  documento_laboral: 'briefcase-outline',
  rh_solicitud: 'document-text-outline',
  rh_vacaciones: 'airplane-outline',
  rh_documento: 'folder-open-outline',
  rh_incorporacion: 'person-add-outline',
  rh_pendiente: 'checkbox-outline',
  rh_cumpleanos: 'gift-outline',
  rh_extraccion_documento: 'sparkles-outline',
  formato_disponible: 'document-attach-outline',
};

function iconFor(tipo?: string | null): keyof typeof Ionicons.glyphMap {
  if (!tipo) return 'notifications-outline';
  return ICON_BY_TYPE[tipo] ?? 'notifications-outline';
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Agrupa por Hoy / Ayer / Anteriores usando `creada_en_iso`; sin fecha reconocible, cae en Anteriores. */
function groupByDate(items: NotificationItem[]): { title: string; data: NotificationItem[] }[] {
  const today = startOfDay(new Date());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: Record<'Hoy' | 'Ayer' | 'Anteriores', NotificationItem[]> = { Hoy: [], Ayer: [], Anteriores: [] };

  for (const item of items) {
    const date = item.creada_en_iso ? new Date(item.creada_en_iso) : null;
    const day = date && !Number.isNaN(date.getTime()) ? startOfDay(date) : null;

    if (day && day.getTime() === today.getTime()) groups.Hoy.push(item);
    else if (day && day.getTime() === yesterday.getTime()) groups.Ayer.push(item);
    else groups.Anteriores.push(item);
  }

  return (['Hoy', 'Ayer', 'Anteriores'] as const).filter((key) => groups[key].length > 0).map((key) => ({ title: key, data: groups[key] }));
}

export interface NotificacionesContentProps {
  /** true cuando se presenta como pantalla apilada (colaborador, desde la campana) — false en el tab RH (raíz, sin volver). */
  showBack?: boolean;
}

/**
 * Contenido de Notificaciones compartido entre Mi espacio (pantalla apilada,
 * abierta desde la campana) y el tab "Notificaciones" de Gestión RH — mismo
 * endpoint real (`GET /notificaciones`, ver AGENTS.md sección 47), un solo
 * componente en vez de duplicar la lista dos veces.
 */
export function NotificacionesContent({ showBack = false }: NotificacionesContentProps) {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch, isRefetching } = useNotificaciones();
  const markAsRead = useMarkNotificacionLeida();
  const markAllAsRead = useMarkAllNotificacionesLeidas();
  const [tab, setTab] = useState<Tab>('todas');

  const items = useMemo(() => data ?? [], [data]);
  const filtered = useMemo(() => (tab === 'no_leidas' ? items.filter((item) => !item.leida) : items), [items, tab]);
  const unreadCount = useMemo(() => items.filter((item) => !item.leida).length, [items]);
  const sections = useMemo(() => groupByDate(filtered), [filtered]);

  const handlePress = (item: NotificationItem) => {
    if (!item.leida) {
      markAsRead.mutate(item.id, {
        onError: (markError) => logError('notificaciones.markAsRead', markError),
      });
    }

    // Navegación al recurso relacionado solo cuando el backend entrega una
    // ruta interna reconocible (ver AGENTS.md sección 29); nunca se adivina.
    if (item.url && item.url.startsWith('/')) {
      try {
        router.push(item.url as never);
      } catch (navError) {
        logError('notificaciones.navigate', navError);
      }
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate(undefined, {
      onSuccess: () => toast.success('Marcamos todas tus notificaciones como leídas.'),
      onError: (markError) => {
        logError('notificaciones.markAllAsRead', markError);
        toast.error(getErrorMessage(markError));
      },
    });
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Notificaciones"
        showBack={showBack}
        onBackPress={showBack ? () => router.back() : undefined}
        right={
          unreadCount > 0 ? (
            <PressableScale haptic={false} onPress={handleMarkAllAsRead} disabled={markAllAsRead.isPending} style={styles.markAllButton}>
              <Ionicons name="checkmark-done-outline" size={16} color={Colors.primaryDark} />
              <Text style={styles.markAllText}>Marcar todas</Text>
            </PressableScale>
          ) : undefined
        }
      />

      <View style={styles.tabRow}>
        <TabButton label="Todas" active={tab === 'todas'} onPress={() => setTab('todas')} />
        <TabButton label={`No leídas${unreadCount > 0 ? ` (${unreadCount})` : ''}`} active={tab === 'no_leidas'} onPress={() => setTab('no_leidas')} />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={Colors.primary} />}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
        renderSectionFooter={() => <View style={{ height: Spacing.md }} />}
        renderItem={({ item, index }) => {
          const read = Boolean(item.leida);
          return (
            <FadeInView index={index}>
              <PressableScale haptic={false} onPress={() => handlePress(item)} style={[styles.item, !read && styles.itemUnread] as object}>
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
          isLoading ? (
            <SkeletonCardList count={4} />
          ) : isError ? (
            <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
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
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.primarySoft,
  },
  markAllText: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.primaryDark,
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
  sectionHeader: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
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
