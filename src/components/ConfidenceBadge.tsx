import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import type { ExtractionConfidenceLevel } from '@/types/documentExtraction';
import { confidenceLabelForLevel } from '@/utils/documentExtraction';

const STYLE_BY_LEVEL: Record<'alta' | 'media' | 'baja', { color: string; background: string; icon: keyof typeof Ionicons.glyphMap }> = {
  alta: { color: Colors.success, background: Colors.successSoft, icon: 'checkmark-circle' },
  media: { color: Colors.warning, background: Colors.warningSoft, icon: 'alert-circle' },
  baja: { color: Colors.danger, background: Colors.dangerSoft, icon: 'help-circle' },
};

export interface ConfidenceBadgeProps {
  /** Nivel real que manda el backend (`'alta'`/`'media'`) — nunca un decimal (AGENTS.md de este encargo, sección 9). Ausente se trata como baja. */
  level: ExtractionConfidenceLevel | undefined;
}

/**
 * Nunca muestra el decimal crudo de confianza — y nunca depende solo del
 * color (sección 70): ícono + texto siempre acompañan el color.
 */
export function ConfidenceBadge({ level }: ConfidenceBadgeProps) {
  const bucket: 'alta' | 'media' | 'baja' = level === 'alta' ? 'alta' : level === 'media' ? 'media' : 'baja';
  const style = STYLE_BY_LEVEL[bucket];

  return (
    <View style={[styles.badge, { backgroundColor: style.background }]}>
      <Ionicons name={style.icon} size={13} color={style.color} />
      <Text style={[styles.label, { color: style.color }]}>{confidenceLabelForLevel(level)}</Text>
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
