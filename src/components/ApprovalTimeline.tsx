import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { FontSize, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import type { ApprovalStep, ApprovalStepStatus } from '@/types/incorporation';

const estiloDeEstado = (Colors: ColorPalette): Record<ApprovalStepStatus, { icon: keyof typeof Ionicons.glyphMap; color: string }> => ({
  pending: { icon: 'ellipse-outline', color: Colors.textMuted },
  in_review: { icon: 'time', color: Colors.warning },
  approved: { icon: 'checkmark-circle', color: Colors.success },
  rejected: { icon: 'close-circle', color: Colors.danger },
});

export interface ApprovalTimelineProps {
  steps: ApprovalStep[];
}

/**
 * Representa visualmente los pasos que el backend indique — la app NUNCA
 * decide cuántos pasos hay ni cuándo se aprueba cada uno (AGENTS.md sección
 * 11/21: la regla de negocio, incluida la aprobación adicional de Director
 * Comercial para Corporativo MR. LANA, vive en el backend).
 */
export function ApprovalTimeline({ steps }: ApprovalTimelineProps) {
  const styles = useEstilos(crearEstilos);
  const estilos = estiloDeEstado(useColores());
  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const style = estilos[step.status];
        const isLast = index === steps.length - 1;
        return (
          <View key={step.key} style={styles.row}>
            <View style={styles.iconColumn}>
              <Ionicons name={style.icon} size={22} color={style.color} />
              {!isLast ? <View style={[styles.connector, step.status === 'approved' && styles.connectorDone]} /> : null}
            </View>
            <View style={styles.textColumn}>
              <Text style={styles.label}>{step.label}</Text>
              {step.comment ? <Text style={styles.comment}>{step.comment}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
  container: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  iconColumn: {
    alignItems: 'center',
  },
  connector: {
    width: 2,
    flex: 1,
    minHeight: 24,
    backgroundColor: Colors.border,
    marginVertical: 2,
  },
  connectorDone: {
    backgroundColor: Colors.success,
  },
  textColumn: {
    flex: 1,
    paddingBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  comment: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
