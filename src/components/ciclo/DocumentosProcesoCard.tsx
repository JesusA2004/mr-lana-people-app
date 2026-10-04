import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { faltantesDeError } from '@/api/rh/documentosProceso';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Field, FormSheet } from '@/components/ciclo/FormSheet';
import { Notice, SectionTitle } from '@/components/ciclo/Screen';
import { StatusBadge } from '@/components/StatusBadge';
import { FontSize, Spacing, type ColorPalette } from '@/constants/colors';
import { useAccionDocumentosProceso, useDocumentosProceso, type OrigenDocumentos } from '@/hooks/queries/useDocumentosProceso';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import { toast } from '@/store/toastStore';
import type { DatoFaltanteDocumento, ItemDocumentoProceso, SeccionDocumentosProceso } from '@/types/documentosProceso';
import { getActionErrorMessage, logError } from '@/utils/errors';
import { haptics } from '@/utils/haptics';

type Pendiente = { seccion: SeccionDocumentosProceso; clave: string | null; regenerar: boolean };

/**
 * "Documentos del proceso" en contexto (ficha del colaborador, cierre,
 * solicitud de permiso, préstamo, evaluación). El backend decide qué
 * documento toca y qué acciones hay; aquí se GENERA y se abre la pantalla
 * de documento laboral (PDF, compartir/imprimir, firma física, escaneo con
 * cámara). Nunca manda a un "generador de documentos".
 */
export function DocumentosProcesoCard({ origen }: { origen: OrigenDocumentos }) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const query = useDocumentosProceso(origen);
  const accion = useAccionDocumentosProceso(origen);

  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
  const [faltantes, setFaltantes] = useState<DatoFaltanteDocumento[]>([]);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [baja, setBaja] = useState<{ seccion: SeccionDocumentosProceso; modo: 'negativa' | 'testigos' } | null>(null);
  const [testigos, setTestigos] = useState([
    { nombre: '', cargo: '' },
    { nombre: '', cargo: '' },
  ]);
  const [finiquitoDisposicion, setFiniquitoDisposicion] = useState(true);

  const columna = (f: DatoFaltanteDocumento) => (f.fuente === 'sucursal' ? `sucursal.${f.columna}` : f.columna);

  const generar = (p: Pendiente, completar: Record<string, string> = {}) => {
    const manuales: Record<string, string> = {};
    const datos: Record<string, string> = {};
    for (const [k, v] of Object.entries(completar)) {
      const f = faltantes.find((x) => columna(x) === k);
      if (f?.fuente === 'manual') manuales[f.columna] = v;
      else datos[k] = v;
    }
    const { registro, proceso } = p.seccion;
    const payload = { clave: p.clave ?? undefined, proceso, regenerar: p.regenerar, completar: datos, manuales };

    accion.mutate(
      p.clave === null ? { tipo: 'paquete', registro: registro.tipo, id: registro.id, payload } : { tipo: 'generar', registro: registro.tipo, id: registro.id, payload },
      {
        onSuccess: () => {
          haptics.success();
          toast.success(p.clave === null ? 'Documentos generados.' : 'Documento generado.');
          setPendiente(null);
          setFaltantes([]);
        },
        onError: (error) => {
          const faltan = faltantesDeError(error);
          if (faltan) {
            setPendiente(p);
            setFaltantes(faltan.faltantes);
            setValores(Object.fromEntries(faltan.faltantes.map((f) => [columna(f), ''])));
            return;
          }
          logError('documentosProceso.generar', error);
          haptics.error();
          toast.error(getActionErrorMessage(error));
        },
      },
    );
  };

  const alAccionar = (seccion: SeccionDocumentosProceso, item: ItemDocumentoProceso, clave: string) => {
    if (clave === 'generar' || clave === 'regenerar') {
      generar({ seccion, clave: item.clave, regenerar: clave === 'regenerar' });
      return;
    }
    // PDF, compartir/imprimir y pasos físicos: pantalla de documento laboral existente.
    if (item.documentoId !== null) router.push(`/rh/documentos-laborales/${item.documentoId}`);
  };

  const registrarNegativa = () => {
    if (!baja) return;
    if (baja.modo === 'testigos') {
      guardarTestigos(baja.seccion);
      return;
    }
    const negativa = baja.seccion;
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
      },
    );
  };

  const guardarTestigos = (seccion: SeccionDocumentosProceso) =>
    accion.mutate(
      { tipo: 'testigos', cierreId: seccion.registro.id, testigos },
      {
        onSuccess: () => {
          toast.success('Testigos guardados.');
          setBaja(null);
        },
        onError: (error) => toast.error(getActionErrorMessage(error)),
      },
    );

  if (query.isLoading) return <Text style={styles.suave}>Cargando documentos…</Text>;
  if (query.error) return <Notice tone="warning">{getActionErrorMessage(query.error)}</Notice>;

  return (
    <View style={styles.contenedor}>
      {(query.data ?? []).map((seccion) => (
        <View key={`${seccion.proceso}-${seccion.registro.tipo}-${seccion.registro.id}`} style={styles.contenedor}>
          <SectionTitle>{seccion.titulo}</SectionTitle>
          <Text style={styles.suave}>{seccion.descripcion}</Text>
          {seccion.expedienteCompleto ? <Notice tone="success">Expediente completo</Notice> : null}
          {seccion.bloqueo ? <Notice tone="info">{seccion.bloqueo}</Notice> : null}

          {seccion.acciones.map((a) =>
            a.clave === 'generar_paquete' ? (
              <Button key={a.clave} title={a.etiqueta} leftIcon="documents-outline" loading={accion.isPending} onPress={() => generar({ seccion, clave: null, regenerar: false })} />
            ) : a.clave === 'registrar_negativa' ? (
              <Button key={a.clave} title={a.etiqueta} variant="danger" onPress={() => setBaja({ seccion, modo: 'negativa' })} />
            ) : a.clave === 'capturar_testigos' ? (
              <Button
                key={a.clave}
                title={a.etiqueta}
                variant="outline"
                onPress={() => {
                  setTestigos([0, 1].map((i) => seccion.testigos[i] ?? { nombre: '', cargo: '' }));
                  setBaja({ seccion, modo: 'testigos' });
                }}
              />
            ) : null,
          )}

          {seccion.documentos.map((item) => (
            <Card key={item.clave}>
              <View style={styles.fila}>
                <Ionicons name="document-text-outline" size={18} color={Colors.primary} />
                <Text style={styles.nombre}>{item.nombre}</Text>
                <StatusBadge status={item.estado} label={item.estadoEtiqueta} />
              </View>
              <Text style={styles.suave}>{item.motivo}</Text>
              {item.masterVersion !== null ? <Text style={styles.suave}>Formato oficial v{item.masterVersion}</Text> : null}
              {item.formatoFaltante ? <Notice tone="danger">{item.formatoFaltante}</Notice> : null}
              {!item.formatoFaltante && item.bloqueo ? <Text style={styles.suave}>{item.bloqueo}</Text> : null}
              {item.documentoId !== null ? (
                <Text style={styles.suave}>
                  {item.firmado ? '✓ Firmado' : '○ Firma pendiente'} · {item.escaneado ? '✓ Escaneado' : '○ Escaneo pendiente'}
                  {item.requiereHuella ? ' · requiere huella' : ''}
                </Text>
              ) : null}
              <View style={styles.acciones}>
                {item.acciones.some((a) => a.clave === 'generar' || a.clave === 'regenerar')
                  ? item.acciones
                      .filter((a) => a.clave === 'generar' || a.clave === 'regenerar')
                      .map((a) => (
                        <Button
                          key={a.clave}
                          title={a.etiqueta}
                          fullWidth={false}
                          variant={a.clave === 'generar' ? 'primary' : 'outline'}
                          loading={accion.isPending}
                          onPress={() => alAccionar(seccion, item, a.clave)}
                        />
                      ))
                  : null}
                {item.documentoId !== null ? (
                  <Button title="Ver PDF / imprimir / firmar" fullWidth={false} variant="outline" leftIcon="open-outline" onPress={() => alAccionar(seccion, item, 'abrir')} />
                ) : null}
              </View>
            </Card>
          ))}

          {seccion.checklist ? (
            <Card>
              <Text style={styles.nombre}>Checklist final del procedimiento</Text>
              {seccion.checklist.map((p) => (
                <Text key={p.clave} style={styles.suave}>
                  {p.cumplido ? '✓' : '○'} {p.etiqueta}
                </Text>
              ))}
            </Card>
          ) : null}
        </View>
      ))}

      <FormSheet
        visible={pendiente !== null}
        title={`Faltan ${faltantes.length} dato(s) requerido(s)`}
        description="Lo que captures se guarda en la ficha del colaborador y no se vuelve a pedir."
        confirmLabel="Guardar y generar"
        submitting={accion.isPending}
        onCancel={() => setPendiente(null)}
        onConfirm={() => pendiente && generar(pendiente, Object.fromEntries(Object.entries(valores).filter(([, v]) => v.trim() !== '')))}>
        {faltantes.map((f) =>
          f.editable ? (
            <Field
              key={columna(f)}
              label={f.tipo === 'estado_civil' ? `${f.etiqueta} (soltero, casado, union_libre, divorciado, viudo)` : f.tipo === 'fecha' ? `${f.etiqueta} (AAAA-MM-DD)` : f.etiqueta}
              value={valores[columna(f)] ?? ''}
              onChangeText={(v) => setValores((actual) => ({ ...actual, [columna(f)]: v }))}
              autoCapitalize={f.tipo === 'correo' || f.tipo === 'estado_civil' ? 'none' : 'sentences'}
            />
          ) : (
            <Text key={columna(f)} style={styles.suave}>
              {f.etiqueta}: se completa en su módulo ({f.fuente}).
            </Text>
          ),
        )}
      </FormSheet>

      <FormSheet
        visible={baja !== null}
        title={baja?.modo === 'testigos' ? 'Testigos del acta' : 'El colaborador se negó a firmar/recibir'}
        description="No se trata como firmado: se habilita el Acta administrativa de negativa con dos testigos (firmas físicas)."
        confirmLabel={baja?.modo === 'testigos' ? 'Guardar testigos' : 'Registrar negativa'}
        destructive={baja?.modo === 'negativa'}
        submitting={accion.isPending}
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
    fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    nombre: { flex: 1, fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
    suave: { fontSize: FontSize.sm, color: Colors.textMuted },
    acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
  });
