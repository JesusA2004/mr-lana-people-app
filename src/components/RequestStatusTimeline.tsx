import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import type { RequestStatus } from '@/types/request';

/**
 * Línea de tiempo de una solicitud unificada, sobre los 8 estados reales de
 * `App\Enums\EstadoSolicitudInterna`.
 *
 * El camino feliz tiene tres hitos (Enviada → En revisión → Resuelta). Los
 * desenlaces que no son "aprobada/cerrada" (rechazada, cancelada) NO se
 * dibujan como un paso más: se muestran como estado final explícito, para
 * que nadie lea una solicitud rechazada como "va avanzando".
 */

type Milestone = { key: string; label: string };

const MILESTONES: Milestone[] = [
  { key: 'enviada', label: 'Enviada' },
  { key: 'en_revision', label: 'En revisión' },
  { key: 'resuelta', label: 'Aprobada / cerrada' },
];

/** Cuántos hitos ya se cumplieron para un estado dado. */
function reachedCount(estado: RequestStatus | undefined): number {
  switch (estado) {
    case 'creada':
      return 0;
    case 'enviada':
    case 'requiere_correccion':
      return 1;
    case 'en_revision':
      return 2;
    case 'aprobada':
    case 'cerrada':
      return 3;
    default:
      return 1;
  }
}

interface FinalState {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  background: string;
  title: string;
  description: string;
}

const FINAL_STATES: Record<string, FinalState> = {
  rechazada: {
    icon: 'close-circle',
    color: Colors.danger,
    background: Colors.dangerSoft,
    title: 'Solicitud rechazada',
    description: 'Recursos Humanos no aprobó esta solicitud.',
  },
  cancelada: {
    icon: 'ban',
    color: Colors.textMuted,
    background: Colors.neutralSoft,
    title: 'Solicitud cancelada',
    description: 'Tú cancelaste esta solicitud; ya no está en revisión.',
  },
};

export interface RequestStatusTimelineProps {
  estado?: RequestStatus;
  /** Etiqueta ya traducida por el backend (`estado_etiqueta`). */
  estadoEtiqueta?: string;
}

export function RequestStatusTimeline({ estado, estadoEtiqueta }: RequestStatusTimelineProps) {
  const final = estado ? FINAL_STATES[estado] : undefined;

  if (final) {
    return (
      <View style={[styles.finalCard, { backgroundColor: final.background }]}>
        <Ionicons name={final.icon} size={22} color={final.color} />
        <View style={styles.finalText}>
          <Text style={[styles.finalTitle, { color: final.color }]}>{estadoEtiqueta ?? final.title}</Text>
          <Text style={styles.finalDescription}>{final.description}</Text>
        </View>
      </View>
    );
  }

  const reached = reachedCount(estado);
  const needsCorrection = estado === 'requiere_correccion';

  return (
    <View style={styles.container}>
      {MILESTONES.map((milestone, index) => {
        const done = index < reached;
        const current = index === reached;
        return (
          <View key={milestone.key} style={styles.row}>
            <View style={styles.markerColumn}>
              <View style={[styles.marker, done && styles.markerDone, current && styles.markerCurrent]}>
                {done ? <Ionicons name="checkmark" size={12} color={Colors.white} /> : null}
              </View>
              {index < MILESTONES.length - 1 ? <View style={[styles.connector, done && styles.connectorDone]} /> : null}
            </View>
            <Text style={[styles.label, (done || current) && styles.labelActive]}>{milestone.label}</Text>
          </View>
        );
      })}

      {needsCorrection ? (
        <View style={styles.correctionBanner}>
          <Ionicons name="alert-circle" size={16} color={Colors.warning} />
          <Text style={styles.correctionText}>Recursos Humanos te pidió una corrección antes de continuar.</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 0 },
  row: { flexDirection: 'row', gap: Spacing.md },
  markerColumn: { alignItems: 'center', width: 20 },
  marker: {
    width: 18,
    height: 18,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerDone: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  markerCurrent: { borderColor: Colors.primary, borderWidth: 3 },
  connector: { width: 2, flex: 1, minHeight: 22, backgroundColor: Colors.border },
  connectorDone: { backgroundColor: Colors.primary },
  label: { flex: 1, fontSize: FontSize.sm, color: Colors.textMuted, paddingBottom: Spacing.md },
  labelActive: { color: Colors.text, fontWeight: '700' },
  finalCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: Radius.md },
  finalText: { flex: 1 },
  finalTitle: { fontSize: FontSize.md, fontWeight: '800' },
  finalDescription: { fontSize: FontSize.xs, color: Colors.text, marginTop: 2 },
  correctionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.warningSoft,
    marginTop: Spacing.sm,
  },
  correctionText: { flex: 1, fontSize: FontSize.xs, color: Colors.text },
});
