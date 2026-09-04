import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import type { RequestStatus } from '@/types/request';
import { humanizeRequestStatus } from '@/utils/formatters';

interface StatusStyle {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  background: string;
}

/**
 * Cada estado se comunica con ícono + texto + color, nunca solo color,
 * para que también sea legible para daltonismo (ver especificación §18).
 */
const STATUS_STYLES: Record<string, StatusStyle> = {
  creada: { icon: 'create-outline', color: Colors.textMuted, background: Colors.neutralSoft },
  enviada: { icon: 'paper-plane-outline', color: Colors.info, background: Colors.infoSoft },
  en_revision: { icon: 'time-outline', color: Colors.warning, background: Colors.warningSoft },
  aprobada: { icon: 'checkmark-circle-outline', color: Colors.success, background: Colors.successSoft },
  rechazada: { icon: 'close-circle-outline', color: Colors.danger, background: Colors.dangerSoft },
  requiere_correccion: { icon: 'alert-circle-outline', color: Colors.warning, background: Colors.warningSoft },
  cancelada: { icon: 'ban-outline', color: Colors.textMuted, background: Colors.neutralSoft },
  cerrada: { icon: 'lock-closed-outline', color: Colors.textMuted, background: Colors.neutralSoft },
};

const DEFAULT_STYLE: StatusStyle = { icon: 'ellipse-outline', color: Colors.textMuted, background: Colors.neutralSoft };

export interface StatusBadgeProps {
  status?: RequestStatus | string;
  /** Texto ya traducido por el backend (`estado_etiqueta`); tiene prioridad sobre humanizeRequestStatus. */
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const style = (status ? STATUS_STYLES[status] : undefined) ?? DEFAULT_STYLE;

  return (
    <View style={[styles.badge, { backgroundColor: style.background }]}>
      <Ionicons name={style.icon} size={14} color={style.color} />
      <Text style={[styles.label, { color: style.color }]}>{label ?? humanizeRequestStatus(status)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2 + 2,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
});
