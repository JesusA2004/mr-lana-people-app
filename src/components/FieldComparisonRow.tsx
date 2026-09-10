import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { ConfidenceBadge } from './ConfidenceBadge';

import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import type { ExtractionConfidenceLevel } from '@/types/documentExtraction';

export interface FieldMatchRowProps {
  label: string;
  value: string;
  confidenceLevel?: ExtractionConfidenceLevel;
}

/** Campo detectado que COINCIDE con lo que ya tiene el sistema — sección 9: "Coincide ✓". */
export function FieldMatchRow({ label, value, confidenceLevel }: FieldMatchRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.matchChip}>
          <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
          <Text style={styles.matchChipText}>Coincide</Text>
        </View>
      </View>
      <Text style={styles.value} numberOfLines={2}>
        {value}
      </Text>
      <ConfidenceBadge level={confidenceLevel} />
    </View>
  );
}

export interface FieldComparisonRowProps {
  label: string;
  systemValue: string | null;
  detectedValue: string;
  confidenceLevel?: ExtractionConfidenceLevel;
  /** `'detected'` si RH ya eligió usar el dato detectado para este campo, `'current'`/`null` si conserva el actual — controlado por el padre (selección se aplica junta al final, ver `rhDocumentExtractionApi.aplicar`). */
  selection: 'detected' | 'current' | null;
  onSelect: (selection: 'detected' | 'current') => void;
  /**
   * `false` para campos que el backend detecta pero no puede aplicar
   * (`codigo_postal`/`sexo`, sin columna propia en `users`) — se muestran
   * informativos, sin botones de acción, nunca prometiendo un "usar dato
   * detectado" que el backend ignoraría en silencio.
   */
  applicable?: boolean;
}

/** Campo con DIFERENCIA entre lo que ya tiene el sistema y lo que detectó el análisis — sección 9: "Diferencia encontrada". */
export function FieldComparisonRow({ label, systemValue, detectedValue, confidenceLevel, selection, onSelect, applicable = true }: FieldComparisonRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.diffChip}>
          <Ionicons name="alert-circle" size={14} color={Colors.warning} />
          <Text style={styles.diffChipText}>Diferencia encontrada</Text>
        </View>
      </View>

      <View style={styles.compareGrid}>
        <View style={styles.compareColumn}>
          <Text style={styles.compareLabel}>Sistema</Text>
          <Text style={styles.compareValue} numberOfLines={3}>
            {systemValue || '—'}
          </Text>
        </View>
        <View style={styles.compareColumn}>
          <Text style={styles.compareLabel}>Detectado</Text>
          <Text style={styles.compareValue} numberOfLines={3}>
            {detectedValue}
          </Text>
        </View>
      </View>

      <ConfidenceBadge level={confidenceLevel} />

      {applicable ? (
        <View style={styles.actions}>
          <Button
            title="Conservar actual"
            variant={selection === 'detected' ? 'outline' : 'secondary'}
            fullWidth={false}
            onPress={() => onSelect('current')}
            style={styles.actionButton}
          />
          <Button
            title="Usar dato detectado"
            variant={selection === 'detected' ? 'secondary' : 'outline'}
            fullWidth={false}
            onPress={() => onSelect('detected')}
            style={styles.actionButton}
          />
        </View>
      ) : (
        <Text style={styles.notApplicableText}>Este dato no tiene un campo propio en el perfil — solo informativo.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  value: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
  matchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matchChipText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.success,
  },
  diffChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  diffChipText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.warning,
  },
  compareGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  compareColumn: {
    flex: 1,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    gap: 2,
  },
  compareLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  compareValue: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    minHeight: 40,
  },
  notApplicableText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
});
