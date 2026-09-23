import { useRouter } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { ResponsiveContent } from '@/components/ResponsiveContent';
import { SkeletonBlock, SkeletonCardList } from '@/components/SkeletonBlock';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { getDevErrorDetail, getErrorMessage, isNotFoundError } from '@/utils/errors';

export interface ScreenProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  /** Muestra "atrás" (default true: pantallas de detalle/módulo). */
  showBack?: boolean;
  isLoading?: boolean;
  error?: unknown;
  /** Texto cuando el backend responde 404 (ej. cuenta sin colaborador vinculado). */
  notFoundMessage?: string;
  onRetry?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  children?: React.ReactNode;
  /** Contenido fijo debajo del header (filtros). */
  header?: React.ReactNode;
  /** Formulario: tope de ancho de lectura (`Layout.maxFormWidth`) en vez del de contenido. */
  form?: boolean;
}

/**
 * Esqueleto común de las pantallas del ciclo laboral: header, pull to
 * refresh, skeleton, error normalizado (nunca JSON crudo) y 404 amigable.
 */
export function Screen({
  title,
  subtitle,
  right,
  showBack = true,
  isLoading = false,
  error,
  notFoundMessage,
  onRetry,
  refreshing = false,
  onRefresh,
  children,
  header,
  form = false,
}: ScreenProps) {
  const router = useRouter();
  const hasError = error !== null && error !== undefined;

  return (
    <View style={styles.container}>
      <AppHeader title={title} subtitle={subtitle} showBack={showBack} onBackPress={() => router.back()} right={right} />
      {header}
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} /> : undefined}>
        <ResponsiveContent form={form} style={styles.inner}>
          {isLoading ? (
            <View style={styles.skeleton}>
              <SkeletonBlock height={120} radius={Radius.lg} />
              <SkeletonCardList count={3} />
            </View>
          ) : hasError && isNotFoundError(error) && notFoundMessage ? (
            <EmptyState icon="information-circle-outline" message={notFoundMessage} />
          ) : hasError ? (
            <ErrorState message={getErrorMessage(error)} devDetail={getDevErrorDetail(error)} onRetry={onRetry} />
          ) : (
            children
          )}
        </ResponsiveContent>
      </ScrollView>
    </View>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text style={styles.sectionTitle} accessibilityRole="header">
      {children}
    </Text>
  );
}

export function EmptyMessage({ message }: { message: string }) {
  return <EmptyState message={message} />;
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warning' | 'danger' | 'success'; children: React.ReactNode }) {
  return (
    <View style={[styles.notice, styles[`notice_${tone}`]]} accessibilityRole="text">
      <Text style={[styles.noticeText, styles[`noticeText_${tone}`]]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  inner: {
    gap: Spacing.lg,
  },
  skeleton: {
    gap: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  notice: {
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  notice_info: { backgroundColor: Colors.infoSoft },
  notice_warning: { backgroundColor: Colors.warningSoft },
  notice_danger: { backgroundColor: Colors.dangerSoft },
  notice_success: { backgroundColor: Colors.successSoft },
  noticeText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    lineHeight: 19,
  },
  noticeText_info: { color: Colors.text },
  noticeText_warning: { color: Colors.text },
  noticeText_danger: { color: Colors.danger },
  noticeText_success: { color: Colors.success },
});
