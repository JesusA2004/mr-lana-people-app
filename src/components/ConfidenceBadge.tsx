import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { confidenceLabel, confidenceLevel } from '@/utils/documentExtraction';

const STYLE_BY_LEVEL = {
  alta: { color: Colors.success, background: Colors.successSoft, icon: 'checkmark-circle' as const },
  media: { color: Colors.warning, background: Colors.warningSoft, icon: 'alert-circle' as const },
  baja: { color: Colors.danger, background: Colors.dangerSoft, icon: 'help-circle' as const },
};

export interface ConfidenceBadgeProps {
  value: number | null | undefined;
}

/**
 * Nunca muestra el decimal crudo de confianza (AGENTS.md de este encargo,
 * sección 9: "0.97 → Confianza alta") — y nunca depende solo del color
 * (sección 70): ícono + texto siempre acompañan el color.
 */
export function ConfidenceBadge({ value }: ConfidenceBadgeProps) {
  const level = confidenceLevel(value);
  const style = STYLE_BY_LEVEL[level];

  return (
    <View style={[styles.badge, { backgroundColor: style.background }]}>
      <Ionicons name={style.icon} size={13} color={style.color} />
      <Text style={[styles.label, { color: style.color }]}>{confidenceLabel(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
});
