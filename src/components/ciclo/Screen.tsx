import { useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { BarraAccionInferior } from '@/components/BarraAccionInferior';
import { FormularioScroll } from '@/components/FormularioScroll';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { ResponsiveContent } from '@/components/ResponsiveContent';
import { SkeletonBlock, SkeletonCardList } from '@/components/SkeletonBlock';
import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
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
  /**
   * Acciones fijas al pie (Guardar / Enviar / Siguiente): se pintan en una
   * `BarraAccionInferior` (safe area inferior + sube sobre el teclado) y el
   * scroll deja el campo activo por encima de ella.
   */
  footer?: React.ReactNode;
  /** Texto corto encima de los botones del `footer` (p. ej. por qué está deshabilitado). */
  footerNota?: string;
  /** Botones del `footer` lado a lado. */
  footerFila?: boolean;
}

/**
 * Esqueleto común de las pantallas del ciclo laboral: header, pull to
 * refresh, skeleton, error normalizado (nunca JSON crudo) y 404 amigable.
 * El scroll es consciente del teclado (el campo activo nunca queda tapado)
 * y `footer` fija las acciones abajo respetando el safe area.
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
  footer,
  footerNota,
  footerFila = false,
}: ScreenProps) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const hasError = error !== null && error !== undefined;
  const [alturaBarra, setAlturaBarra] = useState(0);
  const mostrarFooter = Boolean(footer) && !isLoading && !hasError;

  return (
    <View style={styles.container}>
      <AppHeader title={title} subtitle={subtitle} showBack={showBack} right={right} />
      {header}
      <FormularioScroll
        alturaBarra={mostrarFooter ? alturaBarra : 0}
        contentContainerStyle={styles.content}
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
      </FormularioScroll>
      {mostrarFooter ? (
        <BarraAccionInferior nota={footerNota} fila={footerFila} onAltura={setAlturaBarra}>
          {footer}
        </BarraAccionInferior>
      ) : null}
    </View>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  const styles = useEstilos(crearEstilos);
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
  const styles = useEstilos(crearEstilos);
  return (
    <View style={[styles.notice, styles[`notice_${tone}`]]} accessibilityRole="text">
      <Text style={[styles.noticeText, styles[`noticeText_${tone}`]]}>{children}</Text>
    </View>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
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
