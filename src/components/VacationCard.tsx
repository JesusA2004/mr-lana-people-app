import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from './Card';
import { StatusBadge } from './StatusBadge';

import { Colors, FontSize, Spacing } from '@/constants/colors';
import type { VacationRequest } from '@/types/vacation';
import { formatDateLong } from '@/utils/dates';

export interface VacationCardProps {
  request: VacationRequest;
}

export function VacationCard({ request }: VacationCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={16} color={Colors.textMuted} />
          <Text style={styles.dates}>
            {formatDateLong(request.fecha_inicio)} — {formatDateLong(request.fecha_fin)}
          </Text>
        </View>
        <StatusBadge status={request.estado} label={request.estado_etiqueta} />
      </View>

      {typeof request.dias_solicitados === 'number' ? (
        <Text style={styles.days}>
          {request.dias_solicitados} {request.dias_solicitados === 1 ? 'día' : 'días'}
        </Text>
      ) : null}

      {request.comentario ? <Text style={styles.comment}>{request.comentario}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexShrink: 1,
  },
  dates: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
    flexShrink: 1,
  },
  days: {
    fontSize: FontSize.sm,
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  comment: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
});
