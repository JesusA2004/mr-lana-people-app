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
  /**
   * Detalle adicional del estado documental real (`/colaborador/expediente`,
   * backend 2026-09-22): categoría, versión y motivo de rechazo. Opcional
   * para no romper usos existentes.
   */
  estado?: { categoria?: string | null; version?: number | null; motivo_rechazo?: string | null } | null;
}

const CATEGORIA_LABEL: Record<string, string> = {
  personales: 'Personales',
  contratos: 'Contratos',
  vacaciones: 'Vacaciones',
  permisos: 'Permisos',
  prestamos: 'Préstamos',
  actas: 'Actas',
  nomina_interna: 'Nómina interna',
  baja_finiquito: 'Baja y finiquito',
  otros: 'Otros',
};

/**
 * Tarjeta de documento — ícono propio por tipo (`DocumentTypeIcon`, sirve de
 * "previsualización" ya que no hay miniatura real del archivo) + nombre en
 * su propia fila con ancho completo para envolver en hasta 2 líneas, y
 * estado/fecha en una segunda fila separada. Nombres reales largos
 * ("Constancia de situación fiscal (RFC)", "Número de Seguridad Social
 * (NSS)") NUNCA comparten fila con el badge de estado — así no se
 * desbordan del ancho de pantalla en ningún tamaño de letra/dispositivo.
 */
export function DocumentCard({ documento, onPress, estado }: DocumentCardProps) {
  const motivo = documento.motivo_rechazo ?? estado?.motivo_rechazo;
  const rechazado = documento.estado === 'rechazado' || documento.estado === 'requiere_correccion' || documento.estado === 'vencido';
  const meta = [
    documento.obligatorio ? 'Obligatorio' : 'Opcional',
    estado?.categoria ? CATEGORIA_LABEL[estado.categoria] ?? estado.categoria : null,
    estado?.version ? `Versión ${estado.version}` : null,
  ].filter(Boolean);

  return (
    <PressableScale onPress={onPress} style={styles.card} accessibilityLabel={`${documento.nombre}, ${documento.estado}`}>
      <View style={styles.topRow}>
        <DocumentTypeIcon clave={documento.tipo} size={44} />
        <View style={styles.infoColumn}>
          <Text style={styles.name}>{documento.nombre}</Text>
          <Text style={styles.requiredTag}>{meta.join(' · ')}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} style={styles.chevron} />
      </View>

      <View style={styles.bottomRow}>
        <DocumentStatusBadge status={documento.estado} />
        {documento.fecha_subida ? <Text style={styles.dateText}>{formatDateShort(documento.fecha_subida)}</Text> : null}
      </View>

      {rechazado && motivo ? (
        <View style={styles.rejection}>
          <Ionicons name="alert-circle" size={14} color={Colors.danger} />
          <Text style={styles.rejectionText}>{motivo}</Text>
        </View>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  rejection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: Colors.dangerSoft,
    borderRadius: Radius.md,
    padding: Spacing.sm,
  },
  rejectionText: {
    flex: 1,
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.danger,
  },
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
