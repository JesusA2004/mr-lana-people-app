import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';

import { queryKeys } from '@/api/queryKeys';
import { solicitudEmpleoApi } from '@/api/solicitudEmpleo';
import { AnimatedProgressBar } from '@/components/AnimatedProgressBar';
import { BarraAccionInferior } from '@/components/BarraAccionInferior';
import { Button } from '@/components/Button';
import { ErrorState } from '@/components/ErrorState';
import { FormularioScroll } from '@/components/FormularioScroll';
import { PressableScale } from '@/components/PressableScale';
import { SkeletonBlock } from '@/components/SkeletonBlock';
import { FontSize, Layout, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { toast } from '@/store/toastStore';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import type { EstadoSolicitudEmpleo, SeccionSolicitud } from '@/types/solicitudEmpleo';
import { getErrorMessage, getValidationErrors, logError } from '@/utils/errors';
import { haptics } from '@/utils/haptics';
import {
  NOTA_CROQUIS,
  NOTA_PRIVACIDAD,
  campoRequerido,
  camposDeSoloLectura,
  camposEditables,
  contextoDe,
  cuerpoSeccion,
  faltantesDeDatosPersonales,
  filaVacia,
  formaInicial,
  indiceParaRetomar,
  mapearErroresSolicitud,
  textoSeccion,
  validarSeccion,
  type FormaSeccion,
  type ValorForma,
} from '@/utils/solicitudEmpleoWizard';

import { CampoSolicitudEmpleo, ListaSolicitudEditor } from './CamposSolicitudEmpleo';

type Accion = 'continuar' | 'salir' | 'anterior';

/**
 * Sub-asistente «Solicitud de empleo y estudio socioeconómico» del registro
 * (docs/SOLICITUD_EMPLEO_Y_SOCIOECONOMICO.md): una pantalla corta por
 * sección, con avance de la sección y global. «Guardar y continuar» exige
 * lo obligatorio de la sección; «Guardar y salir» y «Anterior» guardan a
 * medias (el backend lo permite) para retomar después en la primera
 * sección incompleta. Lo prellenado (sugerencias) solo se guarda cuando la
 * persona guarda la sección.
 */
export function AsistenteSolicitudEmpleo({
  seccionInicial,
  mensajeInicial,
  onCerrar,
  onIrADatosPersonales,
}: {
  /** Sección donde abrir (null = la primera incompleta). */
  seccionInicial: string | null;
  /** Aviso a mostrar al abrir (p. ej. el 422 de `registro/finalizar`). */
  mensajeInicial?: string | null;
  /** Regresa al paso del registro; `terminada` = guardó la última sección. */
  onCerrar: (terminada: boolean) => void;
  onIrADatosPersonales: () => void;
}) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const queryClient = useQueryClient();
  // Siempre el estado fresco del servidor al abrir (RH pudo completar algo):
  // mientras llega se muestra la carga, nunca un formulario con datos viejos.
  const query = useQuery({ queryKey: queryKeys.registroSolicitud, queryFn: solicitudEmpleoApi.estado, refetchOnMount: 'always' });
  const estado = query.isFetchedAfterMount || query.isError ? query.data : undefined;

  const [indiceElegido, setIndice] = useState<number | null>(null);
  /** Formulario de UNA sección (la clave dice de cuál: al cambiar de sección se reinicia con lo guardado). */
  const [formaActual, setFormaActual] = useState<{ clave: string; forma: FormaSeccion } | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(mensajeInicial ?? null);
  const [accionEnCurso, setAccionEnCurso] = useState<Accion | null>(null);
  const [alturaBarra, setAlturaBarra] = useState(0);
  /** Guardia síncrona contra doble toque (el estado de React tarda un render). */
  const ocupado = useRef(false);
  const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);

  // Primera carga: sección pedida o la primera incompleta (queda fija: un
  // refresco de fondo nunca cambia de sección a media captura).
  if (estado && indiceElegido === null && estado.secciones.length > 0) setIndice(indiceParaRetomar(estado.secciones, seccionInicial));
  const indice = indiceElegido;
  const seccion: SeccionSolicitud | null = estado && indice !== null ? (estado.secciones[indice] ?? null) : null;
  const claveSeccion = seccion?.clave ?? null;

  // Al cambiar de sección, el formulario arranca con lo guardado del servidor
  // (ajuste de estado durante el render, patrón recomendado por React).
  if (seccion && formaActual?.clave !== seccion.clave) {
    setFormaActual({ clave: seccion.clave, forma: formaInicial(seccion) });
    setErrores({});
  }
  const forma = seccion && formaActual?.clave === seccion.clave ? formaActual.forma : null;
  const setForma = (cambio: (f: FormaSeccion) => FormaSeccion) => setFormaActual((actual) => (actual ? { ...actual, forma: cambio(actual.forma) } : actual));

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [claveSeccion]);

  const quitarError = (clave: string) =>
    setErrores((actual) => {
      if (!actual[clave]) return actual;
      const { [clave]: _quitado, ...resto } = actual;
      return resto;
    });

  const cambiarCampo = (campo: string, valor: ValorForma) => {
    setForma((f) => ({ ...f, valores: { ...f.valores, [campo]: valor }, sugeridos: f.sugeridos.filter((s) => s !== campo) }));
    quitarError(campo);
    setErrorGeneral(null);
  };

  const cambiarNoAplica = (campo: string, marcado: boolean) => {
    setForma((f) => ({ ...f, noAplica: marcado ? [...new Set([...f.noAplica, campo])] : f.noAplica.filter((c) => c !== campo) }));
    quitarError(campo);
  };

  const cambiarFila = (i: number, campo: string, valor: string) => {
    setForma((f) => ({ ...f, filas: f.filas.map((fila, j) => (j === i ? { ...fila, [campo]: valor } : fila)) }));
    if (seccion?.lista) quitarError(`${seccion.lista.clave}.${i}.${campo}`);
  };

  const agregarFila = () => {
    if (!seccion?.lista) return;
    const lista = seccion.lista;
    haptics.selection();
    setForma((f) => ({ ...f, vacia: false, filas: [...f.filas, filaVacia(lista)] }));
    quitarError(lista.clave);
  };

  const quitarFila = (i: number) => {
    haptics.selection();
    // Los errores por renglón cambian de índice: se limpian y se recalculan al guardar.
    setErrores((actual) => Object.fromEntries(Object.entries(actual).filter(([k]) => !k.includes('.'))));
    setForma((f) => ({ ...f, filas: f.filas.filter((_, j) => j !== i) }));
  };

  const cambiarVacia = (vacia: boolean) => {
    // «No tengo…» y renglones a la vez no se admiten: al marcarla se quitan los renglones.
    setForma((f) => ({ ...f, vacia, filas: vacia ? [] : f.filas }));
    if (seccion?.lista) quitarError(seccion.lista.clave);
  };

  const aplicar = (nuevo: EstadoSolicitudEmpleo) => {
    queryClient.setQueryData(queryKeys.registroSolicitud, nuevo);
    // El bloque `solicitud_empleo` y `puede_finalizar` del registro cambian.
    void queryClient.invalidateQueries({ queryKey: queryKeys.registro, exact: true });
  };

  const guardar = async (accion: Accion) => {
    if (!seccion || !forma || indice === null || !estado || ocupado.current) return;

    const encontrados = validarSeccion(seccion, forma, accion === 'continuar');
    if (Object.keys(encontrados).length > 0) {
      haptics.warning();
      setErrores(encontrados);
      setErrorGeneral(accion === 'continuar' ? 'Completa lo marcado en rojo para continuar.' : 'Corrige lo marcado en rojo para guardar.');
      return;
    }

    ocupado.current = true;
    setAccionEnCurso(accion);
    setErrorGeneral(null);
    try {
      const nuevo = await solicitudEmpleoApi.guardarSeccion(seccion.clave, cuerpoSeccion(seccion, forma));
      aplicar(nuevo);
      haptics.success();
      if (accion === 'salir') {
        toast.success('Guardamos tu avance. Puedes continuar cuando quieras.');
        onCerrar(false);
      } else if (accion === 'anterior') {
        setIndice(Math.max(0, indice - 1));
      } else if (indice >= nuevo.secciones.length - 1) {
        const pendiente = nuevo.secciones.findIndex((s) => !s.completa);
        if (pendiente >= 0 && pendiente !== indice) {
          toast.info(`Guardado. Todavía falta: ${nuevo.secciones[pendiente].titulo}.`);
          setIndice(pendiente);
        } else {
          toast.success(nuevo.completitud.completo ? '¡Listo! Tu solicitud de empleo está completa.' : 'Guardamos tu solicitud.');
          onCerrar(true);
        }
      } else {
        setIndice(indice + 1);
      }
    } catch (error) {
      logError('registro.solicitud.guardar', error);
      haptics.error();
      const validacion = getValidationErrors(error);
      if (validacion) {
        const { campos, general } = mapearErroresSolicitud(validacion);
        setErrores(campos);
        setErrorGeneral(general ?? getErrorMessage(error));
      } else {
        setErrorGeneral(getErrorMessage(error));
      }
    } finally {
      ocupado.current = false;
      setAccionEnCurso(null);
    }
  };

  // ── Carga / error (distintos) ──
  if (query.error && !estado) {
    return (
      <View style={styles.centro}>
        <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />
        <Button title="Volver al registro" variant="ghost" onPress={() => onCerrar(false)} />
      </View>
    );
  }

  if (estado && estado.secciones.length === 0) {
    return (
      <View style={styles.centro}>
        <Text style={styles.ayudaCentro}>Recursos Humanos no te pide este formato por ahora.</Text>
        <Button title="Volver" onPress={() => onCerrar(false)} />
      </View>
    );
  }

  if (!estado || !seccion || !forma || indice === null) {
    return (
      <View style={styles.cargando} accessibilityLabel="Cargando tu solicitud de empleo">
        <SkeletonBlock height={56} radius={Radius.lg} />
        <SkeletonBlock height={120} radius={Radius.lg} />
        <SkeletonBlock height={240} radius={Radius.lg} />
      </View>
    );
  }

  if (!estado.registro_abierto) {
    return (
      <View style={styles.centro}>
        <Text style={styles.ayudaCentro}>Tu registro ya está completo. Si necesitas cambiar un dato, solicita una corrección desde la app.</Text>
        <Button title="Volver" onPress={() => onCerrar(false)} />
      </View>
    );
  }

  const total = estado.secciones.length;
  const contexto = contextoDe(seccion, forma);
  const editables = camposEditables(seccion, forma);
  const soloLectura = camposDeSoloLectura(seccion).filter((c) => c.valor !== null && !(Array.isArray(c.valor) && c.valor.length === 0));
  const deDatosPersonales = faltantesDeDatosPersonales(seccion);
  const ocupadoUi = accionEnCurso !== null;
  const esUltima = indice >= total - 1;

  return (
    <>
      <View style={styles.encabezado}>
        <View style={styles.encabezadoFila}>
          <Text style={styles.paso}>{textoSeccion(indice, total)}</Text>
          <PressableScale
            accessibilityLabel="Guardar y salir"
            haptic={false}
            disabled={ocupadoUi}
            onPress={() => void guardar('salir')}
            style={styles.salir}>
            <Ionicons name="bookmark-outline" size={16} color={Colors.primaryDark} />
            <Text style={styles.salirTexto}>{accionEnCurso === 'salir' ? 'Guardando…' : 'Guardar y salir'}</Text>
          </PressableScale>
        </View>
        <AnimatedProgressBar percent={((indice + 1) / total) * 100} height={6} />
        <Text style={styles.global}>{`Avance total de tu solicitud: ${estado.completitud.porcentaje}%`}</Text>
      </View>

      <FormularioScroll ref={scrollRef} alturaBarra={alturaBarra} contentContainerStyle={styles.scroll}>
        <View style={styles.contenido}>
          <View style={styles.titulo}>
            <Text style={styles.tituloTexto} accessibilityRole="header">
              {seccion.titulo}
            </Text>
            {seccion.descripcion ? <Text style={styles.descripcion}>{seccion.descripcion}</Text> : null}
            <View style={styles.avanceSeccion}>
              <AnimatedProgressBar percent={seccion.porcentaje} height={4} color={seccion.completa ? Colors.success : Colors.primary} />
              <Text style={styles.avanceTexto}>{seccion.completa ? 'Sección completa' : `Sección al ${seccion.porcentaje}%`}</Text>
            </View>
          </View>

          {seccion.clave === 'economica' ? <Nota icono="lock-closed-outline" texto={NOTA_PRIVACIDAD} /> : null}
          {seccion.clave === 'domicilio' ? <Nota icono="map-outline" texto={NOTA_CROQUIS} /> : null}

          {deDatosPersonales.length > 0 ? (
            <View style={styles.aviso}>
              <Ionicons name="information-circle-outline" size={18} color={Colors.warning} />
              <View style={styles.avisoTextos}>
                <Text style={styles.avisoTexto}>{`Esto se captura en «Datos personales» del registro: ${deDatosPersonales.join(', ')}.`}</Text>
                <Button title="Ir a datos personales" variant="outline" leftIcon="person-outline" onPress={onIrADatosPersonales} disabled={ocupadoUi} />
              </View>
            </View>
          ) : null}

          {editables.map((campo) => (
            <CampoSolicitudEmpleo
              key={campo.campo}
              campo={campo}
              valor={forma.valores[campo.campo]}
              requerido={campoRequerido(campo, contexto)}
              error={errores[campo.campo]}
              noAplica={forma.noAplica.includes(campo.campo)}
              sugerido={forma.sugeridos.includes(campo.campo)}
              onChange={(v) => cambiarCampo(campo.campo, v)}
              onNoAplica={(m) => cambiarNoAplica(campo.campo, m)}
            />
          ))}

          {seccion.lista ? (
            <ListaSolicitudEditor
              lista={seccion.lista}
              forma={forma}
              errores={errores}
              onCambiarFila={cambiarFila}
              onAgregar={agregarFila}
              onQuitar={quitarFila}
              onVacia={cambiarVacia}
            />
          ) : null}

          {soloLectura.length > 0 ? (
            <View style={styles.bloqueados}>
              <View style={styles.bloqueadosTitulo}>
                <Ionicons name="lock-closed-outline" size={16} color={Colors.textMuted} />
                <Text style={styles.bloqueadosTituloTexto}>Ya registrados</Text>
              </View>
              {soloLectura.map((c) => (
                <View key={c.campo} style={styles.bloqueadoFila}>
                  <Text style={styles.bloqueadoEtiqueta}>{c.etiqueta}</Text>
                  <Text style={styles.bloqueadoValor}>{c.valor_legible ?? textoLegible(c.valor, c.opciones)}</Text>
                </View>
              ))}
              <Text style={styles.ayuda}>Si algo está mal, podrás solicitar una corrección cuando entres a la app.</Text>
            </View>
          ) : null}

          {editables.length === 0 && !seccion.lista ? <Text style={styles.ayuda}>No hay nada que capturar aquí. Continúa a la siguiente sección.</Text> : null}

          {errorGeneral ? (
            <View style={styles.errorGeneral} accessibilityLiveRegion="assertive">
              <Ionicons name="alert-circle-outline" size={18} color={Colors.danger} />
              <Text style={styles.errorGeneralTexto}>{errorGeneral}</Text>
            </View>
          ) : null}
        </View>
      </FormularioScroll>

      <BarraAccionInferior fila onAltura={setAlturaBarra} nota={seccion.completa ? undefined : seccion.faltantes.length > 0 ? `Falta: ${seccion.faltantes.slice(0, 3).join(', ')}${seccion.faltantes.length > 3 ? '…' : ''}` : undefined}>
        <Button
          title={indice > 0 ? 'Anterior' : 'Volver'}
          variant="outline"
          leftIcon="chevron-back"
          loading={accionEnCurso === 'anterior'}
          disabled={ocupadoUi}
          onPress={() => (indice > 0 ? guardar('anterior') : onCerrar(false))}
          style={styles.botonAtras}
        />
        <Button
          title={esUltima ? 'Guardar y terminar' : 'Guardar y continuar'}
          rightIcon={esUltima ? 'checkmark' : 'chevron-forward'}
          loading={accionEnCurso === 'continuar'}
          disabled={ocupadoUi}
          onPress={() => guardar('continuar')}
          style={styles.botonSiguiente}
        />
      </BarraAccionInferior>
    </>
  );
}

function textoLegible(valor: unknown, opciones: { value: string; label: string }[]): string {
  const etiqueta = (v: unknown) => opciones.find((o) => o.value === v)?.label ?? String(v);
  if (valor === true) return 'Sí';
  if (valor === false) return 'No';
  if (Array.isArray(valor)) return valor.map(etiqueta).join(', ');
  return etiqueta(valor);
}

function Nota({ icono, texto }: { icono: 'lock-closed-outline' | 'map-outline'; texto: string }) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  return (
    <View style={styles.nota}>
      <Ionicons name={icono} size={16} color={Colors.textMuted} />
      <Text style={styles.ayuda}>{texto}</Text>
    </View>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    encabezado: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      gap: Spacing.xs,
      backgroundColor: Colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: Colors.border,
    },
    encabezadoFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
    paso: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.4, textTransform: 'uppercase' },
    salir: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, minHeight: Layout.minTouchTarget, paddingHorizontal: Spacing.sm },
    salirTexto: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primaryDark },
    global: { fontSize: FontSize.xs, color: Colors.textMuted },
    centro: { flex: 1, justifyContent: 'center', padding: Spacing.lg, gap: Spacing.lg },
    ayudaCentro: { fontSize: FontSize.md, color: Colors.text, textAlign: 'center', lineHeight: 22 },
    cargando: { padding: Spacing.lg, gap: Spacing.lg },
    scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
    contenido: { width: '100%', maxWidth: Layout.maxFormWidth, alignSelf: 'center', gap: Spacing.lg },
    titulo: { gap: Spacing.xs },
    tituloTexto: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
    descripcion: { fontSize: FontSize.sm, color: Colors.textMuted, lineHeight: 19 },
    avanceSeccion: { gap: Spacing.xs, marginTop: Spacing.xs },
    avanceTexto: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600' },
    nota: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start', backgroundColor: Colors.surfaceMuted, borderRadius: Radius.md, padding: Spacing.md },
    aviso: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start', backgroundColor: Colors.warningSoft, borderRadius: Radius.md, padding: Spacing.md },
    avisoTextos: { flex: 1, gap: Spacing.sm },
    avisoTexto: { fontSize: FontSize.sm, color: Colors.text, lineHeight: 19 },
    ayuda: { flex: 1, fontSize: FontSize.sm, color: Colors.textMuted, lineHeight: 19 },
    bloqueados: { gap: Spacing.sm, backgroundColor: Colors.surfaceMuted, borderRadius: Radius.lg, padding: Spacing.lg },
    bloqueadosTitulo: { flexDirection: 'row', gap: Spacing.xs, alignItems: 'center' },
    bloqueadosTituloTexto: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textMuted },
    bloqueadoFila: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md },
    bloqueadoEtiqueta: { fontSize: FontSize.sm, color: Colors.textMuted, flexShrink: 1 },
    bloqueadoValor: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
    errorGeneral: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start', backgroundColor: Colors.dangerSoft, borderRadius: Radius.md, padding: Spacing.md },
    errorGeneralTexto: { flex: 1, fontSize: FontSize.sm, color: Colors.danger, fontWeight: '600', lineHeight: 19 },
    botonAtras: { flex: 1 },
    botonSiguiente: { flex: 2 },
  });
