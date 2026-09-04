import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import type { DocumentStatus } from '@/types/document';

interface DocumentStatusStyle {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  background: string;
  label: string;
}

/** Espejo de App\Enums\EstadoDocumento::etiqueta() — mismos 8 valores exactos. */
const DOCUMENT_STATUS_STYLES: Record<DocumentStatus, DocumentStatusStyle> = {
  pendiente: { icon: 'ellipse-outline', color: Colors.textMuted, background: Colors.neutralSoft, label: 'Pendiente' },
  cargado: { icon: 'cloud-upload-outline', color: Colors.info, background: Colors.infoSoft, label: 'Cargado' },
  en_revision: { icon: 'hourglass-outline', color: Colors.warning, background: Colors.warningSoft, label: 'En revisión' },
  aprobado: { icon: 'checkmark-circle', color: Colors.success, background: Colors.successSoft, label: 'Aprobado' },
  rechazado: { icon: 'close-circle', color: Colors.danger, background: Colors.dangerSoft, label: 'Rechazado' },
  requiere_correccion: { icon: 'alert-circle', color: Colors.warning, background: Colors.warningSoft, label: 'Requiere corrección' },
  vencido: { icon: 'calendar-outline', color: Colors.danger, background: Colors.dangerSoft, label: 'Vencido' },
  archivado: { icon: 'archive-outline', color: Colors.textMuted, background: Colors.neutralSoft, label: 'Archivado' },
};

const PENDING_STYLE: DocumentStatusStyle = {
  icon: 'ellipse-outline',
  color: Colors.textMuted,
  background: Colors.neutralSoft,
  label: 'Sin cargar',
};

export interface DocumentStatusBadgeProps {
  status?: DocumentStatus | null;
}

export function DocumentStatusBadge({ status }: DocumentStatusBadgeProps) {
  const style = status ? (DOCUMENT_STATUS_STYLES[status] ?? PENDING_STYLE) : PENDING_STYLE;

  return (
    <View style={[styles.badge, { backgroundColor: style.background }]}>
      <Ionicons name={style.icon} size={14} color={style.color} />
      <Text style={[styles.label, { color: style.color }]}>{style.label}</Text>
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
