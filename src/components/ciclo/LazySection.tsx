import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/PressableScale';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';

export interface LazySectionProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  caption?: string;
  /** El contenido (y sus queries) SOLO se monta al expandir: nunca se carga todo al abrir. */
  children: () => React.ReactNode;
  defaultExpanded?: boolean;
}

/** Sección colapsable con carga perezosa (detalle RH del colaborador). */
export function LazySection({ icon, title, caption, children, defaultExpanded = false }: LazySectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <View style={styles.card}>
      <PressableScale
        haptic={false}
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${expanded ? 'contraer' : 'expandir'}`}
        onPress={() => setExpanded((value) => !value)}
        style={styles.header}>
        <View style={styles.icon}>
          <Ionicons name={icon} size={18} color={Colors.primaryDark} />
        </View>
        <View style={styles.titleColumn}>
          <Text style={styles.title}>{title}</Text>
          {caption ? <Text style={styles.caption}>{caption}</Text> : null}
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textMuted} />
      </PressableScale>
      {expanded ? <View style={styles.body}>{children()}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 56,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleColumn: {
    flex: 1,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  caption: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  body: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
});
