import { ScrollView, StyleSheet, Text } from 'react-native';

import { PressableScale } from '@/components/PressableScale';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';

export interface FilterChipOption<T extends string> {
  value: T;
  label: string;
  /** Conteo opcional que manda el backend (nunca calculado aquí). */
  count?: number;
}

export interface FilterChipsProps<T extends string> {
  options: FilterChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** Fila horizontal de filtros — mismo estilo que los chips de Solicitudes. */
export function FilterChips<T extends string>({ options, value, onChange }: FilterChipsProps<T>) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <PressableScale
            key={option.value}
            haptic={false}
            accessibilityRole="button"
            accessibilityLabel={`${option.label}${option.count !== undefined ? `, ${option.count}` : ''}${active ? ', seleccionado' : ''}`}
            onPress={() => onChange(option.value)}
            style={[styles.chip, active && styles.chipActive] as object}>
            <Text style={[styles.label, active && styles.labelActive]}>
              {option.label}
              {option.count !== undefined ? ` · ${option.count}` : ''}
            </Text>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  labelActive: {
    color: Colors.white,
  },
});
