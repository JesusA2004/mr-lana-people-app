import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import type { RequestStatus } from '@/types/request';

/**
 * Línea de tiempo de una solicitud unificada, sobre los 7 estados reales de
 * `App\Enums\EstadoSolicitudInterna`.
 *
 * El camino feliz tiene tres hitos (Enviada → En revisión → Aprobada). Los
 * desenlaces que no son "aprobada" (rechazada, cancelada) NO se
 * dibujan como un paso más: se muestran como estado final explícito, para
 * que nadie lea una solicitud rechazada como "va avanzando".
 */

type Milestone = { key: string; label: string };

const MILESTONES: Milestone[] = [
  { key: 'enviada', label: 'Enviada' },
  { key: 'en_revision', label: 'En revisión' },
  { key: 'resuelta', label: 'Aprobada' },
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

const estadosFinales = (Colors: ColorPalette): Record<string, FinalState> => ({
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
});

export interface RequestStatusTimelineProps {
  estado?: RequestStatus;
  /** Etiqueta ya traducida por el backend (`estado_etiqueta`). */
  estadoEtiqueta?: string;
  /** `creada_en` real — se muestra bajo "Enviada" cuando el hito ya se cumplió. */
  enviadaEn?: string | null;
  /** `revisado_en` real — se muestra bajo "En revisión"/"Resuelta" cuando aplica. */
  revisadoEn?: string | null;
  formatFecha?: (iso?: string | null) => string;
}

export function RequestStatusTimeline({ estado, estadoEtiqueta, enviadaEn, revisadoEn, formatFecha }: RequestStatusTimelineProps) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const final = estado ? estadosFinales(Colors)[estado] : undefined;

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
  const fecha = (iso?: string | null) => (iso && formatFecha ? formatFecha(iso) : undefined);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Así va tu solicitud</Text>
      {MILESTONES.map((milestone, index) => {
        const done = index < reached;
        const current = index === reached;
        // Fecha real por hito: 0 = enviada, último alcanzado = revisado_en (solo si ya se resolvió/entró a revisión).
        const milestoneDate = index === 0 ? fecha(enviadaEn) : index === reached - 1 ? fecha(revisadoEn) : undefined;
        return (
          <View key={milestone.key} style={styles.row}>
            <View style={styles.markerColumn}>
              <View style={[styles.marker, done && styles.markerDone, current && styles.markerCurrent]}>
                {done ? <Ionicons name="checkmark" size={12} color={Colors.white} /> : null}
              </View>
              {index < MILESTONES.length - 1 ? <View style={[styles.connector, done && styles.connectorDone]} /> : null}
            </View>
            <View style={styles.labelColumn}>
              <Text style={[styles.label, (done || current) && styles.labelActive]}>{milestone.label}</Text>
              {milestoneDate ? <Text style={styles.dateText}>{milestoneDate}</Text> : null}
            </View>
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

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
  container: { gap: 0 },
  heading: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.md },
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
  labelColumn: { flex: 1, paddingBottom: Spacing.md },
  label: { fontSize: FontSize.sm, color: Colors.textMuted },
  labelActive: { color: Colors.text, fontWeight: '700' },
  dateText: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
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
