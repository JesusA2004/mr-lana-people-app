import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, Spacing } from '@/constants/colors';

export interface InfoRowProps {
  label: string;
  /** `null`/`undefined`/'' ⇒ la fila no se dibuja (nunca "—" inventado para datos que el backend no manda). */
  value?: string | number | null;
  icon?: keyof typeof Ionicons.glyphMap;
  emphasis?: boolean;
}

/** Fila etiqueta/valor para detalles — accesible como un solo texto. */
export function InfoRow({ label, value, icon, emphasis = false }: InfoRowProps) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label}: ${value}`}>
      {icon ? <Ionicons name={icon} size={16} color={Colors.textMuted} style={styles.icon} /> : null}
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, emphasis && styles.emphasis]} selectable>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingVertical: 6,
  },
  icon: {
    marginTop: 1,
  },
  label: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  value: {
    flex: 1.3,
    textAlign: 'right',
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: '700',
  },
  emphasis: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
});
