import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from './Card';
import { ProfileAvatar } from './ProfileAvatar';

import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import type { RhBirthdayItem } from '@/types/rhBirthday';

export interface RhBirthdayCardProps {
  item: RhBirthdayItem;
  onPress: () => void;
}

/** Fila de la bandeja de cumpleaños RH (AGENTS.md de este encargo, sección 5) — foto, nombre, puesto/sucursal, y si ya se generó/envió la felicitación. */
export function RhBirthdayCard({ item, onPress }: RhBirthdayCardProps) {
  const { colaborador } = item;

  return (
    <Card onPress={onPress} style={styles.card}>
      <ProfileAvatar name={colaborador.nombre} fotoUrlApi={colaborador.foto_url_api} size={48} />
      <View style={styles.textColumn}>
        <Text style={styles.name} numberOfLines={1}>
          {colaborador.nombre}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {[colaborador.departamento, colaborador.sucursal].filter(Boolean).join(' · ') || colaborador.puesto || 'Sin sucursal'}
        </Text>
      </View>

      <View style={styles.statusColumn}>
        {item.es_hoy ? (
          <View style={styles.todayChip}>
            <Text style={styles.todayChipText}>HOY</Text>
          </View>
        ) : null}
        {item.felicitacion_generada ? (
          <View style={styles.statusRow}>
            <Ionicons
              name={item.enviada ? 'checkmark-done-circle' : 'time-outline'}
              size={14}
              color={item.enviada ? Colors.success : Colors.textMuted}
            />
            <Text style={styles.statusText}>{item.enviada ? 'Enviada' : 'Generada'}</Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  textColumn: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  name: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  meta: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  statusColumn: {
    alignItems: 'flex-end',
    gap: 4,
  },
  todayChip: {
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  todayChipText: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.primaryDark,
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
  },
});
