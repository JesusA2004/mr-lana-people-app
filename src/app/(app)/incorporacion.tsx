import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AnimatedProgressBar } from '@/components/AnimatedProgressBar';
import { ApprovalTimeline } from '@/components/ApprovalTimeline';
import { AppHeader } from '@/components/AppHeader';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { FadeInView } from '@/components/FadeInView';
import { MascotAssistant } from '@/components/mascot/MascotAssistant';
import { SkeletonBlock } from '@/components/SkeletonBlock';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { useIncorporacion } from '@/hooks/queries/useIncorporacion';
import { getDevErrorDetail, getErrorMessage } from '@/utils/errors';
import { deriveApprovalStepsFromEstado } from '@/utils/incorporation';

export default function IncorporacionScreen() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useIncorporacion();

  const steps = useMemo(() => {
    if (!data) return [];
    if (data.approval_steps && data.approval_steps.length > 0) return data.approval_steps;
    if (data.alta_digital) return deriveApprovalStepsFromEstado(data.alta_digital);
    return [];
  }, [data]);

  const pendingItems = useMemo(() => data?.checklist.filter((item) => !item.completado) ?? [], [data]);

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
                  <Text style={styles.heroPercent}>{Math.round(data.porcentaje)}%</Text>
                </View>
                <AnimatedProgressBar percent={data.porcentaje} />
              </Card>
            </FadeInView>

            {pendingItems.length > 0 ? (
              <MascotAssistant
                message={
                  pendingItems.length === 1
                    ? `Todavía falta: ${pendingItems[0]?.etiqueta}.`
                    : `Todavía te faltan ${pendingItems.length} pasos por completar.`
                }
                type="tip"
                dismissible={false}
              />
            ) : (
              <MascotAssistant message="¡Tu incorporación está al día!" type="success" dismissible={false} />
            )}

            {steps.length > 0 ? (
              <FadeInView index={1}>
                <Card>
                  <Text style={styles.sectionTitle}>Proceso de aprobación</Text>
                  <ApprovalTimeline steps={steps} />
                </Card>
              </FadeInView>
            ) : null}

            <FadeInView index={2}>
              <Card>
                <Text style={styles.sectionTitle}>Checklist</Text>
                {data.checklist.map((item, index) => (
                  <View key={item.clave} style={[styles.checklistRow, index === data.checklist.length - 1 && styles.checklistRowLast]}>
                    <Ionicons
                      name={item.completado ? 'checkmark-circle' : 'ellipse-outline'}
                      size={20}
                      color={item.completado ? Colors.success : Colors.textMuted}
                    />
                    <Text style={[styles.checklistLabel, item.completado && styles.checklistLabelDone]}>{item.etiqueta}</Text>
                  </View>
                ))}
              </Card>
            </FadeInView>
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
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  checklistRowLast: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 0,
  },
  checklistLabel: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  checklistLabelDone: {
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
});
