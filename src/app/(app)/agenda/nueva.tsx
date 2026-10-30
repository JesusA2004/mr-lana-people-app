import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FilterChips } from '@/components/ciclo/FilterChips';
import { Field } from '@/components/ciclo/FormSheet';
import { EmptyMessage, Notice, Screen } from '@/components/ciclo/Screen';
import { DocumentUploadSheet, type PickedDocumentFile } from '@/components/DocumentUploadSheet';
import { DateField } from '@/components/forms/DateField';
import { HoraField } from '@/components/forms/HoraField';
import { PressableScale } from '@/components/PressableScale';
import { CampoBusqueda } from '@/components/ui/CampoBusqueda';
import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useAgenda, useAgendaOpciones, useAgendar } from '@/hooks/queries/useAgenda';
import { toast } from '@/store/toastStore';
import { useEstilos } from '@/theme/ThemeProvider';
import type { TipoAgendaEvento } from '@/types/agenda';
import { horaParaApi, nuevaClaveIdempotencia } from '@/utils/agenda';
import { toApiDateString } from '@/utils/dates';
import { getActionErrorMessage, getFieldError, logError } from '@/utils/errors';
import { haptics } from '@/utils/haptics';

const TIPOS: { value: TipoAgendaEvento; label: string }[] = [
  { value: 'entrevista', label: 'Entrevista' },
  { value: 'socioeconomico', label: 'Estudio socioeconómico' },
];

/**
 * Agendar desde la app. El origen («agendada por gerente») lo decide el
 * servidor. La clave nace al abrir la pantalla y se repite en cada reintento,
 * así una respuesta perdida nunca crea una segunda cita.
 */
export default function AgendarScreen() {
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const agenda = useAgenda();
  const opciones = useAgendaOpciones();
  const agendar = useAgendar();
  const clave = useRef(nuevaClaveIdempotencia()).current;

  const [sucursalId, setSucursalId] = useState<number | null>(null);
  const [tipo, setTipo] = useState<TipoAgendaEvento>('entrevista');
  const [fecha, setFecha] = useState<Date | undefined>();
  const [hora, setHora] = useState<Date | undefined>();
  const [modoNuevo, setModoNuevo] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [candidatoId, setCandidatoId] = useState<number | null>(null);
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [telefono, setTelefono] = useState('');
  const [notas, setNotas] = useState('');
  const [domicilio, setDomicilio] = useState('');
  const [cv, setCv] = useState<PickedDocumentFile | null>(null);
  const [adjuntar, setAdjuntar] = useState(false);
  const [errorNombre, setErrorNombre] = useState<string | undefined>();

  const sucursales = opciones.data?.sucursales ?? [];
  // Con una sola sucursal (gerente) no hay nada que elegir.
  const sucursalElegida = sucursalId ?? (sucursales.length === 1 ? sucursales[0].id : null);
  const candidatos = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return (opciones.data?.candidatos ?? []).filter((c) => (sucursalElegida === null || c.sucursal_id === sucursalElegida) && (!termino || c.nombre.toLowerCase().includes(termino)));
  }, [opciones.data, busqueda, sucursalElegida]);

  const listo = sucursalElegida !== null && fecha && hora && (modoNuevo ? nombre.trim().length > 0 : candidatoId !== null) && !agendar.isPending;

  const guardar = async () => {
    if (!sucursalElegida || !fecha || !hora) return;
    setErrorNombre(undefined);
    try {
      const resultado = await agendar.mutateAsync({
        payload: {
          sucursal_id: sucursalElegida,
          tipo,
          fecha: toApiDateString(fecha),
          hora: horaParaApi(hora),
          ...(modoNuevo
            ? { candidato_nuevo: { nombre: nombre.trim(), apellidos: apellidos.trim() || undefined, telefono: telefono.trim() || undefined } }
            : { candidato_id: candidatoId as number }),
          notas: notas.trim() || undefined,
          domicilio: domicilio.trim() || undefined,
          clave_idempotencia: clave,
        },
        cv: cv ? { uri: cv.uri, name: cv.name, mimeType: cv.mimeType } : null,
      });
      haptics.success();
      toast.success('Cita agendada.');
      resultado.empalmes.forEach((empalme) => toast.info(empalme));
      router.replace(`/agenda/${resultado.evento.id}` as never);
    } catch (error) {
      logError('agenda.agendar', error);
      haptics.error();
      setErrorNombre(getFieldError(error, 'candidato_nuevo.nombre'));
      toast.error(getActionErrorMessage(error));
    }
  };

  return (
    <Screen
      title="Agendar"
      subtitle="Entrevista o estudio socioeconómico"
      form
      isLoading={opciones.isLoading}
      error={opciones.error}
      onRetry={() => void opciones.refetch()}
      footer={<Button title="Agendar y notificar" leftIcon="calendar-outline" disabled={!listo} loading={agendar.isPending} onPress={guardar} />}>
      <Card style={styles.gap}>
        {sucursales.length > 1 ? (
          <>
            <Text style={styles.etiqueta}>Sucursal</Text>
            <FilterChips options={sucursales.map((s) => ({ value: String(s.id), label: s.nombre }))} value={sucursalElegida ? String(sucursalElegida) : ''} onChange={(v) => { setSucursalId(Number(v)); setCandidatoId(null); }} />
          </>
        ) : sucursales[0] ? (
          <Notice tone="info">Se notificará a gerente y subgerente de {sucursales[0].nombre}.</Notice>
        ) : (
          <Notice tone="warning">Tu cuenta no tiene sucursales para agendar.</Notice>
        )}

        <Text style={styles.etiqueta}>Tipo</Text>
        <FilterChips options={TIPOS} value={tipo} onChange={setTipo} />
        <DateField label="Fecha" value={fecha} onChange={setFecha} />
        <HoraField label="Hora" value={hora} onChange={setHora} />
      </Card>

      <Card style={styles.gap}>
        <Text style={styles.etiqueta}>Candidato</Text>
        {modoNuevo ? (
          <>
            <Field label="Nombre" value={nombre} onChangeText={setNombre} error={errorNombre} maxLength={150} />
            <Field label="Apellidos" value={apellidos} onChangeText={setApellidos} maxLength={150} />
            <Field label="Teléfono" value={telefono} onChangeText={setTelefono} keyboardType="phone-pad" maxLength={30} />
            <Button title="Elegir de la lista" variant="ghost" onPress={() => setModoNuevo(false)} />
          </>
        ) : (
          <>
            <CampoBusqueda value={busqueda} onChangeText={setBusqueda} placeholder="Buscar candidato…" accessibilityLabel="Buscar candidato" />
            {candidatos.length === 0 ? <EmptyMessage message="Sin candidatos para agendar." /> : null}
            <View style={styles.lista}>
              {candidatos.slice(0, 30).map((c) => (
                <PressableScale
                  key={c.id}
                  haptic={false}
                  accessibilityRole="button"
                  accessibilityLabel={candidatoId === c.id ? `${c.nombre}, seleccionado` : c.nombre}
                  onPress={() => setCandidatoId(c.id)}
                  style={[styles.candidato, candidatoId === c.id && styles.candidatoActivo] as object}>
                  <Text style={styles.candidatoNombre}>{c.nombre}</Text>
                  {c.puesto ? <Text style={styles.muted}>{c.puesto}</Text> : null}
                </PressableScale>
              ))}
            </View>
            {agenda.data?.puede_alta_candidato ? <Button title="Registrar candidato nuevo" variant="ghost" leftIcon="person-add-outline" onPress={() => setModoNuevo(true)} /> : null}
          </>
        )}
      </Card>

      <Card style={styles.gap}>
        {tipo === 'socioeconomico' ? <Field label="Domicilio" value={domicilio} onChangeText={setDomicilio} maxLength={300} /> : null}
        <Field label="Notas (opcional)" value={notas} onChangeText={setNotas} multiline maxLength={2000} />
        <Button title={cv ? `CV: ${cv.name}` : 'Adjuntar CV (opcional)'} variant="outline" leftIcon="document-attach-outline" onPress={() => setAdjuntar(true)} />
        {cv ? <Button title="Quitar CV" variant="ghost" onPress={() => setCv(null)} /> : null}
      </Card>

      <DocumentUploadSheet
        visible={adjuntar}
        title="Adjuntar CV"
        onClose={() => setAdjuntar(false)}
        onConfirm={async (archivo) => {
          setCv(archivo);
          setAdjuntar(false);
        }}
      />
    </Screen>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    gap: { gap: Spacing.sm },
    etiqueta: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
    lista: { gap: Spacing.xs },
    candidato: { padding: Spacing.md, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, backgroundColor: Colors.surface },
    candidatoActivo: { borderColor: Colors.primary },
    candidatoNombre: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
    muted: { fontSize: FontSize.sm, color: Colors.textMuted },
  });
