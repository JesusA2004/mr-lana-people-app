import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { errorMotorDeError, faltantesDeError } from '@/api/rh/documentosProceso';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Field, FormSheet } from '@/components/ciclo/FormSheet';
import { Notice, SectionTitle } from '@/components/ciclo/Screen';
import { DateField } from '@/components/forms/DateField';
import { SelectField } from '@/components/forms/SelectField';
import { StatusBadge } from '@/components/StatusBadge';
import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useAccionDocumentosProceso, useDocumentosProceso, type OrigenDocumentos } from '@/hooks/queries/useDocumentosProceso';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import { toast } from '@/store/toastStore';
import type {
  AccionDocumentoProceso,
  DatoFaltanteDocumento,
  ErrorMotorDocumental,
  ItemDocumentoProceso,
  SeccionDocumentosProceso,
} from '@/types/documentosProceso';
import { formatDateLong, toApiDateString } from '@/utils/dates';
import { getActionErrorMessage, logError } from '@/utils/errors';
import { haptics } from '@/utils/haptics';

type Pendiente = { seccion: SeccionDocumentosProceso; clave: string | null; regenerar: boolean; motivoRevision?: string };

const ICONO_ACCION: Record<string, keyof typeof Ionicons.glyphMap> = {
  generar: 'document-text-outline',
  regenerar: 'refresh-outline',
  nueva_revision: 'shield-outline',
  descargar: 'eye-outline',
  descargar_word: 'share-outline',
  marcar_impreso: 'print-outline',
  registrar_firma: 'create-outline',
  registrar_envio: 'paper-plane-outline',
  registrar_recepcion: 'mail-open-outline',
  subir_escaneo: 'camera-outline',
  archivar: 'archive-outline',
};

/** Visor, Word y pasos físicos: se operan en la pantalla de documento laboral. */
const ATAJO_DOCUMENTO: Record<string, string> = {
  descargar: 'ver',
  descargar_word: 'word',
  marcar_impreso: 'marcar_impreso',
  registrar_firma: 'registrar_firma',
  registrar_envio: 'registrar_envio',
  registrar_recepcion: 'registrar_recepcion',
  subir_escaneo: 'subir_escaneo',
  archivar: 'archivar',
};

/**
 * "Documentos del proceso" en contexto (ficha del colaborador, cierre,
 * solicitud de permiso, préstamo, evaluación). El backend decide qué
 * documento toca, su línea de tiempo y la SIGUIENTE acción: aquí se pinta
 * un solo botón principal y el resto en "Más acciones". Nunca se decide por
 * puesto ni por rol en la app.
 */
export function DocumentosProcesoCard({ origen }: { origen: OrigenDocumentos }) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const query = useDocumentosProceso(origen);
  const accion = useAccionDocumentosProceso(origen);

  const [enCurso, setEnCurso] = useState<string | null>(null);
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
  const [faltantes, setFaltantes] = useState<DatoFaltanteDocumento[]>([]);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [avisoMotor, setAvisoMotor] = useState<ErrorMotorDocumental | null>(null);
  const [menu, setMenu] = useState<{ seccion: SeccionDocumentosProceso; item: ItemDocumentoProceso } | null>(null);
  const [revision, setRevision] = useState<{ seccion: SeccionDocumentosProceso; item: ItemDocumentoProceso } | null>(null);
  const [motivoRevision, setMotivoRevision] = useState('');
  const [baja, setBaja] = useState<{ seccion: SeccionDocumentosProceso; modo: 'negativa' | 'testigos' } | null>(null);
  const [testigos, setTestigos] = useState([
    { nombre: '', cargo: '' },
    { nombre: '', cargo: '' },
  ]);
  const [finiquitoDisposicion, setFiniquitoDisposicion] = useState(true);

  const columna = (f: DatoFaltanteDocumento) => (f.fuente === 'sucursal' ? `sucursal.${f.columna}` : f.columna);
  const editables = faltantes.filter((f) => f.editable);
  const completos = editables.every((f) => (valores[columna(f)] ?? '').trim() !== '');

  const generar = (p: Pendiente, completar: Record<string, string> = {}) => {
    const manuales: Record<string, string> = {};
    const datos: Record<string, string> = {};
    for (const [k, v] of Object.entries(completar)) {
      const f = faltantes.find((x) => columna(x) === k);
      if (f?.persistencia === 'documento' || f?.fuente === 'manual') manuales[f.columna] = v;
      else datos[k] = v;
    }
    const { registro, proceso } = p.seccion;
    const payload = {
      clave: p.clave ?? undefined,
      proceso,
      regenerar: p.regenerar,
      completar: datos,
      manuales,
      ...(p.motivoRevision ? { revision: true, motivo: p.motivoRevision } : {}),
    };

    setEnCurso(p.clave === null ? 'paquete' : p.clave);
    accion.mutate(
      p.clave === null ? { tipo: 'paquete', registro: registro.tipo, id: registro.id, payload } : { tipo: 'generar', registro: registro.tipo, id: registro.id, payload },
      {
        onSuccess: () => {
          haptics.success();
          toast.success(p.clave === null ? 'Documentos generados.' : 'Documento generado.');
          setPendiente(null);
          setFaltantes([]);
          setRevision(null);
          setMotivoRevision('');
        },
        onError: (error) => {
          const faltan = faltantesDeError(error);
          if (faltan) {
            setPendiente(p);
            setFaltantes(faltan.faltantes);
            setValores(Object.fromEntries(faltan.faltantes.map((f) => [columna(f), ''])));
            return;
          }
          const motor = errorMotorDeError(error);
          haptics.error();
          if (motor) {
            setAvisoMotor(motor);
            return;
          }
          logError('documentosProceso.generar', error);
          toast.error(getActionErrorMessage(error));
        },
        onSettled: () => setEnCurso(null),
      },
    );
  };

  const alAccionar = (seccion: SeccionDocumentosProceso, item: ItemDocumentoProceso, a: AccionDocumentoProceso) => {
    setMenu(null);
    if (a.clave === 'generar' || a.clave === 'regenerar') {
      generar({ seccion, clave: item.clave, regenerar: a.clave === 'regenerar' });
      return;
    }
    if (a.clave === 'nueva_revision') {
      setMotivoRevision('');
      setRevision({ seccion, item });
      return;
    }
    const atajo = ATAJO_DOCUMENTO[a.clave];
    if (atajo && item.documentoId !== null) {
      router.push(`/rh/documentos-laborales/${item.documentoId}?accion=${atajo}` as never);
    }
  };

  const guardarTestigos = (seccion: SeccionDocumentosProceso) => {
    setEnCurso('testigos');
    accion.mutate(
      { tipo: 'testigos', cierreId: seccion.registro.id, testigos },
      {
        onSuccess: () => {
          toast.success('Testigos guardados.');
          setBaja(null);
        },
        onError: (error) => toast.error(getActionErrorMessage(error)),
        onSettled: () => setEnCurso(null),
      },
    );
  };

  const registrarNegativa = () => {
    if (!baja) return;
    if (baja.modo === 'testigos') {
      guardarTestigos(baja.seccion);
      return;
    }
    const negativa = baja.seccion;
    setEnCurso('negativa');
    accion.mutate(
      {
        tipo: 'negativa',
        cierreId: negativa.registro.id,
        payload: {
          documentos: negativa.documentos.filter((d) => d.documentoId !== null).map((d) => d.clave),
          finiquito_a_disposicion: finiquitoDisposicion,
          testigos,
        },
      },
      {
        onSuccess: () => {
          haptics.success();
          toast.success('Negativa registrada. Ya puedes generar el acta.');
          setBaja(null);
        },
        onError: (error) => toast.error(getActionErrorMessage(error)),
        onSettled: () => setEnCurso(null),
      },
    );
  };

  if (query.isLoading) return <Text style={styles.suave}>Cargando documentos…</Text>;
  if (query.error) {
    return (
      <View style={styles.contenedor}>
        <Notice tone="warning">{getActionErrorMessage(query.error)}</Notice>
        <Button title="Reintentar" variant="outline" leftIcon="refresh-outline" onPress={() => void query.refetch()} />
      </View>
    );
  }

  const principal = (item: ItemDocumentoProceso) => item.siguienteAccion ?? item.acciones.find((a) => a.tipo === 'primaria') ?? null;
  const secundarias = (item: ItemDocumentoProceso) => {
    const p = principal(item);
    return item.acciones.filter((a) => a.clave !== p?.clave);
  };

  return (
    <View style={styles.contenedor}>
      {(query.data ?? []).map((seccion) => (
        <View key={`${seccion.proceso}-${seccion.registro.tipo}-${seccion.registro.id}`} style={styles.contenedor}>
          <SectionTitle>{seccion.titulo}</SectionTitle>
          <Text style={styles.suave}>{seccion.descripcion}</Text>
          {seccion.expedienteCompleto ? <Notice tone="success">Expediente completo</Notice> : null}
          {seccion.bloqueo ? <Notice tone="info">{seccion.bloqueo}</Notice> : null}
          {seccion.documentos.length === 0 ? <Text style={styles.suave}>Este proceso no requiere documentos oficiales.</Text> : null}

          {seccion.acciones.map((a) =>
            a.clave === 'generar_paquete' ? (
              <Button
                key={a.clave}
                title={a.etiqueta}
                leftIcon="documents-outline"
                loading={enCurso === 'paquete'}
                disabled={enCurso !== null}
                onPress={() => generar({ seccion, clave: null, regenerar: false })}
              />
            ) : a.clave === 'registrar_negativa' ? (
              <Button key={a.clave} title={a.etiqueta} variant="danger" disabled={enCurso !== null} onPress={() => setBaja({ seccion, modo: 'negativa' })} />
            ) : a.clave === 'capturar_testigos' ? (
              <Button
                key={a.clave}
                title={a.etiqueta}
                variant="outline"
                disabled={enCurso !== null}
                onPress={() => {
                  setTestigos([0, 1].map((i) => seccion.testigos[i] ?? { nombre: '', cargo: '' }));
                  setBaja({ seccion, modo: 'testigos' });
                }}
              />
            ) : null,
          )}

          {seccion.documentos.map((item) => {
            const p = principal(item);
            const otras = secundarias(item);

            return (
              <Card key={item.clave} style={styles.tarjeta}>
                <View style={styles.fila}>
                  <View style={styles.icono}>
                    <Ionicons name="document-text-outline" size={18} color={Colors.primary} />
                  </View>
                  <Text style={styles.nombre}>{item.nombre}</Text>
                  <StatusBadge status={item.estado} label={item.estadoEtiqueta} />
                </View>
                <Text style={styles.suave}>{item.motivo}</Text>
                {item.masterEtiqueta ? <Text style={styles.suave}>Formato: {item.masterEtiqueta}</Text> : null}
                {item.generadoEn ? (
                  <Text style={styles.suave}>
                    Generado {formatDateLong(item.generadoEn)}
                    {item.generadoPor ? ` por ${item.generadoPor}` : ''}
                  </Text>
                ) : null}
                {item.revisionDeId !== null ? <Notice tone="warning">Revisión de un documento firmado: {item.motivoRevision}</Notice> : null}
                {item.documentoId !== null && !item.archivoDisponible ? (
                  <Notice tone="warning">
                    El archivo de este documento ya no está en el almacenamiento.{' '}
                    {item.acciones.some((a) => a.clave === 'regenerar') ? 'Usa «Regenerar» en Más acciones para volver a emitirlo.' : 'Avisa a Sistemas para restaurarlo.'}
                  </Notice>
                ) : null}
                {item.formatoFaltante ? <Notice tone="danger">{item.formatoFaltante}</Notice> : null}
                {!item.formatoFaltante && item.bloqueo ? <Text style={styles.suave}>{item.bloqueo}</Text> : null}

                {item.documentoId !== null && item.lineaTiempo.length > 0 ? (
                  <View style={styles.lineaTiempo} accessibilityLabel="Avance del documento">
                    {item.lineaTiempo.map((paso) => (
                      <View key={paso.clave} style={styles.paso}>
                        <Ionicons
                          name={paso.estado === 'hecho' ? 'checkmark-circle' : paso.estado === 'actual' ? 'radio-button-on' : 'ellipse-outline'}
                          size={16}
                          color={paso.estado === 'hecho' ? Colors.success : paso.estado === 'actual' ? Colors.primary : Colors.textMuted}
                        />
                        <Text style={[styles.pasoTexto, paso.estado === 'actual' && styles.pasoActual, paso.estado === 'pendiente' && styles.pasoPendiente]}>
                          {paso.etiqueta}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                <View style={styles.acciones}>
                  {p ? (
                    <Button
                      title={p.etiqueta}
                      fullWidth={false}
                      leftIcon={ICONO_ACCION[p.clave] ?? 'arrow-forward-outline'}
                      loading={enCurso === item.clave}
                      disabled={enCurso !== null}
                      onPress={() => alAccionar(seccion, item, p)}
                    />
                  ) : null}
                  {otras.length > 0 || item.historial.length > 0 ? (
                    <Button
                      title="Más acciones"
                      fullWidth={false}
                      variant="outline"
                      leftIcon="ellipsis-horizontal"
                      disabled={enCurso !== null}
                      onPress={() => setMenu({ seccion, item })}
                    />
                  ) : null}
                </View>
              </Card>
            );
          })}

          {seccion.checklist ? (
            <Card style={styles.tarjeta}>
              <Text style={styles.nombre}>Checklist final del procedimiento</Text>
              {seccion.checklist.map((punto) => (
                <View key={punto.clave} style={styles.fila}>
                  <Ionicons name={punto.cumplido ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={punto.cumplido ? Colors.success : Colors.textMuted} />
                  <Text style={styles.suave}>{punto.etiqueta}</Text>
                </View>
              ))}
            </Card>
          ) : null}
        </View>
      ))}

      {/* Más acciones (secundarias + historial) */}
      <FormSheet
        visible={menu !== null}
        title={menu?.item.nombre ?? ''}
        description="Acciones disponibles para este documento."
        confirmLabel="Cerrar"
        onCancel={() => setMenu(null)}
        onConfirm={() => setMenu(null)}>
        {menu
          ? secundarias(menu.item).map((a) => (
              <Button
                key={a.clave}
                title={a.etiqueta}
                variant={a.tipo === 'peligro' ? 'danger' : 'outline'}
                leftIcon={ICONO_ACCION[a.clave] ?? 'arrow-forward-outline'}
                onPress={() => alAccionar(menu.seccion, menu.item, a)}
              />
            ))
          : null}
        {menu && menu.item.historial.length > 0 ? (
          <View style={styles.historial}>
            <Text style={styles.nombre}>Historial</Text>
            {menu.item.historial.map((h) => (
              <Text key={h.id} style={styles.suave}>
                #{h.id} · v{h.versionPlantilla ?? '—'} · {h.estadoEtiqueta}
                {h.generadoEn ? ` · ${formatDateLong(h.generadoEn)}` : ''}
                {h.motivoCancelacion ? ` · ${h.motivoCancelacion}` : ''}
              </Text>
            ))}
          </View>
        ) : null}
      </FormSheet>

      {/* Errores esperables del motor documental */}
      <FormSheet
        visible={avisoMotor !== null}
        title={avisoMotor?.titulo ?? ''}
        description={avisoMotor?.mensaje}
        confirmLabel="Entendido"
        onCancel={() => setAvisoMotor(null)}
        onConfirm={() => setAvisoMotor(null)}>
        {avisoMotor?.detalles.map((d, i) => (
          <Text key={i} style={styles.suave}>
            • {d}
          </Text>
        ))}
      </FormSheet>

      {/* Datos faltantes con el control adecuado a cada dato */}
      <FormSheet
        visible={pendiente !== null}
        title={`Faltan ${faltantes.length} dato${faltantes.length === 1 ? '' : 's'} para generar`}
        description="Los datos de la persona se guardan en su ficha (no se vuelven a pedir); los datos del acto quedan solo en el documento."
        confirmLabel="Guardar y generar"
        submitting={accion.isPending}
        confirmDisabled={!completos || editables.length === 0}
        onCancel={() => setPendiente(null)}
        onConfirm={() => pendiente && generar(pendiente, Object.fromEntries(Object.entries(valores).filter(([, v]) => v.trim() !== '')))}>
        {editables.map((f) => {
          const clave = columna(f);
          const ayuda = f.persistencia === 'documento' ? 'Solo para este documento.' : f.persistencia === 'sucursal' ? 'Se guarda en la sucursal.' : 'Se guarda en la ficha del colaborador.';
          const cambiar = (v: string) => setValores((actual) => ({ ...actual, [clave]: v }));

          if (f.control === 'select' && f.opciones.length > 0) {
            return <SelectField key={clave} label={f.etiqueta} value={valores[clave]} options={f.opciones} onChange={cambiar} helper={ayuda} />;
          }
          if (f.control === 'fecha') {
            const actual = valores[clave] ? new Date(`${valores[clave]}T12:00:00`) : undefined;
            return <DateField key={clave} label={f.etiqueta} value={actual} onChange={(d) => cambiar(toApiDateString(d))} helper={ayuda} />;
          }
          return (
            <View key={clave}>
              <Field
                label={f.etiqueta}
                value={valores[clave] ?? ''}
                onChangeText={cambiar}
                placeholder={f.sugerencias[0] ?? (f.control === 'hora' ? 'HH:MM' : undefined)}
                keyboardType={f.control === 'correo' ? 'email-address' : f.control === 'moneda' ? 'decimal-pad' : 'default'}
                autoCapitalize={f.control === 'correo' ? 'none' : 'sentences'}
              />
              <Text style={styles.ayuda}>{ayuda}</Text>
            </View>
          );
        })}
        {faltantes
          .filter((f) => !f.editable)
          .map((f) => (
            <Text key={columna(f)} style={styles.suave}>
              {f.etiqueta}: se completa en su módulo, no desde el documento.
            </Text>
          ))}
      </FormSheet>

      {/* Nueva revisión de un documento firmado */}
      <FormSheet
        visible={revision !== null}
        title="Nueva revisión"
        description={`${revision?.item.nombre ?? ''} ya está firmado. El firmado se conserva intacto; se emite una nueva instancia con motivo y auditoría.`}
        confirmLabel="Emitir nueva revisión"
        destructive
        submitting={accion.isPending}
        confirmDisabled={motivoRevision.trim().length < 15}
        onCancel={() => setRevision(null)}
        onConfirm={() => revision && generar({ seccion: revision.seccion, clave: revision.item.clave, regenerar: false, motivoRevision: motivoRevision.trim() })}>
        <Field label="Motivo (mínimo 15 caracteres)" value={motivoRevision} onChangeText={setMotivoRevision} multiline />
      </FormSheet>

      <FormSheet
        visible={baja !== null}
        title={baja?.modo === 'testigos' ? 'Testigos del acta' : 'El colaborador se negó a firmar/recibir'}
        description="No se trata como firmado: se habilita el Acta administrativa de negativa con dos testigos (nombre y cargo). Las firmas son físicas."
        confirmLabel={baja?.modo === 'testigos' ? 'Guardar testigos' : 'Registrar negativa'}
        destructive={baja?.modo === 'negativa'}
        submitting={accion.isPending}
        confirmDisabled={baja?.modo === 'testigos' && testigos.some((t) => t.nombre.trim() === '' || t.cargo.trim() === '')}
        onCancel={() => setBaja(null)}
        onConfirm={registrarNegativa}>
        {testigos.map((t, i) => (
          <View key={i}>
            <Field label={`Testigo ${i + 1}: nombre`} value={t.nombre} onChangeText={(v) => setTestigos((ts) => ts.map((x, j) => (j === i ? { ...x, nombre: v } : x)))} />
            <Field label={`Testigo ${i + 1}: cargo`} value={t.cargo} onChangeText={(v) => setTestigos((ts) => ts.map((x, j) => (j === i ? { ...x, cargo: v } : x)))} />
          </View>
        ))}
        {baja?.modo === 'negativa' ? (
          <View style={styles.fila}>
            <Switch value={finiquitoDisposicion} onValueChange={setFiniquitoDisposicion} />
            <Text style={styles.suave}>El finiquito queda a su disposición</Text>
          </View>
        ) : null}
      </FormSheet>
    </View>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    contenedor: { gap: Spacing.sm },
    tarjeta: { gap: Spacing.xs },
    fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    icono: { width: 32, height: 32, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primarySoft },
    nombre: { flex: 1, fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
    suave: { fontSize: FontSize.sm, color: Colors.textMuted },
    ayuda: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: -Spacing.xs, marginBottom: Spacing.xs },
    lineaTiempo: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.xs },
    paso: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    pasoTexto: { fontSize: FontSize.sm, color: Colors.text },
    pasoActual: { color: Colors.primary, fontWeight: '700' },
    pasoPendiente: { color: Colors.textMuted },
    acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
    historial: { gap: 4, marginTop: Spacing.sm },
  });
