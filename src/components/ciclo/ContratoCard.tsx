import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { InfoRow } from '@/components/ciclo/InfoRow';
import { Notice } from '@/components/ciclo/Screen';
import { StatusBadge } from '@/components/StatusBadge';
import { Colors, FontSize, Spacing } from '@/constants/colors';
import type { ContratoLaboral } from '@/types/cicloLaboral';
import { formatDateLong } from '@/utils/dates';

const ESTADO_BADGE: Record<string, string> = {
  vigente: 'aprobado',
  renovado: 'cerrada',
  terminado: 'cerrada',
  cancelado: 'cancelada',
};

const ESTADO_LABEL: Record<string, string> = {
  vigente: 'Vigente',
  renovado: 'Renovado',
  terminado: 'Terminado',
  cancelado: 'Cancelado',
};

/** Card de contrato laboral (autoservicio y RH) — datos y días para vencer tal como los calcula el backend. */
export function ContratoCard({ contrato, onOpenDocumento }: { contrato: ContratoLaboral; onOpenDocumento?: () => void }) {
  const porVencer = contrato.estado === 'vigente' && contrato.dias_para_vencer !== null && contrato.dias_para_vencer >= 0;
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{contrato.tipo_etiqueta}</Text>
        <StatusBadge status={ESTADO_BADGE[contrato.estado] ?? 'pendiente'} label={ESTADO_LABEL[contrato.estado] ?? contrato.estado} />
      </View>
      <InfoRow label="Inicio" value={formatDateLong(contrato.fecha_inicio)} icon="calendar-outline" />
      <InfoRow
        label="Fin"
        value={contrato.fecha_fin ? formatDateLong(contrato.fecha_fin) : contrato.tipo === 'indeterminado' ? 'Tiempo indeterminado' : null}
        icon="flag-outline"
      />
      {porVencer ? (
        <Notice tone={(contrato.dias_para_vencer ?? 0) <= 15 ? 'warning' : 'info'}>
          {contrato.dias_para_vencer === 0 ? 'Vence hoy.' : `Vence en ${contrato.dias_para_vencer} día(s).`}
          {contrato.tipo === 'periodo_prueba' ? ' Tu jefe inmediato realizará la evaluación del periodo de prueba.' : ''}
        </Notice>
      ) : null}
      <InfoRow label="Documento firmado" value={contrato.documento_id ? (contrato.documento_firmado ? 'Sí' : 'Pendiente') : null} icon="create-outline" />
      {onOpenDocumento ? <Button title="Ver documento del contrato" variant="outline" leftIcon="document-text-outline" onPress={onOpenDocumento} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  title: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
});
