import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { InfoRow } from '@/components/ciclo/InfoRow';
import { Notice, Screen, SectionTitle } from '@/components/ciclo/Screen';
import { MotivoModal } from '@/components/MotivoModal';
import { PressableScale } from '@/components/PressableScale';
import { StatusBadge } from '@/components/StatusBadge';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';
import { useAutorizarEvaluacion, useCapturarEvaluacion, useDevolverEvaluacion, useEquipoPendientes, useEvaluacion } from '@/hooks/queries/useTrabajo';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { toast } from '@/store/toastStore';
import type { Evaluacion } from '@/types/evaluation';
import { formatDateLong, formatDateTime } from '@/utils/dates';
import { getActionErrorMessage, getFieldError, logError } from '@/utils/errors';
import { consecuenciaAutorizacion, evaluacionBadge, evaluationActions } from '@/utils/evaluation';
import { haptics } from '@/utils/haptics';

interface CriterioForm {
  criterio: string;
  calificacion: string;
  comentario: string;
}

/**
 * Evaluación de periodo de prueba (jefe captura; RH/Dirección autoriza o
 * devuelve). Botones SOLO cuando estado + permiso lo permiten
 * (`utils/evaluation.ts`); el backend (`EvaluacionPeriodoPruebaPolicy`)
 * decide al final. La app no calcula promedio ni resultado: los calcula y
 * guarda el backend al capturar.
 */
export default function EvaluacionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const numericId = Number(id);
  const query = useEvaluacion(id);
  const bootstrap = useMobileBootstrap(true);
  const equipo = useEquipoPendientes();
  const evaluacion = query.data;

  const esDeMiEquipo = useMemo(() => (equipo.data?.evaluaciones ?? []).some((e) => e.id === numericId), [equipo.data, numericId]);
  const actions = evaluacion ? evaluationActions(evaluacion, bootstrap.data?.user.permissions, esDeMiEquipo) : null;

  return (
    <Screen
      title="Evaluación"
      subtitle="Periodo de prueba"
      isLoading={query.isLoading}
      error={query.error}
      notFoundMessage="Esta evaluación ya no está disponible."
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}>
      {evaluacion && actions ? (
        <>
          <Resumen evaluacion={evaluacion} />
          {actions.capturar ? <CapturaForm key={`${evaluacion.id}-${evaluacion.estado}`} evaluacion={evaluacion} /> : <Resultado evaluacion={evaluacion} />}
          {actions.autorizar || actions.devolver ? <Autorizacion evaluacion={evaluacion} /> : null}
          {!actions.capturar && !actions.autorizar && evaluacion.estado !== 'autorizada' ? (
            <Notice tone="info">
              {evaluacion.estado === 'capturada'
                ? 'La evaluación ya fue capturada y espera autorización de RH/Dirección.'
                : 'Esta evaluación la captura el jefe inmediato del colaborador.'}
            </Notice>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

function Resumen({ evaluacion }: { evaluacion: Evaluacion }) {
  const contrato = evaluacion.contrato;
  return (
    <Card style={styles.gap}>
      <View style={styles.header}>
        <Text style={styles.title}>{evaluacion.colaborador?.nombre ?? 'Colaborador'}</Text>
        <StatusBadge status={evaluacionBadge(evaluacion.estado)} label={evaluacion.estado_etiqueta ?? undefined} />
      </View>
      <InfoRow label="N.º de empleado" value={evaluacion.colaborador?.numero_empleado} />
      <InfoRow label="Contrato" value={contrato?.tipo_etiqueta} icon="document-text-outline" />
      <InfoRow label="Vence el contrato" value={formatDateLong(contrato?.fecha_fin)} icon="calendar-outline" />
      <InfoRow
        label="Días para vencer"
        value={contrato?.dias_para_vencer !== null && contrato?.dias_para_vencer !== undefined ? String(contrato.dias_para_vencer) : null}
      />
      <InfoRow label="Fecha límite de evaluación" value={formatDateLong(evaluacion.fecha_limite)} icon="alarm-outline" />
      {evaluacion.comentario_autorizacion && evaluacion.estado === 'devuelta' ? (
        <Notice tone="warning">Devuelta por RH: {evaluacion.comentario_autorizacion}</Notice>
      ) : null}
    </Card>
  );
}

function Resultado({ evaluacion }: { evaluacion: Evaluacion }) {
  if (evaluacion.criterios.length === 0 && evaluacion.calificacion === null) return null;
  return (
    <Card style={styles.gap}>
      <SectionTitle>Resultado</SectionTitle>
      {evaluacion.criterios.map((c, index) => (
        <InfoRow key={`${c.criterio}-${index}`} label={c.criterio} value={c.calificacion !== null ? `${c.calificacion} / 10` : null} />
      ))}
      <InfoRow label="Calificación (backend)" value={evaluacion.calificacion} emphasis />
      <InfoRow label="Resultado" value={evaluacion.resultado === 'aprobado' ? 'Aprobado' : evaluacion.resultado === 'no_aprobado' ? 'No aprobado' : null} />
      <InfoRow
        label="Recomendación del jefe"
        value={evaluacion.recomienda_renovar === null ? null : evaluacion.recomienda_renovar ? 'Renovar' : 'No renovar'}
      />
      <InfoRow label="Fecha de evaluación" value={formatDateLong(evaluacion.fecha_evaluacion)} />
      {evaluacion.observaciones ? <Text style={styles.body}>{evaluacion.observaciones}</Text> : null}
      {evaluacion.estado === 'autorizada' ? (
        <Notice tone={evaluacion.decision_renovar ? 'success' : 'warning'}>
          {evaluacion.decision_renovar ? 'Autorizada: contrato renovado.' : 'Autorizada: no renovación (cierre laboral iniciado).'}
          {evaluacion.autorizada_en ? ` ${formatDateTime(evaluacion.autorizada_en)}.` : ''}
        </Notice>
      ) : null}
    </Card>
  );
}

function initialCriterios(evaluacion: Evaluacion): CriterioForm[] {
  if (evaluacion.criterios.length > 0) {
    return evaluacion.criterios.map((c) => ({ criterio: c.criterio, calificacion: c.calificacion !== null ? String(c.calificacion) : '', comentario: c.comentario ?? '' }));
  }
  return evaluacion.criterios_sugeridos.map((criterio) => ({ criterio, calificacion: '', comentario: '' }));
}

function CapturaForm({ evaluacion }: { evaluacion: Evaluacion }) {
  const capturar = useCapturarEvaluacion(evaluacion.id);
  const { isOffline } = useNetworkStatus();
  const [criterios, setCriterios] = useState<CriterioForm[]>(() => initialCriterios(evaluacion));
  const [recomiendaRenovar, setRecomiendaRenovar] = useState<boolean | null>(evaluacion.recomienda_renovar);
  const [observaciones, setObservaciones] = useState(evaluacion.observaciones ?? '');

  const calificacionesValidas = criterios.every((c) => {
    const n = Number(c.calificacion.replace(',', '.'));
    return c.calificacion.trim() !== '' && Number.isFinite(n) && n >= 0 && n <= 10;
  });
  const listo = criterios.length > 0 && calificacionesValidas && recomiendaRenovar !== null;

  const enviar = () => {
    if (recomiendaRenovar === null) return;
    Alert.alert('Enviar evaluación', 'La evaluación pasará a RH/Dirección para su autorización.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Enviar',
        onPress: () =>
          capturar.mutate(
            {
              criterios: criterios.map((c) => ({
                criterio: c.criterio,
                calificacion: Number(c.calificacion.replace(',', '.')),
                comentario: c.comentario.trim() || null,
              })),
              recomienda_renovar: recomiendaRenovar,
              observaciones: observaciones.trim() || null,
            },
            {
              onSuccess: () => {
                haptics.success();
                toast.success('Evaluación capturada.');
              },
              onError: (error) => {
                logError('evaluacion.capturar', error);
                haptics.error();
                toast.error(getActionErrorMessage(error));
              },
            },
          ),
      },
    ]);
  };

  return (
    <Card style={styles.gap}>
      <SectionTitle>Capturar evaluación</SectionTitle>
      <Text style={styles.hint}>Califica cada criterio de 0 a 10. El promedio y el resultado los calcula el sistema al guardar.</Text>
      {criterios.length === 0 ? <Notice tone="warning">El backend no envió criterios para esta evaluación.</Notice> : null}
      {criterios.map((c, index) => (
        <View key={`${c.criterio}-${index}`} style={styles.criterio}>
          <Text style={styles.criterioLabel}>{c.criterio}</Text>
          <TextInput
            accessibilityLabel={`Calificación de ${c.criterio}, de 0 a 10`}
            keyboardType="decimal-pad"
            placeholder="0 – 10"
            placeholderTextColor={Colors.textMuted}
            value={c.calificacion}
            maxLength={5}
            onChangeText={(text) => setCriterios((prev) => prev.map((item, i) => (i === index ? { ...item, calificacion: text } : item)))}
            style={styles.scoreInput}
          />
          <TextInput
            accessibilityLabel={`Comentario de ${c.criterio}`}
            placeholder="Comentario (opcional)"
            placeholderTextColor={Colors.textMuted}
            value={c.comentario}
            maxLength={500}
            onChangeText={(text) => setCriterios((prev) => prev.map((item, i) => (i === index ? { ...item, comentario: text } : item)))}
            style={styles.textInput}
          />
          {getFieldError(capturar.error, `criterios.${index}.calificacion`) ? (
            <Text style={styles.error}>{getFieldError(capturar.error, `criterios.${index}.calificacion`)}</Text>
          ) : null}
        </View>
      ))}

      <Text style={styles.criterioLabel}>Recomendación</Text>
      <View style={styles.choiceRow}>
        <Choice label="Renovar" selected={recomiendaRenovar === true} onPress={() => setRecomiendaRenovar(true)} />
        <Choice label="No renovar" selected={recomiendaRenovar === false} onPress={() => setRecomiendaRenovar(false)} />
      </View>

      <TextInput
        accessibilityLabel="Observaciones"
        placeholder="Observaciones (opcional)"
        placeholderTextColor={Colors.textMuted}
        value={observaciones}
        onChangeText={setObservaciones}
        multiline
        maxLength={2000}
        style={[styles.textInput, styles.multiline]}
      />
      {isOffline ? <Notice tone="warning">Sin conexión: la evaluación requiere confirmación del servidor.</Notice> : null}
      <Button title="Enviar evaluación" leftIcon="send-outline" disabled={!listo || isOffline} loading={capturar.isPending} onPress={enviar} />
    </Card>
  );
}

function Autorizacion({ evaluacion }: { evaluacion: Evaluacion }) {
  const autorizar = useAutorizarEvaluacion(evaluacion.id);
  const devolver = useDevolverEvaluacion(evaluacion.id);
  const { isOffline } = useNetworkStatus();
  const [renovar, setRenovar] = useState<boolean | null>(evaluacion.recomienda_renovar);
  const [comentario, setComentario] = useState('');
  const [motivoNoRenovacion, setMotivoNoRenovacion] = useState('');
  const [devolviendo, setDevolviendo] = useState(false);

  const confirmar = () => {
    if (renovar === null) return;
    Alert.alert(renovar ? 'Autorizar renovación' : 'Autorizar no renovación', consecuenciaAutorizacion(renovar), [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Autorizar',
        style: renovar ? 'default' : 'destructive',
        onPress: () =>
          autorizar.mutate(
            {
              renovar,
              comentario: comentario.trim() || null,
              motivo_no_renovacion: !renovar ? motivoNoRenovacion.trim() || null : null,
            },
            {
              onSuccess: () => {
                haptics.success();
                toast.success('Evaluación autorizada.');
              },
              onError: (error) => {
                logError('evaluacion.autorizar', error);
                haptics.error();
                toast.error(getActionErrorMessage(error));
              },
            },
          ),
      },
    ]);
  };

  return (
    <Card style={styles.gap}>
      <SectionTitle>Autorización RH / Dirección</SectionTitle>
      <Text style={styles.criterioLabel}>Decisión</Text>
      <View style={styles.choiceRow}>
        <Choice label="Renovar" selected={renovar === true} onPress={() => setRenovar(true)} />
        <Choice label="No renovar / iniciar cierre" selected={renovar === false} onPress={() => setRenovar(false)} />
      </View>
      {renovar !== null ? <Notice tone={renovar ? 'info' : 'warning'}>{consecuenciaAutorizacion(renovar)}</Notice> : null}
      {renovar === false ? (
        <TextInput
          accessibilityLabel="Motivo de no renovación"
          placeholder="Motivo de no renovación (opcional)"
          placeholderTextColor={Colors.textMuted}
          value={motivoNoRenovacion}
          onChangeText={setMotivoNoRenovacion}
          multiline
          maxLength={1000}
          style={[styles.textInput, styles.multiline]}
        />
      ) : null}
      <TextInput
        accessibilityLabel="Comentario de autorización"
        placeholder="Comentario (opcional)"
        placeholderTextColor={Colors.textMuted}
        value={comentario}
        onChangeText={setComentario}
        maxLength={1000}
        style={styles.textInput}
      />
      {isOffline ? <Notice tone="warning">Sin conexión: esta acción requiere confirmación del servidor.</Notice> : null}
      <View style={styles.choiceRow}>
        <Button title="Devolver" variant="outline" disabled={isOffline || autorizar.isPending} onPress={() => setDevolviendo(true)} style={styles.flex} />
        <Button title="Autorizar" disabled={renovar === null || isOffline} loading={autorizar.isPending} onPress={confirmar} style={styles.flex} />
      </View>
      <MotivoModal
        visible={devolviendo}
        title="Devolver evaluación"
        description="El jefe inmediato recibirá el motivo para corregir la evaluación."
        confirmLabel="Devolver"
        submitting={devolver.isPending}
        onCancel={() => setDevolviendo(false)}
        onConfirm={(motivo) =>
          devolver.mutate(motivo, {
            onSuccess: () => {
              haptics.success();
              setDevolviendo(false);
              toast.success('Evaluación devuelta al jefe inmediato.');
            },
            onError: (error) => {
              logError('evaluacion.devolver', error);
              toast.error(getActionErrorMessage(error));
            },
          })
        }
      />
    </Card>
  );
}

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${label}${selected ? ', seleccionado' : ''}`}
      onPress={onPress}
      style={[styles.choice, selected && styles.choiceSelected] as object}>
      <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={18} color={selected ? Colors.primary : Colors.textMuted} />
      <Text style={[styles.choiceLabel, selected && styles.choiceLabelSelected]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  gap: {
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
    flexShrink: 1,
  },
  body: {
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  hint: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  criterio: {
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  criterioLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  scoreInput: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    backgroundColor: Colors.surface,
    width: 110,
  },
  textInput: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  multiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  error: {
    fontSize: FontSize.xs,
    color: Colors.danger,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  choiceSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
  },
  choiceLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  choiceLabelSelected: {
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  flex: {
    flex: 1,
  },
});
