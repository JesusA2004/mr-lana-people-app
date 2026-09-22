import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/PressableScale';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';

export interface ModuleTileProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  caption?: string;
  /** Badge SOLO si el backend manda un conteo real (> 0). */
  badge?: number;
  onPress: () => void;
}

/** Acceso a un módulo (grid de 2 columnas) — Inicio de Mi espacio y de Gestión RH. */
export function ModuleTile({ icon, label, caption, badge, onPress }: ModuleTileProps) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${label}${badge ? `, ${badge} pendientes` : ''}`}
      onPress={onPress}
      style={styles.tile}>
      <View style={styles.iconRow}>
        <View style={styles.icon}>
          <Ionicons name={icon} size={20} color={Colors.primaryDark} />
        </View>
        {badge && badge > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
      {caption ? (
        <Text style={styles.caption} numberOfLines={2}>
          {caption}
        </Text>
      ) : null}
    </PressableScale>
  );
}

export function ModuleGrid({ children }: { children: React.ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  tile: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
    minHeight: 96,
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: Radius.full,
    backgroundColor: Colors.danger,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '800',
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  caption: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
});
