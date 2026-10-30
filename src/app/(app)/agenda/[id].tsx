import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { agendaApi } from '@/api/agenda';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FilterChips } from '@/components/ciclo/FilterChips';
import { Field, FormSheet } from '@/components/ciclo/FormSheet';
import { InfoRow } from '@/components/ciclo/InfoRow';
import { Notice, Screen, SectionTitle } from '@/components/ciclo/Screen';
import { DescargaDocumento } from '@/components/DescargaDocumento';
import { DocumentUploadSheet, type PickedDocumentFile } from '@/components/DocumentUploadSheet';
import { DateField } from '@/components/forms/DateField';
import { HoraField } from '@/components/forms/HoraField';
import { PressableScale } from '@/components/PressableScale';
import { StatusBadge } from '@/components/StatusBadge';
import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useAgenda, useAgendaEvento, useOperarAgenda, type AgendaOperacion } from '@/hooks/queries/useAgenda';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { toast } from '@/store/toastStore';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import { agendaBadge, faltaEnResultado, horaParaApi, urlRuta } from '@/utils/agenda';
import { formatDateLong, toApiDateString } from '@/utils/dates';
import { getActionErrorMessage, logError } from '@/utils/errors';
import { haptics } from '@/utils/haptics';

type Sheet = null | 'reprogramar' | 'cancelar' | 'no_asistio';

/**
 * Entrevista o estudio socioeconómico (pág. 24). Guardar delega en el backend,
 * que avanza al candidato por su workflow; esta pantalla solo vuelve a leer la
 * cita. Teléfono, domicilio y CV llegan null sin `agenda.ver_datos_candidato`.
 */
export default function AgendaEventoScreen() {
  const styles = useEstilos(crearEstilos);
  const Colors = useColores();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useAgendaEvento(id);
  const lista = useAgenda();
  const evento = query.data;
  const operar = useOperarAgenda(Number(id));
  const { isOffline } = useNetworkStatus();

  const [resultado, setResultado] = useState<string | null>(null);
  const [motivo, setMotivo] = useState<string | null>(null);
  const [comentario, setComentario] = useState('');
  const [evidencias, setEvidencias] = useState<PickedDocumentFile[]>([]);
  const [adjuntar, setAdjuntar] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [fecha, setFecha] = useState<Date | undefined>();
  const [hora, setHora] = useState<Date | undefined>();
  const [textoSheet, setTextoSheet] = useState('');

  const motivos = lista.data?.motivos_no_viable ?? [];
  const esEntrevista = evento?.tipo === 'entrevista';
  const puedeCapturar = Boolean(evento?.puede.capturar && evento.puede.registrar_resultado);

  const ejecutar = async (op: AgendaOperacion, exito: string) => {
    try {
      const respuesta = await operar.mutateAsync(op);
      haptics.success();
      toast.success(exito);
      respuesta.empalmes.forEach((empalme) => toast.info(empalme));
      setSheet(null);
      setTextoSheet('');
      await query.refetch();
      if (respuesta.siguienteId !== Number(id)) router.replace(`/agenda/${respuesta.siguienteId}` as never);
    } catch (error) {
      logError('agenda.operar', error);
      haptics.error();
      toast.error(getActionErrorMessage(error));
    }
  };

  const guardarResultado = async () => {
    if (!evento) return;
    const falta = faltaEnResultado(evento, { resultado, motivo, comentario, evidencias: evidencias.length });
    if (falta) {
      toast.error(falta);
      return;
    }
    if (esEntrevista) {
      await ejecutar(
        { tipo: 'entrevista', payload: resultado === 'viable' ? { resultado: 'viable' } : { resultado: 'no_viable', motivo: motivo as string, comentario: comentario.trim() } },
        'Resultado guardado.',
      );
    } else {
      await ejecutar(
        {
          tipo: 'socioeconomico',
          payload: { resultado: resultado as 'favorable' | 'no_favorable', comentario: comentario.trim() || undefined },
          evidencias: evidencias.map((a) => ({ uri: a.uri, name: a.name, mimeType: a.mimeType })),
        },
        'Resultado guardado.',
      );
    }
  };

  const abrirExterno = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      logError('agenda.abrirExterno', error);
      toast.error('No se pudo abrir en este dispositivo.');
    }
  };

  const opciones = esEntrevista
    ? [
        { value: 'viable', label: 'Viable', icono: 'checkmark-circle-outline' as const },
        { value: 'no_viable', label: 'No viable', icono: 'close-circle-outline' as const },
      ]
    : [
        { value: 'favorable', label: 'Favorable', icono: 'checkmark-circle-outline' as const },
        { value: 'no_favorable', label: 'No favorable', icono: 'close-circle-outline' as const },
      ];

  return (
    <Screen
      title={evento?.tipo_etiqueta ?? 'Cita'}
      subtitle={evento ? `${formatDateLong(evento.fecha)} · ${evento.hora}` : undefined}
      isLoading={query.isLoading}
      error={query.error}
      notFoundMessage="Esta cita ya no está disponible."
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}>
      {evento ? (
        <>
          <Card style={styles.gap}>
            <View style={styles.encabezado}>
              <Text style={styles.nombre}>{evento.candidato.nombre}</Text>
              <StatusBadge status={agendaBadge(evento.estado)} label={evento.estado_etiqueta} />
            </View>
            <InfoRow label="Puesto" value={evento.candidato.puesto} icon="briefcase-outline" />
            <InfoRow label="Sucursal" value={evento.sucursal.nombre} icon="location-outline" />
            <InfoRow label="Origen" value={evento.origen_etiqueta} />
            {evento.candidato.estado_etiqueta ? <InfoRow label="Fase del candidato" value={evento.candidato.estado_etiqueta} /> : null}
            {evento.notas ? <Notice tone="info">Nota: {evento.notas}</Notice> : null}
            <View style={styles.accesos}>
              {evento.candidato.telefono ? <Button title="Llamar" variant="outline" leftIcon="call-outline" onPress={() => abrirExterno(`tel:${evento.candidato.telefono}`)} style={styles.flex} /> : null}
              {evento.domicilio ? <Button title="Ruta" variant="outline" leftIcon="navigate-outline" onPress={() => abrirExterno(urlRuta(evento.domicilio as string))} style={styles.flex} /> : null}
            </View>
            {evento.domicilio ? <InfoRow label="Domicilio" value={evento.domicilio} icon="home-outline" /> : null}
          </Card>

          {evento.candidato.tiene_cv ? <DescargaDocumento titulo={`CV de ${evento.candidato.nombre}`} path={agendaApi.cvPath(evento.id)} tipoEsperado="pdf" /> : null}

          {evento.resultado_etiqueta ? (
            <Card style={styles.gap}>
              <SectionTitle>Resultado</SectionTitle>
              <InfoRow label="Resultado" value={evento.resultado_etiqueta} emphasis />
              {evento.motivo_no_viable_etiqueta ? <InfoRow label="Motivo" value={evento.motivo_no_viable_etiqueta} /> : null}
              {evento.comentario_resultado ? <Text style={styles.muted}>{evento.comentario_resultado}</Text> : null}
            </Card>
          ) : null}

          {evento.motivo_cancelacion ? <Notice tone="warning">Cancelada: {evento.motivo_cancelacion}</Notice> : null}
          {evento.reprogramado_a_id ? <Button title="Ver cita reprogramada" variant="outline" onPress={() => router.replace(`/agenda/${evento.reprogramado_a_id}` as never)} /> : null}

          {puedeCapturar ? (
            <Card style={styles.gap}>
              <SectionTitle>{esEntrevista ? '¿Cómo resultó la entrevista?' : 'Resultado del estudio'}</SectionTitle>
              {isOffline ? <Notice tone="warning">Sin conexión: guardar requiere confirmación del servidor.</Notice> : null}
              <View style={styles.accesos}>
                {opciones.map((opcion) => {
                  const activa = resultado === opcion.value;
                  return (
                    <PressableScale
                      key={opcion.value}
                      accessibilityRole="button"
                      accessibilityLabel={activa ? `${opcion.label}, seleccionado` : opcion.label}
                      onPress={() => setResultado(opcion.value)}
                      style={[styles.opcion, activa && (opcion.value === 'viable' || opcion.value === 'favorable' ? styles.opcionBien : styles.opcionMal)] as object}>
                      <Ionicons name={opcion.icono} size={18} color={activa ? Colors.textInverse : Colors.text} />
                      <Text style={[styles.opcionTexto, activa && styles.opcionTextoActiva]}>{opcion.label}</Text>
                    </PressableScale>
                  );
                })}
              </View>

              {esEntrevista && resultado === 'no_viable' ? (
                <>
                  <Text style={styles.etiqueta}>Motivo</Text>
                  <FilterChips options={motivos.map((m) => ({ value: m.value, label: m.etiqueta }))} value={motivo ?? ''} onChange={setMotivo} />
                </>
              ) : null}

              {!esEntrevista ? (
                <View style={styles.gap}>
                  <Text style={styles.etiqueta}>Formato y fotografías</Text>
                  {evidencias.map((archivo, index) => (
                    <View key={`${archivo.uri}-${index}`} style={styles.adjunto}>
                      <Ionicons name="document-attach-outline" size={16} color={Colors.primaryDark} />
                      <Text style={styles.adjuntoNombre} numberOfLines={1}>
                        {archivo.name}
                      </Text>
                      <PressableScale haptic={false} accessibilityLabel={`Quitar ${archivo.name}`} onPress={() => setEvidencias((prev) => prev.filter((_, i) => i !== index))}>
                        <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                      </PressableScale>
                    </View>
                  ))}
                  <Button title="Adjuntar formato o foto" variant="outline" leftIcon="camera-outline" onPress={() => setAdjuntar(true)} />
                </View>
              ) : null}

              {resultado === 'no_viable' || resultado === 'no_favorable' || !esEntrevista ? (
                <Field label="Comentario" value={comentario} onChangeText={setComentario} placeholder="Comentario breve…" multiline maxLength={2000} />
              ) : null}

              <Button title="Guardar resultado" leftIcon="save-outline" disabled={isOffline} onPress={guardarResultado} />
            </Card>
          ) : evento.puede.capturar && !evento.puede.registrar_resultado ? (
            <Notice tone="info">Tu cuenta solo consulta esta cita; el resultado lo registra la gerencia.</Notice>
          ) : null}

          {evento.puede.gestionar || puedeCapturar ? (
            <View style={styles.gap}>
              {esEntrevista && puedeCapturar ? <Button title="No asistió" variant="outline" disabled={isOffline} onPress={() => setSheet('no_asistio')} /> : null}
              {evento.puede.gestionar && evento.puede.reprogramar ? <Button title="Reprogramar" variant="outline" disabled={isOffline} onPress={() => setSheet('reprogramar')} /> : null}
              {evento.puede.gestionar && evento.puede.cancelar ? <Button title="Cancelar cita" variant="ghost" disabled={isOffline} onPress={() => setSheet('cancelar')} /> : null}
            </View>
          ) : null}

          {evento.historial && evento.historial.length > 0 ? (
            <Card style={styles.gap}>
              <SectionTitle>Historial</SectionTitle>
              {evento.historial.map((h, index) => (
                <View key={index}>
                  <Text style={styles.historial}>{h.detalle ?? h.estado_nuevo ?? h.accion}</Text>
                  <Text style={styles.muted}>{[h.fecha, h.usuario].filter(Boolean).join(' · ')}</Text>
                </View>
              ))}
            </Card>
          ) : null}

          <FormSheet
            visible={sheet === 'reprogramar'}
            title="Reprogramar"
            description="Se conserva el historial; la cita cuenta una sola vez."
            confirmLabel="Reprogramar"
            confirmDisabled={!fecha || !hora}
            onCancel={() => setSheet(null)}
            onConfirm={() =>
              fecha && hora ? ejecutar({ tipo: 'reprogramar', payload: { fecha: toApiDateString(fecha), hora: horaParaApi(hora), motivo: textoSheet.trim() || undefined } }, 'Cita reprogramada.') : undefined
            }>
            <DateField label="Fecha" value={fecha} onChange={setFecha} />
            <HoraField label="Hora" value={hora} onChange={setHora} />
            <Field label="Motivo (opcional)" value={textoSheet} onChangeText={setTextoSheet} maxLength={500} />
          </FormSheet>

          <FormSheet
            visible={sheet === 'cancelar'}
            title="Cancelar cita"
            confirmLabel="Cancelar cita"
            destructive
            confirmDisabled={!textoSheet.trim()}
            onCancel={() => setSheet(null)}
            onConfirm={() => ejecutar({ tipo: 'cancelar', motivo: textoSheet.trim() }, 'Cita cancelada.')}>
            <Field label="Motivo" value={textoSheet} onChangeText={setTextoSheet} multiline maxLength={500} />
          </FormSheet>

          <FormSheet
            visible={sheet === 'no_asistio'}
            title="Candidato no asistió"
            description="Queda registrado para medir la inasistencia; después puedes reprogramar."
            confirmLabel="Registrar"
            onCancel={() => setSheet(null)}
            onConfirm={() => ejecutar({ tipo: 'no_asistio', comentario: textoSheet.trim() || undefined }, 'Inasistencia registrada.')}>
            <Field label="Comentario (opcional)" value={textoSheet} onChangeText={setTextoSheet} maxLength={500} />
          </FormSheet>

          <DocumentUploadSheet
            visible={adjuntar}
            title="Adjuntar formato o foto"
            allowVideo
            maxSizeMb={60}
            onClose={() => setAdjuntar(false)}
            onConfirm={async (archivo) => {
              setEvidencias((prev) => [...prev, archivo]);
              setAdjuntar(false);
            }}
          />
        </>
      ) : null}
    </Screen>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    gap: { gap: Spacing.sm },
    flex: { flex: 1 },
    encabezado: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
    nombre: { flex: 1, minWidth: 160, fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
    accesos: { flexDirection: 'row', gap: Spacing.sm },
    opcion: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      minHeight: 48,
      borderWidth: 1.5,
      borderColor: Colors.border,
      borderRadius: Radius.md,
      backgroundColor: Colors.surface,
    },
    opcionBien: { backgroundColor: Colors.success, borderColor: Colors.success },
    opcionMal: { backgroundColor: Colors.danger, borderColor: Colors.danger },
    opcionTexto: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
    opcionTextoActiva: { color: Colors.textInverse },
    etiqueta: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
    adjunto: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    adjuntoNombre: { flex: 1, fontSize: FontSize.sm, color: Colors.text },
    historial: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
    muted: { fontSize: FontSize.sm, color: Colors.textMuted },
  });
