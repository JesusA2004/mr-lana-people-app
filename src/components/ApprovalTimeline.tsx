import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import type { ApprovalStep, ApprovalStepStatus } from '@/types/incorporation';

/** Punto relleno (como `StepTimeline`) en vez del ícono suelto de antes — ese se veía como un círculo vacío flotando, sin fondo ni peso visual. */
const estiloDeEstado = (Colors: ColorPalette): Record<ApprovalStepStatus, { icon: keyof typeof Ionicons.glyphMap; iconColor: string; dotColor: string }> => ({
  pending: { icon: 'ellipse', iconColor: Colors.textMuted, dotColor: Colors.neutralSoft },
  in_review: { icon: 'time', iconColor: Colors.white, dotColor: Colors.warning },
  approved: { icon: 'checkmark', iconColor: Colors.white, dotColor: Colors.success },
  rejected: { icon: 'close', iconColor: Colors.white, dotColor: Colors.danger },
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
              <View style={[styles.dot, { backgroundColor: style.dotColor }]}>
                <Ionicons name={style.icon} size={step.status === 'pending' ? 8 : 13} color={style.iconColor} />
              </View>
              {!isLast ? <View style={[styles.connector, step.status === 'approved' && styles.connectorDone]} /> : null}
            </View>
            <View style={styles.textColumn}>
              <Text style={[styles.label, step.status === 'pending' && styles.labelPending]}>{step.label}</Text>
              {step.approver ? <Text style={styles.approver}>{step.approver}</Text> : null}
              {step.date ? <Text style={styles.comment}>{step.date}</Text> : null}
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
  dot: {
    width: 22,
    height: 22,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
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
  labelPending: {
    color: Colors.textMuted,
    fontWeight: '600',
  },
  approver: {
    fontSize: FontSize.xs,
    color: Colors.text,
    marginTop: 2,
    fontWeight: '600',
  },
  comment: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
