import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AnimatedProgressBar } from '@/components/AnimatedProgressBar';
import { AppHeader } from '@/components/AppHeader';
import { Card } from '@/components/Card';
import { DocumentStatusBadge } from '@/components/DocumentStatusBadge';
import { ErrorState } from '@/components/ErrorState';
import { FadeInView } from '@/components/FadeInView';
import { MascotAssistant } from '@/components/mascot/MascotAssistant';
import { PressableScale } from '@/components/PressableScale';
import { SkeletonBlock, SkeletonCardList } from '@/components/SkeletonBlock';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { MascotMessages } from '@/constants/mascotMessages';
import { useExpediente } from '@/hooks/queries/useExpediente';
import type { ExpedienteDocumentoEntry } from '@/types/document';
import { getDevErrorDetail, getErrorMessage } from '@/utils/errors';
import { pluralize } from '@/utils/formatters';

/**
 * Módulo completo del expediente digital. `GET /api/v1/colaborador/expediente`
 * todavía no existe en el backend (ver docs/MOBILE_BACKEND_REQUIREMENTS.md
 * P0.4) — mientras se agrega, esta pantalla muestra el error real (con
 * detalle técnico en DEV), nunca un "próximamente" ni datos inventados.
 */
export default function ExpedienteScreen() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch, isRefetching } = useExpediente();

  const documentos = useMemo(() => data?.documentos ?? [], [data]);
  const stats = useMemo(() => {
    let pendientes = 0;
    let enRevision = 0;
    let aprobados = 0;
    let rechazados = 0;

    for (const entry of documentos) {
      const status = entry.documento?.status;
      if (status === 'aprobado') aprobados++;
      else if (status === 'en_revision') enRevision++;
      else if (status === 'rechazado' || status === 'requiere_correccion' || status === 'vencido') rechazados++;
      else pendientes++;
    }

    return { pendientes, enRevision, aprobados, rechazados };
  }, [documentos]);

  const priorityMascot = useMemo(() => {
    if (stats.rechazados > 0) {
      return {
        type: 'warning' as const,
        priority: 'high' as const,
        message:
          stats.rechazados === 1
            ? 'Un documento necesita corrección. Revisa la observación de Recursos Humanos.'
            : `${stats.rechazados} documentos necesitan corrección. Revisa las observaciones de Recursos Humanos.`,
      };
    }
    if (stats.pendientes > 0) {
      return { type: 'tip' as const, priority: 'normal' as const, message: MascotMessages.documentosPendientes(stats.pendientes) };
    }
    if (stats.enRevision > 0) {
      return { type: 'info' as const, priority: 'normal' as const, message: MascotMessages.pendienteAprobacion };
    }
    if (data && data.resumen.porcentaje >= 100) {
      return { type: 'success' as const, priority: 'normal' as const, message: MascotMessages.expedienteCompleto };
    }
    return null;
  }, [stats, data]);

  return (
    <View style={styles.container}>
      <AppHeader title="Mi expediente" />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={Colors.primary} />}>
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
              <Card style={styles.heroCard}>
                <View style={styles.heroHeader}>
                  <Text style={styles.heroTitle}>Expediente</Text>
                  <Text style={styles.heroPercent}>{Math.round(data.resumen.porcentaje)}%</Text>
                </View>
                <AnimatedProgressBar percent={data.resumen.porcentaje} height={10} />
                <Text style={styles.heroCaption}>
                  {data.resumen.requeridos_aprobados} de {data.resumen.requeridos_total}{' '}
                  {pluralize(data.resumen.requeridos_total, 'documento completo', 'documentos completos')}
                </Text>
              </Card>
            </FadeInView>

            {priorityMascot ? (
              <MascotAssistant message={priorityMascot.message} type={priorityMascot.type} priority={priorityMascot.priority} />
            ) : null}

            <FadeInView index={1}>
              <View style={styles.statsRow}>
                <StatChip label="Pendientes" value={stats.pendientes} color={Colors.textMuted} background={Colors.neutralSoft} />
                <StatChip label="En revisión" value={stats.enRevision} color={Colors.warning} background={Colors.warningSoft} />
                <StatChip label="Aprobados" value={stats.aprobados} color={Colors.success} background={Colors.successSoft} />
                <StatChip label="Rechazados" value={stats.rechazados} color={Colors.danger} background={Colors.dangerSoft} />
              </View>
            </FadeInView>

            <Text style={styles.sectionTitle}>Documentos</Text>
            <View style={styles.list}>
              {documentos.map((entry: ExpedienteDocumentoEntry, index: number) => (
                <FadeInView key={entry.tipo.id} index={index + 2}>
                  <PressableScale
                    onPress={() => router.push({ pathname: '/expediente/[tipoId]', params: { tipoId: String(entry.tipo.id) } })}
                    style={styles.documentRow}>
                    <View style={styles.documentIcon}>
                      <Ionicons name="document-text-outline" size={18} color={Colors.primaryDark} />
                    </View>
                    <View style={styles.documentInfo}>
                      <Text style={styles.documentName} numberOfLines={1}>
                        {entry.tipo.nombre}
                      </Text>
                      {entry.tipo.requerido ? <Text style={styles.documentRequired}>Requerido</Text> : null}
                    </View>
                    <DocumentStatusBadge status={entry.documento?.status} />
                    <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                  </PressableScale>
                </FadeInView>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function StatChip({ label, value, color, background }: { label: string; value: number; color: string; background: string }) {
  return (
    <View style={[styles.statChip, { backgroundColor: background }]}>
      <Text style={[styles.statChipValue, { color }]}>{value}</Text>
      <Text style={styles.statChipLabel}>{label}</Text>
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
    gap: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  heroCard: {
    gap: Spacing.sm,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
  },
  heroPercent: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  heroCaption: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statChip: {
    flex: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  statChipValue: {
    fontSize: FontSize.lg,
    fontWeight: '800',
  },
  statChipLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  list: {
    gap: Spacing.sm,
  },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  documentIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  documentRequired: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    marginTop: 2,
  },
});
