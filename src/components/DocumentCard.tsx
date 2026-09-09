import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { DocumentStatusBadge } from './DocumentStatusBadge';
import { DocumentTypeIcon } from './DocumentTypeIcon';
import { PressableScale } from './PressableScale';

import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import type { DocumentoIncorporacion } from '@/types/document';
import { formatDateShort } from '@/utils/dates';

export interface DocumentCardProps {
  documento: DocumentoIncorporacion;
  onPress: () => void;
}

/**
 * Tarjeta de documento — ícono propio por tipo (`DocumentTypeIcon`, sirve de
 * "previsualización" ya que no hay miniatura real del archivo) + nombre en
 * su propia fila con ancho completo para envolver en hasta 2 líneas, y
 * estado/fecha en una segunda fila separada. Nombres reales largos
 * ("Constancia de situación fiscal (RFC)", "Número de Seguridad Social
 * (NSS)") NUNCA comparten fila con el badge de estado — así no se
 * desbordan del ancho de pantalla en ningún tamaño de letra/dispositivo.
 */
export function DocumentCard({ documento, onPress }: DocumentCardProps) {
  return (
    <PressableScale onPress={onPress} style={styles.card}>
      <View style={styles.topRow}>
        <DocumentTypeIcon clave={documento.tipo} size={44} />
        <View style={styles.infoColumn}>
          <Text style={styles.name}>{documento.nombre}</Text>
          {documento.obligatorio ? <Text style={styles.requiredTag}>Requerido</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} style={styles.chevron} />
      </View>

      <View style={styles.bottomRow}>
        <DocumentStatusBadge status={documento.estado} />
        {documento.fecha_subida ? <Text style={styles.dateText}>{formatDateShort(documento.fecha_subida)}</Text> : null}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  infoColumn: {
    flex: 1,
    // Crítico: sin minWidth:0 un hijo flex:1 puede forzar su ancho de
    // contenido y desbordar la fila en Android (nombres largos como "RFC"/
    // "NSS" reales del backend) en vez de envolver/truncar correctamente.
    minWidth: 0,
    gap: 2,
  },
  name: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
    flexShrink: 1,
  },
  requiredTag: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  chevron: {
    flexShrink: 0,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 56,
  },
  dateText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
  },
});
