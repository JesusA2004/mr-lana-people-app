import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AnimatedProgressBar } from '@/components/AnimatedProgressBar';
import { ApprovalTimeline } from '@/components/ApprovalTimeline';
import { AppHeader } from '@/components/AppHeader';
import { Card } from '@/components/Card';
import { DocumentStatusBadge } from '@/components/DocumentStatusBadge';
import { ErrorState } from '@/components/ErrorState';
import { FadeInView } from '@/components/FadeInView';
import { MascotAssistant } from '@/components/mascot/MascotAssistant';
import { PressableScale } from '@/components/PressableScale';
import { SkeletonBlock } from '@/components/SkeletonBlock';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { useIncorporacion } from '@/hooks/queries/useIncorporacion';
import { getDevErrorDetail, getErrorMessage } from '@/utils/errors';
import { deriveIncorporationSteps } from '@/utils/incorporation';

const ESTADO_MENSAJE: Record<string, string> = {
  incompleto: 'Todavía te faltan documentos por cargar.',
  en_revision: 'Recursos Humanos está revisando tus documentos.',
  completo: 'Cargaste todos tus documentos. En cuanto RH los apruebe, tu incorporación queda aprobada.',
  aprobado: '¡Tu incorporación fue aprobada! Ya tienes acceso completo.',
  rechazado: 'Tu incorporación fue rechazada. Revisa los documentos con observaciones.',
};

export default function IncorporacionScreen() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useIncorporacion();

  const steps = useMemo(() => (data ? deriveIncorporationSteps(data.estado) : []), [data]);
  const pendingDocs = useMemo(() => data?.documentos.filter((doc) => doc.obligatorio && doc.estado !== 'aprobado') ?? [], [data]);

  return (
    <View style={styles.container}>
      <AppHeader title="Mi incorporación" showBack onBackPress={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <View style={{ gap: Spacing.lg }}>
            <SkeletonBlock height={100} radius={Radius.lg} />
            <SkeletonBlock height={220} radius={Radius.lg} />
          </View>
        ) : isError ? (
          <ErrorState message={getErrorMessage(error)} devDetail={getDevErrorDetail(error)} onRetry={() => void refetch()} />
        ) : data ? (
          <>
            <FadeInView index={0}>
              <Card style={styles.heroCard}>
                <View style={styles.heroHeader}>
                  <Text style={styles.heroTitle}>Progreso de incorporación</Text>
                  <Text style={styles.heroPercent}>{Math.round(data.progreso.porcentaje)}%</Text>
                </View>
                <AnimatedProgressBar percent={data.progreso.porcentaje} />
              </Card>
            </FadeInView>

            <MascotAssistant
              message={ESTADO_MENSAJE[data.estado] ?? ESTADO_MENSAJE.incompleto}
              type={data.estado === 'aprobado' ? 'success' : data.estado === 'rechazado' ? 'warning' : 'tip'}
              priority={data.estado === 'rechazado' ? 'high' : 'normal'}
              dismissible={false}
            />

            <FadeInView index={1}>
              <Card>
                <Text style={styles.sectionTitle}>Proceso de aprobación</Text>
                <ApprovalTimeline steps={steps} />
              </Card>
            </FadeInView>

            <FadeInView index={2}>
              <Card>
                <Text style={styles.sectionTitle}>Documentos requeridos</Text>
                {data.documentos
                  .filter((doc) => doc.obligatorio)
                  .map((doc, index, arr) => (
                    <PressableScale
                      key={doc.id}
                      haptic={false}
                      onPress={() => router.push({ pathname: '/expediente/[tipoId]', params: { tipoId: String(doc.id) } })}
                      style={[styles.docRow, index === arr.length - 1 && styles.docRowLast]}>
                      <Text style={styles.docLabel} numberOfLines={1}>
                        {doc.nombre}
                      </Text>
                      <DocumentStatusBadge status={doc.estado} />
                      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                    </PressableScale>
                  ))}
              </Card>
            </FadeInView>

            {pendingDocs.length > 0 ? (
              <Text style={styles.pendingHint}>
                {pendingDocs.length === 1
                  ? `Todavía falta: ${pendingDocs[0]?.nombre}.`
                  : `Todavía te faltan ${pendingDocs.length} documentos por completar.`}
              </Text>
            ) : null}
          </>
        ) : null}
      </ScrollView>
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
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  heroPercent: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  docRowLast: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 0,
  },
  docLabel: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  pendingHint: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
