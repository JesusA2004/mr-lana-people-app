import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Field, FormSheet } from '@/components/ciclo/FormSheet';
import { EmptyMessage, Notice, Screen, SectionTitle } from '@/components/ciclo/Screen';
import { StatusBadge } from '@/components/StatusBadge';
import { FontSize, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import { useRhCompletarOnboarding, useRhEntregarActivo, useRhOnboarding, useRhRetroalimentar } from '@/hooks/queries/useRhOnboarding';
import type { OnboardingActivoRh, OnboardingModuloRh } from '@/api/rh/onboarding';
import { toast } from '@/store/toastStore';
import { confirmAction } from '@/utils/confirm';
import { getActionErrorMessage, logError } from '@/utils/errors';
import { formatoCalificacion } from '@/utils/miProceso';

const ESTADO_BADGE: Record<string, string> = {
  aprobado: 'aprobada',
  requiere_refuerzo: 'rechazada',
  en_curso: 'en_revision',
  disponible: 'pendiente',
  bloqueado: 'pendiente',
};

/**
 * Onboarding de una persona (RH/jefe): módulos con su calificación, refuerzo
 * cuando sacó menos del mínimo (la retroalimentación habilita el
 * reintento), entrega de activos con responsiva y cierre del onboarding.
 * Qué se puede hacer lo decide el backend (`acciones`, `puede_retroalimentar`,
 * `bloqueos`).
 */
export default function RhOnboardingScreen() {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const { colaborador } = useLocalSearchParams<{ colaborador: string }>();
  const query = useRhOnboarding(colaborador);
  const retroalimentar = useRhRetroalimentar(colaborador ?? '');
  const entregar = useRhEntregarActivo(colaborador ?? '');
  const completar = useRhCompletarOnboarding(colaborador ?? '');

  const [moduloRefuerzo, setModuloRefuerzo] = useState<OnboardingModuloRh | null>(null);
  const [texto, setTexto] = useState('');
  const [activo, setActivo] = useState<OnboardingActivoRh | null>(null);
  const [identificador, setIdentificador] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const onboarding = query.data?.onboarding ?? null;

  const enviarRefuerzo = async () => {
    if (!moduloRefuerzo || retroalimentar.isPending) return;
    try {
      await retroalimentar.mutateAsync({ avanceId: moduloRefuerzo.avanceId, texto: texto.trim() });
      toast.success('Retroalimentación enviada: ya puede volver a intentarlo.');
      setModuloRefuerzo(null);
      setTexto('');
    } catch (error) {
      logError('rhOnboarding.retroalimentar', error);
      toast.error(getActionErrorMessage(error));
    }
  };

  const enviarActivo = async () => {
    if (!onboarding || !activo || entregar.isPending) return;
    try {
      await entregar.mutateAsync({
        procesoId: onboarding.id,
        payload: { tipo_activo_id: activo.tipoActivoId, identificador: identificador.trim() || null, observaciones: observaciones.trim() || null },
      });
      toast.success('Entrega registrada. Se generó su carta responsiva.');
      setActivo(null);
      setIdentificador('');
      setObservaciones('');
    } catch (error) {
      logError('rhOnboarding.entregar', error);
      toast.error(getActionErrorMessage(error));
    }
  };

  const terminar = async () => {
    if (!onboarding || completar.isPending) return;
    const ok = await confirmAction({ title: 'Completar onboarding', message: 'Se activará a la persona. ¿Confirmas?', confirmLabel: 'Completar' });
    if (!ok) return;
    try {
      await completar.mutateAsync(onboarding.id);
      toast.success('Onboarding completado.');
    } catch (error) {
      logError('rhOnboarding.completar', error);
      toast.error(getActionErrorMessage(error));
    }
  };

  return (
    <Screen
      title="Onboarding"
      subtitle={query.data?.nombre}
      isLoading={query.isLoading}
      error={query.error}
      notFoundMessage="No encontramos a esta persona."
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}>
      {!onboarding ? (
        <EmptyMessage message="Esta persona todavía no tiene onboarding. Inicia cuando su expediente y contratos estén listos." />
      ) : (
        <>
          <Card style={styles.gap}>
            <View style={styles.row}>
              <Text style={styles.titulo}>{onboarding.estadoEtiqueta || 'Onboarding'}</Text>
            </View>
            {onboarding.checklist.map((c) => (
              <View key={c.clave} style={styles.row}>
                <Ionicons name={c.completado ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={c.completado ? Colors.success : Colors.textMuted} />
                <Text style={styles.texto}>{c.etiqueta}</Text>
              </View>
            ))}
          </Card>

          {onboarding.bloqueos.length > 0 ? <Notice tone="warning">{onboarding.bloqueos.join(' ')}</Notice> : null}

          <SectionTitle>Módulos</SectionTitle>
          {onboarding.modulos.length === 0 ? <EmptyMessage message="Sin módulos asignados." /> : null}
          {onboarding.modulos.map((m) => (
            <Card key={m.avanceId} style={styles.gap}>
              <View style={styles.rowBetween}>
                <View style={styles.flex}>
                  <Text style={styles.titulo}>{m.titulo}</Text>
                  <Text style={styles.muted}>
                    {m.tipoEtiqueta}
                    {m.obligatorio ? ' · obligatorio' : ''} · mínimo {formatoCalificacion(m.calificacionMinima)}
                  </Text>
                </View>
                <StatusBadge status={ESTADO_BADGE[m.estado] ?? 'pendiente'} label={m.estadoEtiqueta} />
              </View>
              <Text style={styles.texto}>
                {m.intentos === 0 ? 'Sin intentos todavía.' : `${m.intentos} ${m.intentos === 1 ? 'intento' : 'intentos'} · mejor ${formatoCalificacion(m.mejorCalificacion)}`}
              </Text>
              {m.retroalimentacion ? <Text style={styles.muted}>Retroalimentación: {m.retroalimentacion}</Text> : null}
              {m.puedeRetroalimentar ? (
                <Button
                  title="Dar retroalimentación y habilitar reintento"
                  variant="outline"
                  onPress={() => {
                    setTexto('');
                    setModuloRefuerzo(m);
                  }}
                />
              ) : null}
            </Card>
          ))}

          <SectionTitle>Activos y responsivas</SectionTitle>
          {onboarding.activos.length === 0 ? <EmptyMessage message="Su puesto no requiere activos." /> : null}
          {onboarding.activos.map((a) => (
            <Card key={a.tipoActivoId} style={styles.gap}>
              <View style={styles.rowBetween}>
                <Text style={[styles.titulo, styles.flex]}>{a.nombre}</Text>
                <StatusBadge status={a.entregado ? 'aprobada' : 'pendiente'} label={a.entregado ? 'Entregado' : 'Pendiente'} />
              </View>
              {a.entregado ? (
                <Text style={styles.muted}>
                  {[a.identificador, a.entregadoEn, a.responsivaEstado ? `Responsiva: ${a.responsivaEstado}` : null].filter(Boolean).join(' · ')}
                </Text>
              ) : onboarding.puedeEntregarActivos ? (
                <Button
                  title="Registrar entrega"
                  variant="outline"
                  onPress={() => {
                    setIdentificador('');
                    setObservaciones('');
                    setActivo(a);
                  }}
                />
              ) : (
                <Text style={styles.muted}>Se entrega cuando apruebe su inducción.</Text>
              )}
            </Card>
          ))}

          {onboarding.puedeCompletar ? (
            <Button title="Completar onboarding" onPress={() => void terminar()} loading={completar.isPending} disabled={completar.isPending} />
          ) : null}
        </>
      )}

      <FormSheet
        visible={moduloRefuerzo !== null}
        title="Retroalimentación"
        description={moduloRefuerzo ? `${moduloRefuerzo.titulo}: al guardarla, la persona puede volver a responder.` : undefined}
        confirmLabel="Enviar"
        submitting={retroalimentar.isPending}
        confirmDisabled={texto.trim().length < 5 || retroalimentar.isPending}
        onCancel={() => setModuloRefuerzo(null)}
        onConfirm={() => void enviarRefuerzo()}>
        <Field label="Qué debe reforzar" value={texto} onChangeText={setTexto} multiline maxLength={4000} />
      </FormSheet>

      <FormSheet
        visible={activo !== null}
        title={activo ? `Entregar: ${activo.nombre}` : 'Entregar activo'}
        description="Se genera su carta responsiva para firma."
        confirmLabel="Registrar"
        submitting={entregar.isPending}
        confirmDisabled={entregar.isPending || (activo?.requiereIdentificador === true && identificador.trim() === '')}
        onCancel={() => setActivo(null)}
        onConfirm={() => void enviarActivo()}>
        <Field
          label={activo?.requiereIdentificador ? 'Número de serie / identificador' : 'Identificador (opcional)'}
          value={identificador}
          onChangeText={setIdentificador}
          maxLength={120}
        />
        <Field label="Observaciones (opcional)" value={observaciones} onChangeText={setObservaciones} multiline maxLength={2000} />
      </FormSheet>
    </Screen>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
  gap: {
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  titulo: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  texto: {
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  muted: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
});
