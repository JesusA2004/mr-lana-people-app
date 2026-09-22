import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { formatDateTime } from '@/utils/dates';

export type StepTimelineStatus = 'done' | 'current' | 'pending' | 'cancelled';

export interface StepTimelineItem {
  key: string;
  label: string;
  status: StepTimelineStatus;
  date?: string | null;
  detail?: string | null;
}

const ICON: Record<StepTimelineStatus, keyof typeof Ionicons.glyphMap> = {
  done: 'checkmark',
  current: 'ellipse',
  pending: 'ellipse-outline',
  cancelled: 'close',
};

const STATUS_LABEL: Record<StepTimelineStatus, string> = {
  done: 'completado',
  current: 'en curso',
  pending: 'pendiente',
  cancelled: 'cancelado',
};

/** Timeline vertical de pasos (flujo documental, cierre laboral, bitácora). */
export function StepTimeline({ items }: { items: StepTimelineItem[] }) {
  return (
    <View>
      {items.map((item, index) => {
        const last = index === items.length - 1;
        return (
          <View key={item.key} style={styles.row} accessible accessibilityLabel={`${item.label}, ${STATUS_LABEL[item.status]}`}>
            <View style={styles.rail}>
              <View style={[styles.dot, styles[item.status]]}>
                <Ionicons name={ICON[item.status]} size={item.status === 'current' ? 8 : 12} color={item.status === 'pending' ? Colors.textMuted : Colors.white} />
              </View>
              {!last ? <View style={[styles.line, item.status === 'done' && styles.lineDone]} /> : null}
            </View>
            <View style={styles.body}>
              <Text style={[styles.label, item.status === 'pending' && styles.labelPending]}>{item.label}</Text>
              {item.date ? <Text style={styles.meta}>{formatDateTime(item.date)}</Text> : null}
              {item.detail ? <Text style={styles.detail}>{item.detail}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  rail: {
    alignItems: 'center',
    width: 22,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  done: {
    backgroundColor: Colors.success,
  },
  current: {
    backgroundColor: Colors.primary,
  },
  pending: {
    backgroundColor: Colors.neutralSoft,
  },
  cancelled: {
    backgroundColor: Colors.danger,
  },
  line: {
    flex: 1,
    width: 2,
    minHeight: 16,
    backgroundColor: Colors.border,
  },
  lineDone: {
    backgroundColor: Colors.success,
  },
  body: {
    flex: 1,
    paddingBottom: Spacing.md,
    gap: 2,
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
  meta: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  detail: {
    fontSize: FontSize.xs,
    color: Colors.text,
  },
});
