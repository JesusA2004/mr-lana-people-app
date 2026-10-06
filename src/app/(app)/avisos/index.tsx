import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { FadeInView } from '@/components/FadeInView';
import { PressableScale } from '@/components/PressableScale';
import { SkeletonCardList } from '@/components/SkeletonBlock';
import { API_URL } from '@/constants/config';
import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import { useAvisos } from '@/hooks/queries/useAvisos';
import { useAuthStore } from '@/store/authStore';
import { getErrorMessage } from '@/utils/errors';
import { formatDateTime } from '@/utils/dates';
import type { AvisoItem } from '@/types/aviso';

/**
 * Bandeja de avisos de RH (mensaje + imagen, a toda la empresa o a este
 * colaborador) — destino real del push `aviso_rh` (`utils/appLinks.ts`).
 * Solo lectura: enviarlos sigue siendo exclusivo del Portal RH web.
 */
export default function AvisosScreen() {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : undefined;
  const { items, isLoading, isError, error, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useAvisos();

  return (
    <View style={styles.container}>
      <AppHeader title="Avisos" subtitle="Mensajes de RH para toda la empresa o para ti" />

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={Colors.primary} />}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
        }}
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={Colors.primary} style={styles.footerLoader} /> : null}
        renderItem={({ item, index }) => (
          <FadeInView index={index}>
            <AvisoCard aviso={item} authHeaders={authHeaders} onPress={() => router.push(`/avisos/${item.id}`)} />
          </FadeInView>
        )}
        ListEmptyComponent={
          isLoading ? (
            <SkeletonCardList count={4} />
          ) : isError ? (
            <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
          ) : (
            <EmptyState icon="megaphone-outline" title="Sin avisos" message="Todavía no tienes avisos de RH." />
          )
        }
      />
    </View>
  );
}

function AvisoCard({ aviso, authHeaders, onPress }: { aviso: AvisoItem; authHeaders?: Record<string, string>; onPress: () => void }) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const unread = !aviso.leido;

  return (
    <PressableScale haptic={false} onPress={onPress} style={[styles.card, unread && styles.cardUnread] as object}>
      {aviso.imagen_path ? (
        <Image
          source={{ uri: `${API_URL}/avisos/${aviso.id}/imagen`, headers: authHeaders }}
          style={styles.image}
          contentFit="cover"
          transition={180}
          accessibilityLabel="Imagen del aviso"
        />
      ) : (
        <View style={styles.iconWrapper}>
          <Ionicons name="megaphone-outline" size={22} color={Colors.primaryDark} />
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, unread && styles.titleUnread]} numberOfLines={1}>
            {aviso.titulo}
          </Text>
          {unread ? <View style={styles.badge}><Text style={styles.badgeText}>Nuevo</Text></View> : null}
        </View>
        <Text style={styles.message} numberOfLines={2}>
          {aviso.mensaje}
        </Text>
        <Text style={styles.date}>{aviso.enviado_en ? formatDateTime(aviso.enviado_en) : ''}</Text>
      </View>
    </PressableScale>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    listContent: {
      padding: Spacing.lg,
      paddingTop: 0,
      flexGrow: 1,
    },
    footerLoader: {
      paddingVertical: Spacing.lg,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.md,
      backgroundColor: Colors.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: Colors.border,
      padding: Spacing.md,
    },
    cardUnread: {
      backgroundColor: Colors.primarySoft,
      borderColor: Colors.primary,
    },
    image: {
      width: 56,
      height: 56,
      borderRadius: Radius.md,
      backgroundColor: Colors.surfaceMuted,
    },
    iconWrapper: {
      width: 56,
      height: 56,
      borderRadius: Radius.md,
      backgroundColor: Colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: {
      flex: 1,
      gap: 2,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    title: {
      flex: 1,
      fontSize: FontSize.md,
      fontWeight: '600',
      color: Colors.text,
    },
    titleUnread: {
      fontWeight: '800',
    },
    badge: {
      backgroundColor: Colors.primary,
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
    },
    badgeText: {
      fontSize: FontSize.xs,
      fontWeight: '800',
      color: Colors.white,
    },
    message: {
      fontSize: FontSize.sm,
      color: Colors.textMuted,
    },
    date: {
      fontSize: FontSize.xs,
      color: Colors.textMuted,
      marginTop: 2,
    },
  });
