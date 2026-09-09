import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AnimatedProgressBar } from '@/components/AnimatedProgressBar';
import { ApprovalTimeline } from '@/components/ApprovalTimeline';
import { AppHeader } from '@/components/AppHeader';
import { Card } from '@/components/Card';
import { DocumentCard } from '@/components/DocumentCard';
import { ErrorState } from '@/components/ErrorState';
import { FadeInView } from '@/components/FadeInView';
import { MascotAssistant } from '@/components/mascot/MascotAssistant';
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
              <Text style={styles.sectionTitle}>Documentos requeridos</Text>
              <View style={styles.docList}>
                {data.documentos
                  .filter((doc) => doc.obligatorio)
                  .map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      documento={doc}
                      onPress={() => router.push({ pathname: '/expediente/[tipoId]', params: { tipoId: String(doc.id) } })}
                    />
                  ))}
              </View>
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
  docList: {
    gap: Spacing.sm,
  },
  pendingHint: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
