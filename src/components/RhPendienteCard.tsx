import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from './Card';

import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import type { RhPendiente } from '@/types/rh';
import { formatDateTime } from '@/utils/dates';

const TYPE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  solicitud: 'document-text-outline',
  vacaciones: 'airplane-outline',
  documento: 'folder-open-outline',
  incorporacion: 'person-add-outline',
};

const TYPE_LABEL: Record<string, string> = {
  solicitud: 'Solicitud',
  vacaciones: 'Vacaciones',
  documento: 'Documento',
  incorporacion: 'Incorporación',
};

export interface RhPendienteCardProps {
  pendiente: RhPendiente;
  onPress: () => void;
}

/** Card de la bandeja unificada RH (AGENTS.md sección 7) — tipo, título, colaborador, sucursal, resumen y fecha, siempre según lo que manda el backend. */
export function RhPendienteCard({ pendiente, onPress }: RhPendienteCardProps) {
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.typeChip}>
          <Ionicons name={TYPE_ICON[pendiente.tipo] ?? 'ellipse-outline'} size={13} color={Colors.primaryDark} />
          <Text style={styles.typeChipText}>{TYPE_LABEL[pendiente.tipo] ?? pendiente.tipo}</Text>
        </View>
        <Text style={styles.date} numberOfLines={1}>
          {formatDateTime(pendiente.creado_en)}
        </Text>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {pendiente.titulo}
      </Text>

      <View style={styles.collaboratorRow}>
        <Ionicons name="person-circle-outline" size={16} color={Colors.textMuted} />
        <Text style={styles.collaboratorText} numberOfLines={1}>
          {pendiente.colaborador.nombre}
          {pendiente.colaborador.numero_empleado ? ` · N.º ${pendiente.colaborador.numero_empleado}` : ''}
        </Text>
      </View>

      {pendiente.colaborador.sucursal ? (
        <Text style={styles.branch} numberOfLines={1}>
          {pendiente.colaborador.sucursal}
        </Text>
      ) : null}

      {pendiente.resumen ? (
        <Text style={styles.summary} numberOfLines={2}>
          {pendiente.resumen}
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
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  typeChipText: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  date: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    flexShrink: 1,
    textAlign: 'right',
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 2,
  },
  collaboratorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  collaboratorText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  branch: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginLeft: 22,
  },
  summary: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
