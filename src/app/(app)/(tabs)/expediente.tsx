import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AnimatedProgressBar } from '@/components/AnimatedProgressBar';
import { AppHeader } from '@/components/AppHeader';
import { Card } from '@/components/Card';
import { DocumentCard } from '@/components/DocumentCard';
import { ErrorState } from '@/components/ErrorState';
import { FadeInView } from '@/components/FadeInView';
import { MascotAssistant } from '@/components/mascot/MascotAssistant';
import { SkeletonBlock, SkeletonCardList } from '@/components/SkeletonBlock';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { MascotMessages } from '@/constants/mascotMessages';
import { StatusBadge } from '@/components/StatusBadge';
import { useMiExpediente } from '@/hooks/queries/useCicloLaboral';
import { useIncorporacion } from '@/hooks/queries/useIncorporacion';
import type { DocumentoIncorporacion } from '@/types/document';
import { getDevErrorDetail, getErrorMessage } from '@/utils/errors';
import { pluralize } from '@/utils/formatters';

/**
 * Módulo del expediente digital. `GET /api/v1/colaborador/incorporacion`
 * (ver `useIncorporacion`) es el mismo endpoint real que alimenta la
 * pantalla de "Mi incorporación": el backend no separa ambos conceptos.
 */
export default function ExpedienteScreen() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch, isRefetching } = useIncorporacion();
  // Estado documental REAL (backend 2026-09-22): "completo" = obligatorios
  // APROBADOS, no solo cargados. La carga sigue usando el checklist de
  // incorporación (que es donde vive la autorización de subir/cambiar).
  const estadoReal = useMiExpediente();
  const documental = estadoReal.data?.expediente;

  const documentos = useMemo(() => data?.documentos ?? [], [data]);
  const estadoPorTipo = useMemo(
    () => new Map((documental?.documentos ?? []).map((doc) => [doc.document_type_id, doc])),
    [documental],
  );
  const porcentaje = documental?.porcentaje ?? data?.progreso.porcentaje ?? 0;

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
              <Card style={styles.heroCard}>
                <View style={styles.heroHeader}>
                  <Text style={styles.heroTitle}>Expediente</Text>
                  <Text style={styles.heroPercent}>{Math.round(porcentaje)}%</Text>
                </View>
                <AnimatedProgressBar percent={porcentaje} height={10} />
                {documental ? (
                  <>
                    <Text style={styles.heroCaption}>
                      {documental.aprobados} de {documental.requeridos} obligatorios aprobados · {documental.entregados}{' '}
                      {pluralize(documental.entregados, 'entregado', 'entregados')}
                    </Text>
                    <View style={styles.statusRow}>
                      <StatusBadge
                        status={documental.completo ? 'aprobado' : documental.rechazados > 0 ? 'requiere_correccion' : 'en_revision'}
                        label={documental.completo ? 'Expediente completo' : documental.faltantes > 0 ? `${documental.faltantes} faltante(s)` : 'En revisión'}
                      />
                      {estadoReal.data?.estado_alta_etiqueta ? <StatusBadge status="enviada" label={`Alta: ${estadoReal.data.estado_alta_etiqueta}`} /> : null}
                    </View>
                  </>
                ) : (
                  <Text style={styles.heroCaption}>
                    {data.progreso.aprobados} de {data.progreso.total} {pluralize(data.progreso.total, 'documento completo', 'documentos completos')}
                  </Text>
                )}
              </Card>
            </FadeInView>

            {estadoReal.data?.expediente_cerrado ? (
              <MascotAssistant message="Tu expediente está cerrado. Si necesitas algo, contacta a Recursos Humanos." type="info" dismissible={false} />
            ) : null}

            {data.progreso.rechazados > 0 ? (
              <MascotAssistant
                message={
                  data.progreso.rechazados === 1
                    ? 'Un documento necesita corrección. Revisa la observación de Recursos Humanos.'
                    : `${data.progreso.rechazados} documentos necesitan corrección. Revisa las observaciones de Recursos Humanos.`
                }
                type="warning"
                priority="high"
              />
            ) : data.progreso.pendientes > 0 ? (
              <MascotAssistant message={MascotMessages.documentosPendientes(data.progreso.pendientes)} type="tip" />
            ) : data.progreso.en_revision > 0 ? (
              <MascotAssistant message={MascotMessages.pendienteAprobacion} type="info" />
            ) : (documental ? documental.completo : data.progreso.porcentaje >= 100) ? (
              <MascotAssistant message={MascotMessages.expedienteCompleto} type="success" />
            ) : null}

            <FadeInView index={1}>
              <View style={styles.statsRow}>
                <StatChip
                  label="Faltantes"
                  value={documental?.faltantes ?? data.progreso.pendientes}
                  color={Colors.textMuted}
                  background={Colors.neutralSoft}
                />
                <StatChip label="En revisión" value={documental?.en_revision ?? data.progreso.en_revision} color={Colors.warning} background={Colors.warningSoft} />
                <StatChip label="Aprobados" value={documental?.aprobados ?? data.progreso.aprobados} color={Colors.success} background={Colors.successSoft} />
                <StatChip label="Rechazados" value={documental?.rechazados ?? data.progreso.rechazados} color={Colors.danger} background={Colors.dangerSoft} />
              </View>
            </FadeInView>

            <Text style={styles.sectionTitle}>Documentos</Text>
            <View style={styles.list}>
              {documentos.map((documento: DocumentoIncorporacion, index: number) => (
                <FadeInView key={documento.id} index={index + 2}>
                  <DocumentCard
                    documento={documento}
                    estado={estadoPorTipo.get(documento.id)}
                    onPress={() => router.push({ pathname: '/expediente/[tipoId]', params: { tipoId: String(documento.id) } })}
                  />
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
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
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
});
