import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AnimatedProgressBar } from '@/components/AnimatedProgressBar';
import { AppHeader } from '@/components/AppHeader';
import { Card } from '@/components/Card';
import { Notice } from '@/components/ciclo/Screen';
import { ErrorState } from '@/components/ErrorState';
import { FadeInView } from '@/components/FadeInView';
import { PressableScale } from '@/components/PressableScale';
import { SkeletonBlock, SkeletonCardList } from '@/components/SkeletonBlock';
import { Colors, FontSize, Layout, Radius, Spacing } from '@/constants/colors';
import { useMiExpediente } from '@/hooks/queries/useCicloLaboral';
import { useIncorporacion } from '@/hooks/queries/useIncorporacion';
import type { DocumentoIncorporacion } from '@/types/document';
import { getDevErrorDetail, getErrorMessage } from '@/utils/errors';
import { documentStatusGlyph, progressBreakdown, progressHeadline, toExpedienteProgress, type DocumentGlyphTone } from '@/utils/expedienteProgress';

const TONE: Record<DocumentGlyphTone, string> = {
  success: Colors.success,
  warning: Colors.warning,
  danger: Colors.danger,
  neutral: Colors.textMuted,
};

/**
 * Mi expediente: cuánto llevo (regla del backend: solo documentos
 * obligatorios APROBADOS cuentan) y una lista compacta con el estado de
 * cada documento en ícono + palabra. Tocar un documento abre su detalle
 * (subir, reemplazar, solicitar cambio).
 */
export default function ExpedienteScreen() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch, isRefetching } = useIncorporacion();
  const estadoReal = useMiExpediente();

  const progreso = toExpedienteProgress(data?.progreso);
  const breakdown = progressBreakdown(progreso);
  const documentos = data?.documentos ?? [];
  const requeridos = documentos.filter((d) => d.obligatorio);
  const opcionales = documentos.filter((d) => !d.obligatorio);
  const abrir = (documento: DocumentoIncorporacion) => router.push({ pathname: '/expediente/[tipoId]', params: { tipoId: String(documento.id) } });

  return (
    <View style={styles.container}>
      <AppHeader title="Mi expediente" />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              void refetch();
              void estadoReal.refetch();
            }}
            tintColor={Colors.primary}
          />
        }>
        {isLoading ? (
          <View style={{ gap: Spacing.lg }}>
            <SkeletonBlock height={140} radius={Radius.lg} />
            <SkeletonCardList count={4} />
          </View>
        ) : isError ? (
          <ErrorState message={getErrorMessage(error)} devDetail={getDevErrorDetail(error)} onRetry={() => void refetch()} />
        ) : data ? (
          <>
            <FadeInView index={0}>
              <Card style={styles.hero}>
                <View style={styles.heroTop}>
                  <View style={styles.heroText}>
                    <Text style={styles.heroTitle}>{progreso.completo ? 'Expediente completo' : 'Expediente'}</Text>
                    <Text style={styles.heroHeadline}>
                      {progreso.completo ? `${progreso.completos} de ${progreso.total} documentos` : progressHeadline(progreso)}
                    </Text>
                  </View>
                  {progreso.sinObligatorios ? null : (
                    <Text style={[styles.heroPercent, progreso.completo && { color: Colors.success }]} accessibilityLabel={`${progreso.porcentaje} por ciento`}>
                      {progreso.porcentaje}%
                    </Text>
                  )}
                </View>
                {progreso.sinObligatorios ? null : <AnimatedProgressBar percent={progreso.porcentaje} height={10} />}
                {!progreso.completo && progreso.pendientes > 0 ? (
                  <Text style={styles.heroPending}>
                    {progreso.pendientes} {progreso.pendientes === 1 ? 'pendiente' : 'pendientes'}
                    {breakdown ? <Text style={styles.heroBreakdown}> · {breakdown}</Text> : null}
                  </Text>
                ) : null}
                {estadoReal.data?.estado_alta_etiqueta ? <Text style={styles.heroBreakdown}>Alta: {estadoReal.data.estado_alta_etiqueta}</Text> : null}
              </Card>
            </FadeInView>

            {estadoReal.data?.expediente_cerrado ? <Notice tone="info">Tu expediente está cerrado. Si necesitas algo, contacta a Recursos Humanos.</Notice> : null}
            {progreso.rechazados > 0 ? (
              <Notice tone="danger">
                {progreso.rechazados === 1 ? 'Un documento necesita corrección.' : `${progreso.rechazados} documentos necesitan corrección.`} Tócalo para ver la observación
                de Recursos Humanos.
              </Notice>
            ) : null}

            {requeridos.length > 0 ? <DocumentList title="Requeridos" documentos={requeridos} onOpen={abrir} /> : null}
            {opcionales.length > 0 ? <DocumentList title="Opcionales" documentos={opcionales} onOpen={abrir} /> : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function DocumentList({ title, documentos, onOpen }: { title: string; documentos: DocumentoIncorporacion[]; onOpen: (d: DocumentoIncorporacion) => void }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      <Card padded={false}>
        {documentos.map((documento, index) => {
          const glyph = documentStatusGlyph(documento.estado);
          return (
            <PressableScale
              key={documento.id}
              haptic={false}
              accessibilityLabel={`${documento.nombre}: ${glyph.label}`}
              onPress={() => onOpen(documento)}
              style={[styles.row, index < documentos.length - 1 && styles.rowDivider]}>
              <Ionicons name={glyph.icon} size={22} color={TONE[glyph.tone]} />
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{documento.nombre}</Text>
                <Text style={[styles.rowStatus, { color: TONE[glyph.tone] }]}>{glyph.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </PressableScale>
          );
        })}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    alignSelf: 'center',
    padding: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  hero: {
    gap: Spacing.md,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  heroText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  heroTitle: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroHeadline: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  heroPercent: {
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  heroPending: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  heroBreakdown: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 56,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  rowStatus: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    marginTop: 1,
  },
});
