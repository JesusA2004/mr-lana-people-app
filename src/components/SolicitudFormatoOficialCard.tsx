import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from './Card';
import { PressableScale } from './PressableScale';

import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import type { Solicitud, SolicitudDocumentoGenerado } from '@/types/request';
import { documentoOficialStatusPresentation } from '@/utils/documentoOficialStatus';

export interface SolicitudFormatoOficialCardProps {
  solicitud: Pick<Solicitud, 'documentos_generados' | 'formatos_oficiales'>;
  onVerDocumento?: (documento: SolicitudDocumentoGenerado) => void;
}

/**
 * Sección "Documentos de tu solicitud" (sección 2/3/4 del encargo
 * 2026-09-15): el backend puede empezar a generar automáticamente un
 * documento oficial al aprobar vacaciones/permisos/préstamo/baja
 * (`config/solicitudes.php` + `SolicitudFormatoOficialService`), pero el
 * Resource móvil del colaborador todavía NO lo serializa.
 *
 * Este componente NUNCA inventa un documento: se protege con la presencia
 * real del payload y no dibuja nada (`null`) si ambos arreglos vienen
 * vacíos/ausentes — el día que el backend los mande, aparece solo.
 */
export function SolicitudFormatoOficialCard({ solicitud, onVerDocumento }: SolicitudFormatoOficialCardProps) {
  const documentos = solicitud.documentos_generados ?? [];
  const formatos = solicitud.formatos_oficiales ?? [];

  if (documentos.length === 0 && formatos.length === 0) return null;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Documentos de tu solicitud</Text>

      {documentos.map((documento) => {
        const presentation = documentoOficialStatusPresentation(documento.status);
        const clickable = Boolean(documento.ver_url && onVerDocumento);

        return (
          <PressableScale
            key={documento.id}
            haptic={false}
            disabled={!clickable}
            onPress={clickable ? () => onVerDocumento?.(documento) : undefined}
            style={styles.row}>
            <View style={[styles.icon, { backgroundColor: presentation.background }]}>
              <Ionicons name={presentation.icon} size={16} color={presentation.color} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowName} numberOfLines={1}>
                {documento.nombre}
              </Text>
              <Text style={[styles.rowStatus, { color: presentation.color }]}>
                {presentation.label}
                {documento.requiere_firma && !documento.firmado ? ' · Requiere firma' : ''}
              </Text>
            </View>
            {clickable ? <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} /> : null}
          </PressableScale>
        );
      })}

      {formatos.map((formato) => {
        const presentation = documentoOficialStatusPresentation(formato.estado);
        return (
          <View key={formato.id} style={styles.row}>
            <View style={[styles.icon, { backgroundColor: presentation.background }]}>
              <Ionicons name={presentation.icon} size={16} color={presentation.color} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowName}>Formato oficial</Text>
              <Text style={[styles.rowStatus, { color: presentation.color }]}>{presentation.label}</Text>
            </View>
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowName: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  rowStatus: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    marginTop: 2,
  },
});
