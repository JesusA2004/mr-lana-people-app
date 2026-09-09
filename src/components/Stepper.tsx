import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { AnimatedProgressBar } from './AnimatedProgressBar';

import { Colors, FontSize, Spacing } from '@/constants/colors';

export interface StepperProps {
  steps: string[];
  /** Índice (0-based) del paso activo. */
  currentIndex: number;
}

/**
 * Stepper numerado + barra de progreso, para wizards multi-paso (ej. Nueva
 * solicitud). Círculos: pendiente (número), activo (número resaltado),
 * completado (check). Nada de animación de rebote aquí — el movimiento vive
 * en la transición de contenido entre pasos, no en el indicador.
 */
export function Stepper({ steps, currentIndex }: StepperProps) {
  const percent = steps.length > 1 ? (currentIndex / (steps.length - 1)) * 100 : 100;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {steps.map((label, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          return (
            <View key={label} style={styles.item}>
              <View style={[styles.circle, active && styles.circleActive, done && styles.circleDone]}>
                {done ? (
                  <Ionicons name="checkmark" size={14} color={Colors.white} />
                ) : (
                  <Text style={[styles.circleText, active && styles.circleTextActive]}>{index + 1}</Text>
                )}
              </View>
              <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>
      <AnimatedProgressBar percent={percent} height={4} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  item: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  circle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.neutralSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleActive: {
    backgroundColor: Colors.primary,
  },
  circleDone: {
    backgroundColor: Colors.success,
  },
  circleText: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.textMuted,
  },
  circleTextActive: {
    color: Colors.white,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  labelActive: {
    color: Colors.primaryDark,
  },
});
