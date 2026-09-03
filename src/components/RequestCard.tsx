import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from './Card';
import { StatusBadge } from './StatusBadge';

import { Colors, FontSize, Spacing } from '@/constants/colors';
import type { Solicitud } from '@/types/request';
import { formatDateLong } from '@/utils/dates';
import { humanizeRequestType, pickString } from '@/utils/formatters';

export interface RequestCardProps {
  solicitud: Solicitud;
  onPress?: () => void;
}

export function RequestCard({ solicitud, onPress }: RequestCardProps) {
  const fecha = pickString(solicitud, ['creada_en']);
  const resumen = pickString(solicitud, ['motivo', 'observaciones']);
  const tipo = solicitud.tipo_etiqueta ?? humanizeRequestType(solicitud.tipo);

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.typeRow}>
          <Ionicons name="document-text-outline" size={16} color={Colors.textMuted} />
          <Text style={styles.type}>{tipo}</Text>
        </View>
        <StatusBadge status={solicitud.estado} />
      </View>

      {solicitud.folio ? <Text style={styles.folio}>Folio {solicitud.folio}</Text> : null}
      {fecha ? <Text style={styles.date}>{formatDateLong(fecha)}</Text> : null}
      {resumen ? (
        <Text style={styles.summary} numberOfLines={2}>
          {resumen}
        </Text>
      ) : null}
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
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexShrink: 1,
  },
  type: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
    flexShrink: 1,
  },
  folio: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  date: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  summary: {
    fontSize: FontSize.sm,
    color: Colors.text,
    marginTop: Spacing.xs / 2,
  },
});
