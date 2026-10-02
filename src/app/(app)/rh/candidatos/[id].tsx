import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FilterChips } from '@/components/ciclo/FilterChips';
import { Field, FormSheet } from '@/components/ciclo/FormSheet';
import { InfoRow } from '@/components/ciclo/InfoRow';
import { Notice, Screen, SectionTitle } from '@/components/ciclo/Screen';
import { DocumentUploadSheet, type PickedDocumentFile } from '@/components/DocumentUploadSheet';
import { MotivoModal } from '@/components/MotivoModal';
import { PressableScale } from '@/components/PressableScale';
import { StatusBadge } from '@/components/StatusBadge';
import { Stepper } from '@/components/Stepper';
import { Colors, FontSize, Spacing } from '@/constants/colors';
import { useRhCandidato, useRhOperarCandidato, type RhCandidatoOperacion } from '@/hooks/queries/useRhCandidatos';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { toast } from '@/store/toastStore';
import { candidatoBadge } from '@/utils/candidato';
import { formatDateLong } from '@/utils/dates';
import { getActionErrorMessage, logError } from '@/utils/errors';
import { haptics } from '@/utils/haptics';

const OPCIONES_DESCARTE: { value: 'no_viable' | 'no_seleccionado' | 'no_respondio' | 'desistio'; label: string }[] = [
  { value: 'no_viable', label: 'No viable' },
  { value: 'no_seleccionado', label: 'No seleccionado' },
  { value: 'no_respondio', label: 'No respondió' },
  { value: 'desistio', label: 'Desistió' },
];

type Sheet =
  | null
  | 'evaluar_perfil'
  | 'entrevista'
  | 'psico_link'
  | 'psico_resultados'
  | 'psico_revision'
  | 'socioeconomico'
  | 'referencia'
  | 'referencias_concluir'
  | 'preautorizar'
  | 'autorizar'
  | 'rechazar'
  | 'devolver'
  | 'descartar';

/**
 * Ficha de reclutamiento por pasos (perfil → entrevista → psicométricas →
 * socioeconómico → referencias → preautorización → autorización RH). Cada
 * botón sale de `ciclo.acciones_permitidas` (el backend ya resolvió permiso +
 * alcance + separación preautoriza/autoriza): la app nunca decide por rol.
 */
export default function RhCandidatoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useRhCandidato(id);
  const ficha = query.data;
  const candidato = ficha?.candidato;
  const ciclo = ficha?.ciclo;
  const operar = useRhOperarCandidato(Number(id));
  const { isOffline } = useNetworkStatus();

  const [sheet, setSheet] = useState<Sheet>(null);
  const [viable, setViable] = useState<'viable' | 'no_viable'>('viable');
  const [observaciones, setObservaciones] = useState('');
  const [link, setLink] = useState('');
  const [resumen, setResumen] = useState('');
  const [archivos, setArchivos] = useState<PickedDocumentFile[]>([]);
  const [attachOpen, setAttachOpen] = useState(false);
  const [direccion, setDireccion] = useState('');
  const [riesgos, setRiesgos] = useState('');
  const [refEmpresa, setRefEmpresa] = useState('');
  const [refContacto, setRefContacto] = useState('');
  const [refTelefono, setRefTelefono] = useState('');
  const [refRelacion, setRefRelacion] = useState('');
  const [refResultado, setRefResultado] = useState<'positiva' | 'negativa' | 'no_localizada'>('positiva');
  const [comentario, setComentario] = useState('');
  const [descarteEstado, setDescarteEstado] = useState<'no_viable' | 'no_seleccionado' | 'no_respondio' | 'desistio'>('no_viable');
  const [descarteMotivo, setDescarteMotivo] = useState('');

  const acciones = ciclo?.acciones_permitidas ?? [];
  const has = (clave: string) => acciones.some((a) => a.clave === clave);

  const cerrarSheet = () => {
    setSheet(null);
    setObservaciones('');
    setLink('');
    setResumen('');
    setArchivos([]);
    setDireccion('');
    setRiesgos('');
    setRefEmpresa('');
    setRefContacto('');
    setRefTelefono('');
    setRefRelacion('');
    setComentario('');
    setDescarteMotivo('');
  };

  const ejecutar = (op: RhCandidatoOperacion, exito: string) =>
    operar.mutate(op, {
      onSuccess: () => {
        haptics.success();
        toast.success(exito);
        cerrarSheet();
      },
      onError: (error) => {
        logError('rhCandidato.operar', error);
        haptics.error();
        toast.error(getActionErrorMessage(error));
      },
    });

  const localFile = (file: PickedDocumentFile) => ({ uri: file.uri, name: file.name, mimeType: file.mimeType });

  return (
    <Screen
      title="Candidato"
      subtitle={candidato?.nombre_completo}
      isLoading={query.isLoading}
      error={query.error}
      notFoundMessage="Este candidato ya no está disponible."
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}>
      {candidato && ciclo ? (
        <>
          <Card style={styles.gap}>
            <View style={styles.header}>
              <Text style={styles.title}>{candidato.nombre_completo}</Text>
              <StatusBadge status={candidatoBadge(candidato.estado)} label={candidato.estado_etiqueta ?? undefined} />
            </View>
            {ciclo.pasos.length > 0 ? (
              <Stepper
                steps={ciclo.pasos.map((p) => p.etiqueta)}
                currentIndex={Math.max(
                  ciclo.pasos.findIndex((p) => p.estado === 'actual'),
                  ciclo.pasos.filter((p) => p.estado === 'completado').length - 1,
                  0,
                )}
              />
            ) : null}
            {ciclo.siguiente_accion ? <Notice tone="info">{ciclo.siguiente_accion.etiqueta}</Notice> : null}
            {ciclo.bloqueos.map((bloqueo, index) => (
              <Notice key={index} tone="warning">
                {bloqueo}
              </Notice>
            ))}
            <InfoRow label="Puesto" value={candidato.puesto} icon="briefcase-outline" />
            <InfoRow label="Sucursal" value={candidato.sucursal} icon="location-outline" />
            <InfoRow label="Teléfono" value={candidato.telefono} icon="call-outline" />
            <InfoRow label="Correo" value={candidato.correo} icon="mail-outline" />
            <InfoRow label="Fuente" value={candidato.fuente} />
            <InfoRow label="Responsable de reclutamiento" value={candidato.responsable_rh} />
            <InfoRow label="Gerente involucrado" value={candidato.gerente} />
            {candidato.motivo_salida ? <InfoRow label="Motivo" value={candidato.motivo_salida} /> : null}
          </Card>

          {candidato.entrevistas.length > 0 ? (
            <Card style={styles.gap}>
              <SectionTitle>Entrevistas</SectionTitle>
              {candidato.entrevistas.map((e) => (
                <View key={e.id} style={styles.subItem}>
                  <Text style={styles.subItemTitle}>{formatDateLong(e.realizada_en)}</Text>
                  <Text style={styles.muted}>
                    {e.resultado_etiqueta ?? e.resultado}
                    {e.entrevistador ? ` · ${e.entrevistador}` : ''}
                  </Text>
                  {e.observaciones ? <Text style={styles.muted}>{e.observaciones}</Text> : null}
                </View>
              ))}
            </Card>
          ) : null}

          {candidato.psicometricas.length > 0 ? (
            <Card style={styles.gap}>
              <SectionTitle>Psicométricas</SectionTitle>
              {candidato.psicometricas.map((p) => (
                <View key={p.id} style={styles.subItem}>
                  {p.resumen_resultados ? <Text style={styles.subItemTitle}>{p.resumen_resultados}</Text> : <Text style={styles.muted}>Link enviado, en espera de resultados.</Text>}
                  {p.revision_resultado ? <Text style={styles.muted}>Revisión: {p.revision_resultado === 'viable' ? 'Viable' : 'No viable'}</Text> : null}
                  {p.revision_observaciones ? <Text style={styles.muted}>{p.revision_observaciones}</Text> : null}
                  {p.evidencias.length > 0 ? <Text style={styles.muted}>{p.evidencias.length} archivo(s) adjunto(s)</Text> : null}
                </View>
              ))}
            </Card>
          ) : null}

          {candidato.socioeconomicos.length > 0 ? (
            <Card style={styles.gap}>
              <SectionTitle>Estudio socioeconómico</SectionTitle>
              {candidato.socioeconomicos.map((s) => (
                <View key={s.id} style={styles.subItem}>
                  <Text style={styles.subItemTitle}>{formatDateLong(s.fecha_visita)}</Text>
                  <Text style={styles.muted}>{s.direccion}</Text>
                  <Text style={styles.muted}>Resultado: {s.resultado_etiqueta ?? s.resultado}</Text>
                  {s.riesgos ? <Text style={styles.muted}>Riesgos: {s.riesgos}</Text> : null}
                  {s.evidencias.length > 0 ? <Text style={styles.muted}>{s.evidencias.length} evidencia(s)</Text> : null}
                </View>
              ))}
            </Card>
          ) : null}

          {candidato.referencias.length > 0 ? (
            <Card style={styles.gap}>
              <SectionTitle>Referencias laborales</SectionTitle>
              {candidato.referencias.map((r) => (
                <View key={r.id} style={styles.subItem}>
                  <Text style={styles.subItemTitle}>
                    {r.empresa} · {r.contacto}
                  </Text>
                  <Text style={styles.muted}>{r.resultado_etiqueta ?? r.resultado}</Text>
                  {r.observaciones ? <Text style={styles.muted}>{r.observaciones}</Text> : null}
                </View>
              ))}
            </Card>
          ) : null}

          {ciclo.aprobaciones.length > 0 ? (
            <Card style={styles.gap}>
              <SectionTitle>Cadena de autorización</SectionTitle>
              {ciclo.aprobaciones.map((a, index) => (
                <View key={index} style={styles.subItem}>
                  <Text style={styles.subItemTitle}>{a.etiqueta}</Text>
                  <Text style={styles.muted}>
                    {a.estado === 'pendiente' ? 'Pendiente' : `${a.estado} — ${a.decidio ?? ''}`}
                    {a.aprobadores.length > 0 && a.estado === 'pendiente' ? ` (${a.aprobadores.join(', ')})` : ''}
                  </Text>
                </View>
              ))}
            </Card>
          ) : null}

          {acciones.length > 0 ? (
            <Card style={styles.gap}>
              <SectionTitle>Acciones</SectionTitle>
              {isOffline ? <Notice tone="warning">Sin conexión: estas acciones requieren confirmación del servidor.</Notice> : null}
              {has('evaluar_perfil') ? <Button title="Revisar perfil" variant="outline" disabled={isOffline} onPress={() => setSheet('evaluar_perfil')} /> : null}
              {has('registrar_entrevista') ? <Button title="Registrar entrevista" variant="outline" disabled={isOffline} onPress={() => setSheet('entrevista')} /> : null}
              {has('enviar_psicometricas') ? <Button title="Registrar link de psicométricas" variant="outline" disabled={isOffline} onPress={() => setSheet('psico_link')} /> : null}
              {has('registrar_resultados_psicometricas') ? <Button title="Registrar resultados" variant="outline" disabled={isOffline} onPress={() => setSheet('psico_resultados')} /> : null}
              {has('revisar_psicometricas') ? <Button title="Revisar psicométricas" variant="outline" disabled={isOffline} onPress={() => setSheet('psico_revision')} /> : null}
              {has('registrar_socioeconomico') ? <Button title="Registrar estudio socioeconómico" variant="outline" disabled={isOffline} onPress={() => setSheet('socioeconomico')} /> : null}
              {has('registrar_referencia') ? <Button title="Registrar referencia" variant="outline" disabled={isOffline} onPress={() => setSheet('referencia')} /> : null}
              {has('concluir_referencias') ? <Button title="Concluir validación de referencias" variant="outline" disabled={isOffline} onPress={() => setSheet('referencias_concluir')} /> : null}
              {has('preautorizar') ? <Button title="Preautorizar contratación" disabled={isOffline} onPress={() => setSheet('preautorizar')} /> : null}
              {has('autorizar_rh') ? <Button title="Autorizar contratación" disabled={isOffline} onPress={() => setSheet('autorizar')} /> : null}
              {has('devolver_rh') ? <Button title="Devolver al gerente" variant="ghost" disabled={isOffline} onPress={() => setSheet('devolver')} /> : null}
              {has('rechazar_rh') ? <Button title="Rechazar" variant="danger" disabled={isOffline} onPress={() => setSheet('rechazar')} /> : null}
              {has('descartar') ? <Button title="Cerrar proceso del candidato" variant="ghost" disabled={isOffline} onPress={() => setSheet('descartar')} /> : null}
            </Card>
          ) : null}

          {/* Perfil / revisión de psicométricas / conclusión de referencias: mismo payload {viable, observaciones}. */}
          <FormSheet
            visible={sheet === 'evaluar_perfil' || sheet === 'psico_revision' || sheet === 'referencias_concluir'}
            title={sheet === 'evaluar_perfil' ? 'Revisar perfil' : sheet === 'psico_revision' ? 'Revisar psicométricas' : 'Concluir validación de referencias'}
            confirmLabel="Guardar"
            submitting={operar.isPending}
            confirmDisabled={viable === 'no_viable' && observaciones.trim() === ''}
            onCancel={cerrarSheet}
            onConfirm={() => {
              const payload = { viable: viable === 'viable', observaciones: observaciones.trim() || null };
              if (sheet === 'evaluar_perfil') ejecutar({ tipo: 'evaluar_perfil', payload }, 'Registrado.');
              else if (sheet === 'psico_revision') ejecutar({ tipo: 'revisar_psicometricas', payload }, 'Registrado.');
              else ejecutar({ tipo: 'concluir_referencias', payload }, 'Registrado.');
            }}>
            <View style={styles.chips}>
              <FilterChips
                options={[
                  { value: 'viable', label: 'Viable' },
                  { value: 'no_viable', label: 'No viable' },
                ]}
                value={viable}
                onChange={setViable}
              />
            </View>
            <Field label={viable === 'no_viable' ? 'Motivo (obligatorio)' : 'Observaciones (opcional)'} value={observaciones} onChangeText={setObservaciones} multiline maxLength={4000} />
          </FormSheet>

          <FormSheet
            visible={sheet === 'entrevista'}
            title="Registrar entrevista"
            description="La fecha se registra con la hora actual."
            confirmLabel="Guardar"
            submitting={operar.isPending}
            confirmDisabled={viable === 'no_viable' && observaciones.trim() === ''}
            onCancel={cerrarSheet}
            onConfirm={() =>
              ejecutar(
                { tipo: 'registrar_entrevista', payload: { realizada_en: new Date().toISOString(), resultado: viable, observaciones: observaciones.trim() || null } },
                'Entrevista registrada.',
              )
            }>
            <View style={styles.chips}>
              <FilterChips
                options={[
                  { value: 'viable', label: 'Viable' },
                  { value: 'no_viable', label: 'No viable' },
                ]}
                value={viable}
                onChange={setViable}
              />
            </View>
            <Field label={viable === 'no_viable' ? 'Motivo (obligatorio)' : 'Observaciones (opcional)'} value={observaciones} onChangeText={setObservaciones} multiline maxLength={4000} />
          </FormSheet>

          <FormSheet
            visible={sheet === 'psico_link'}
            title="Link de psicométricas"
            confirmLabel="Guardar"
            submitting={operar.isPending}
            confirmDisabled={link.trim() === ''}
            onCancel={cerrarSheet}
            onConfirm={() => ejecutar({ tipo: 'enviar_psicometricas', link: link.trim() }, 'Link registrado.')}>
            <Field label="Link" value={link} onChangeText={setLink} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://..." />
          </FormSheet>

          <FormSheet
            visible={sheet === 'psico_resultados'}
            title="Resultados de psicométricas"
            confirmLabel="Guardar"
            submitting={operar.isPending}
            confirmDisabled={resumen.trim() === ''}
            onCancel={cerrarSheet}
            onConfirm={() => ejecutar({ tipo: 'registrar_resultados_psicometricas', resumen: resumen.trim(), archivos: archivos.map(localFile) }, 'Resultados registrados.')}>
            <Field label="Resumen de resultados" value={resumen} onChangeText={setResumen} multiline maxLength={4000} />
            <AdjuntosList archivos={archivos} onAdd={() => setAttachOpen(true)} onRemove={(i) => setArchivos((prev) => prev.filter((_, idx) => idx !== i))} />
          </FormSheet>

          <FormSheet
            visible={sheet === 'socioeconomico'}
            title="Estudio socioeconómico"
            description="La fecha de visita se registra con la fecha de hoy."
            confirmLabel="Guardar"
            submitting={operar.isPending}
            confirmDisabled={direccion.trim() === '' || (viable === 'no_viable' && observaciones.trim() === '')}
            onCancel={cerrarSheet}
            onConfirm={() =>
              ejecutar(
                {
                  tipo: 'registrar_socioeconomico',
                  payload: {
                    fecha_visita: new Date().toISOString().slice(0, 10),
                    direccion: direccion.trim(),
                    riesgos: riesgos.trim() || null,
                    observaciones: observaciones.trim() || null,
                    resultado: viable,
                  },
                  evidencias: archivos.map(localFile),
                },
                'Estudio socioeconómico registrado.',
              )
            }>
            <Field label="Dirección visitada" value={direccion} onChangeText={setDireccion} multiline maxLength={500} />
            <Field label="Riesgos detectados (opcional)" value={riesgos} onChangeText={setRiesgos} multiline maxLength={4000} />
            <View style={styles.chips}>
              <FilterChips
                options={[
                  { value: 'viable', label: 'Viable' },
                  { value: 'no_viable', label: 'No viable' },
                ]}
                value={viable}
                onChange={setViable}
              />
            </View>
            <Field label={viable === 'no_viable' ? 'Motivo (obligatorio)' : 'Observaciones (opcional)'} value={observaciones} onChangeText={setObservaciones} multiline maxLength={4000} />
            <AdjuntosList archivos={archivos} onAdd={() => setAttachOpen(true)} onRemove={(i) => setArchivos((prev) => prev.filter((_, idx) => idx !== i))} />
          </FormSheet>

          <FormSheet
            visible={sheet === 'referencia'}
            title="Registrar referencia laboral"
            description="La fecha de validación se registra con la fecha de hoy."
            confirmLabel="Guardar"
            submitting={operar.isPending}
            confirmDisabled={refEmpresa.trim() === '' || refContacto.trim() === ''}
            onCancel={cerrarSheet}
            onConfirm={() =>
              ejecutar(
                {
                  tipo: 'registrar_referencia',
                  payload: {
                    empresa: refEmpresa.trim(),
                    contacto: refContacto.trim(),
                    telefono: refTelefono.trim() || null,
                    relacion_puesto: refRelacion.trim() || null,
                    resultado: refResultado,
                    observaciones: observaciones.trim() || null,
                    fecha_validacion: new Date().toISOString().slice(0, 10),
                  },
                },
                'Referencia registrada.',
              )
            }>
            <Field label="Empresa" value={refEmpresa} onChangeText={setRefEmpresa} maxLength={190} />
            <Field label="Contacto" value={refContacto} onChangeText={setRefContacto} maxLength={190} />
            <Field label="Teléfono (opcional)" value={refTelefono} onChangeText={setRefTelefono} keyboardType="phone-pad" maxLength={30} />
            <Field label="Relación con el puesto (opcional)" value={refRelacion} onChangeText={setRefRelacion} maxLength={190} />
            <View style={styles.chips}>
              <FilterChips
                options={[
                  { value: 'positiva', label: 'Positiva' },
                  { value: 'negativa', label: 'Negativa' },
                  { value: 'no_localizada', label: 'No localizada' },
                ]}
                value={refResultado}
                onChange={setRefResultado}
              />
            </View>
            <Field label="Observaciones (opcional)" value={observaciones} onChangeText={setObservaciones} multiline maxLength={2000} />
          </FormSheet>

          <FormSheet
            visible={sheet === 'preautorizar' || sheet === 'autorizar'}
            title={sheet === 'preautorizar' ? 'Preautorizar contratación' : 'Autorizar contratación'}
            description={sheet === 'preautorizar' ? 'Tu visto bueno pasa el proceso a autorización de RH.' : 'La autorización final de RH deja listo al candidato para contratación.'}
            confirmLabel={sheet === 'preautorizar' ? 'Preautorizar' : 'Autorizar'}
            submitting={operar.isPending}
            onCancel={cerrarSheet}
            onConfirm={() =>
              sheet === 'preautorizar'
                ? ejecutar({ tipo: 'preautorizar', comentario: comentario.trim() || null }, 'Preautorizado.')
                : ejecutar({ tipo: 'autorizar_rh', comentario: comentario.trim() || null }, 'Autorizado.')
            }>
            <Field label="Comentario (opcional)" value={comentario} onChangeText={setComentario} multiline maxLength={2000} />
          </FormSheet>

          <MotivoModal
            visible={sheet === 'rechazar'}
            title="Rechazar candidato"
            description="El candidato queda rechazado por RH."
            confirmLabel="Rechazar"
            submitting={operar.isPending}
            onCancel={cerrarSheet}
            onConfirm={(motivo) => ejecutar({ tipo: 'rechazar_rh', motivo }, 'Candidato rechazado.')}
          />

          <MotivoModal
            visible={sheet === 'devolver'}
            title="Devolver al gerente"
            description="Regresa la decisión al gerente para que la revise de nuevo."
            confirmLabel="Devolver"
            submitting={operar.isPending}
            onCancel={cerrarSheet}
            onConfirm={(motivo) => ejecutar({ tipo: 'devolver_rh', motivo }, 'Devuelto al gerente.')}
          />

          <FormSheet
            visible={sheet === 'descartar'}
            title="Cerrar proceso del candidato"
            destructive
            confirmLabel="Cerrar proceso"
            submitting={operar.isPending}
            confirmDisabled={descarteMotivo.trim() === ''}
            onCancel={cerrarSheet}
            onConfirm={() => ejecutar({ tipo: 'descartar', payload: { estado: descarteEstado, motivo: descarteMotivo.trim() } }, 'Proceso cerrado.')}>
            <View style={styles.chips}>
              <FilterChips options={OPCIONES_DESCARTE} value={descarteEstado} onChange={setDescarteEstado} />
            </View>
            <Field label="Motivo" value={descarteMotivo} onChangeText={setDescarteMotivo} multiline maxLength={2000} />
          </FormSheet>

          <DocumentUploadSheet
            visible={attachOpen}
            title={sheet === 'socioeconomico' ? 'Adjuntar foto, PDF o video' : 'Adjuntar archivo'}
            // El backend acepta video SOLO como evidencia del socioeconómico (hasta 60 MB).
            allowVideo={sheet === 'socioeconomico'}
            maxSizeMb={sheet === 'socioeconomico' ? 60 : 20}
            onClose={() => setAttachOpen(false)}
            onConfirm={async (file) => {
              setArchivos((prev) => [...prev, file]);
              setAttachOpen(false);
            }}
          />
        </>
      ) : null}
    </Screen>
  );
}

function AdjuntosList({ archivos, onAdd, onRemove }: { archivos: PickedDocumentFile[]; onAdd: () => void; onRemove: (index: number) => void }) {
  return (
    <View style={styles.attachments}>
      <Text style={styles.attachLabel}>Archivos adjuntos (opcional)</Text>
      {archivos.map((file, index) => (
        <View key={`${file.uri}-${index}`} style={styles.attachRow}>
          <Ionicons name="document-attach-outline" size={16} color={Colors.primaryDark} />
          <Text style={styles.attachName} numberOfLines={1}>
            {file.name}
          </Text>
          <PressableScale haptic={false} accessibilityLabel={`Quitar ${file.name}`} onPress={() => onRemove(index)}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </PressableScale>
        </View>
      ))}
      <Button title="Adjuntar archivo" variant="ghost" leftIcon="add-circle-outline" onPress={onAdd} />
    </View>
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
  muted: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  subItem: {
    gap: 2,
    paddingVertical: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  subItemTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  chips: {
    marginHorizontal: -Spacing.lg,
  },
  attachments: {
    gap: Spacing.xs,
  },
  attachLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  attachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 6,
  },
  attachName: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
});
