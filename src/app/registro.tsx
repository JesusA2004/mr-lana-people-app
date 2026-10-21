import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { documentosApi } from '@/api/documentos';
import { queryKeys } from '@/api/queryKeys';
import { registroApi } from '@/api/registro';
import { AnimatedProgressBar } from '@/components/AnimatedProgressBar';
import { BarraAccionInferior } from '@/components/BarraAccionInferior';
import { BrandLogo } from '@/components/BrandLogo';
import { Button } from '@/components/Button';
import { CartaCompromisoVisor, type VisorCartaCompromiso } from '@/components/CartaCompromisoVisor';
import { DocumentStatusBadge } from '@/components/DocumentStatusBadge';
import { DocumentUploadSheet } from '@/components/DocumentUploadSheet';
import { ErrorState } from '@/components/ErrorState';
import { FormularioScroll } from '@/components/FormularioScroll';
import { DateField } from '@/components/forms/DateField';
import { DomicilioFields } from '@/components/forms/DomicilioFields';
import { OpcionesField } from '@/components/forms/OpcionesField';
import { SelectField } from '@/components/forms/SelectField';
import { Input } from '@/components/Input';
import { PressableScale } from '@/components/PressableScale';
import { SkeletonBlock } from '@/components/SkeletonBlock';
import { TarjetaAviso } from '@/components/ui';
import { FontSize, Layout, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import type { DocumentoIncorporacion } from '@/types/document';
import type { CartaCompromiso } from '@/types/cartaCompromiso';
import type { CampoRegistro, EstadoRegistro } from '@/types/registro';
import { textoExcedeMaximoCarta } from '@/utils/cartaCompromiso';
import { confirmAction } from '@/utils/confirm';
import { formatDateLong, fromApiDateString, toApiDateString } from '@/utils/dates';
import { esCampoDomicilio, type CampoDomicilio } from '@/utils/domicilio';
import { getErrorMessage, getValidationErrors, logError } from '@/utils/errors';
import { haptics } from '@/utils/haptics';
import { borrarBorrador, guardarBorrador, leerBorrador } from '@/utils/registroBorrador';
import {
  PASOS_REGISTRO,
  camposDelPaso,
  datosParaEnviar,
  documentosPorSubir,
  documentosSinResolver,
  documentosSinTener,
  excedeMaximoCarta,
  maxCartaRegistro,
  normalizarValor,
  pasoParaReanudar,
  puedeFinalizarRegistro,
  sinTenerVigentes,
  textoDocumentos,
  textoProgreso,
  validarFormato,
  validarPaso,
  valoresIniciales,
  type ClavePaso,
} from '@/utils/registroWizard';

type PasoDatos = 'personales' | 'domicilio' | 'emergencia';

const esPasoDatos = (clave: ClavePaso): clave is PasoDatos => clave === 'personales' || clave === 'domicilio' || clave === 'emergencia';

/**
 * REGISTRO COMPLETO antes de entrar a la app (cuenta creada con el QR de
 * incorporación). Asistente por pasos: datos personales → domicilio →
 * contacto de emergencia → datos médicos (opcional) → documentos requeridos
 * → revisión. Cada «Siguiente» guarda en el servidor
 * (`POST /colaborador/registro/datos`), lo no enviado se guarda como
 * borrador local cifrado, y al reabrir la app se reanuda donde se quedó.
 * «Entrar a la app» (`POST registro/finalizar`) solo procede cuando el
 * backend confirma datos y documentos completos.
 *
 * Esta pantalla solo existe mientras `user.registro_completo === false`
 * (`Stack.Protected` en `_layout.tsx`); el backend además responde 403
 * «registro_incompleto» al resto de la API.
 */
export default function RegistroScreen() {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const correoCuenta = useAuthStore((state) => (state.user?.correo ?? state.user?.email ?? null) as string | null);
  const nombre = useAuthStore((state) => (state.user?.nombre ?? state.user?.name ?? '') as string);
  const marcarRegistroCompleto = useAuthStore((state) => state.marcarRegistroCompleto);
  const refrescarUsuario = useAuthStore((state) => state.refrescarUsuario);
  const logout = useAuthStore((state) => state.logout);

  const query = useQuery({ queryKey: queryKeys.registro, queryFn: registroApi.estado });
  const estado = query.data;

  const [indice, setIndice] = useState<number | null>(null);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [documentoActivo, setDocumentoActivo] = useState<DocumentoIncorporacion | null>(null);
  const [alturaBarra, setAlturaBarra] = useState(0);
  /** `document_type_id` marcados «No tengo este documento» (van en la carta compromiso). */
  const [sinTener, setSinTener] = useState<number[]>([]);
  const [visor, setVisor] = useState<VisorCartaCompromiso | null>(null);
  /** Carta compromiso generada al terminar: se muestra antes de entrar a la app. */
  const [cartaGenerada, setCartaGenerada] = useState<CartaCompromiso | null>(null);
  const iniciado = useRef(false);

  // Arranque: estado del servidor + borrador local → paso donde reanudar.
  useEffect(() => {
    if (!estado || iniciado.current || userId === null) return;
    iniciado.current = true;
    void leerBorrador(userId).then((borrador) => {
      const base = valoresIniciales(estado.datos.campos, borrador.valores);
      // El correo de la cuenta prellena el correo personal (si no hay otro).
      if (!base.correo_personal && correoCuenta && !estado.datos.campos.find((c) => c.campo === 'correo_personal')?.bloqueado) {
        base.correo_personal = correoCuenta;
      }
      for (const medico of ['condicion_medica', 'alergias']) {
        if (borrador.valores[medico]) base[medico] = borrador.valores[medico];
      }
      setValores(base);
      const marcados = sinTenerVigentes(estado, borrador.sinTener);
      setSinTener(marcados);
      setIndice(pasoParaReanudar(estado, borrador.paso, marcados));
    });
  }, [estado, userId, correoCuenta]);

  // Borrador local (cifrado) de lo que aún no se envía.
  useEffect(() => {
    if (indice === null || userId === null) return;
    const timer = setTimeout(() => void guardarBorrador(userId, { paso: PASOS_REGISTRO[indice].clave, valores, sinTener }), 600);
    return () => clearTimeout(timer);
  }, [valores, indice, userId, sinTener]);

  // Una marca «No tengo» de un documento que ya se subió (aquí o desde otra
  // pantalla) deja de contar sola: todos los cálculos filtran con
  // `sinTenerVigentes` / `documentosSinTener` contra el estado del servidor.

  const alternarSinTener = (documento: DocumentoIncorporacion) => {
    haptics.selection();
    setErrorGeneral(null);
    setSinTener((actual) => (actual.includes(documento.id) ? actual.filter((id) => id !== documento.id) : [...actual, documento.id]));
  };

  const paso = indice !== null ? PASOS_REGISTRO[indice] : null;
  const clavePaso = paso?.clave;

  // Documentos y revisión: siempre con el estado fresco del servidor (RH
  // pudo rechazar algo, o se subió desde otra pantalla).
  useEffect(() => {
    if (clavePaso === 'documentos' || clavePaso === 'revision') void query.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al cambiar de paso.
  }, [clavePaso]);

  const cambiar = (campo: string, valor: string) => {
    setValores((actual) => ({ ...actual, [campo]: valor }));
    setErrores((actual) => {
      if (!actual[campo]) return actual;
      const { [campo]: _quitado, ...resto } = actual;
      return resto;
    });
    setErrorGeneral(null);
  };

  const validarAlSalir = (campo: string) => {
    const mensaje = validarFormato(campo, valores[campo] ?? '');
    if (mensaje) setErrores((actual) => ({ ...actual, [campo]: mensaje }));
  };

  const irA = (nuevo: number) => {
    haptics.selection();
    setErrores({});
    setErrorGeneral(null);
    setIndice(Math.max(0, Math.min(PASOS_REGISTRO.length - 1, nuevo)));
  };

  const aplicarEstado = (nuevo: EstadoRegistro) => {
    queryClient.setQueryData(queryKeys.registro, nuevo);
  };

  const manejarError = (error: unknown) => {
    logError('registro.guardar', error);
    haptics.error();
    const validacion = getValidationErrors(error);
    if (validacion) {
      const mapa: Record<string, string> = {};
      let general: string | null = null;
      for (const [clave, mensajes] of Object.entries(validacion)) {
        const mensaje = mensajes?.[0];
        if (!mensaje) continue;
        const campo = clave.replace(/^datos(_medicos)?\./, '');
        if (campo === 'datos' || campo === 'registro' || campo === 'datos_medicos') general = mensaje;
        else mapa[campo] = mensaje;
      }
      setErrores(mapa);
      setErrorGeneral(general ?? (Object.keys(mapa).length > 0 ? 'Revisa los campos marcados en rojo.' : getErrorMessage(error)));
      return;
    }
    setErrorGeneral(getErrorMessage(error));
  };

  const siguiente = async () => {
    if (!estado || !paso || indice === null) return;

    if (esPasoDatos(paso.clave)) {
      const encontrados = validarPaso(paso.clave, estado.datos.campos, valores);
      if (Object.keys(encontrados).length > 0) {
        haptics.warning();
        setErrores(encontrados);
        setErrorGeneral('Revisa los campos marcados en rojo.');
        return;
      }
      const datos = datosParaEnviar(paso.clave, estado.datos.campos, valores);
      if (Object.keys(datos).length > 0) {
        setGuardando(true);
        try {
          aplicarEstado(await registroApi.guardarDatos(datos));
        } catch (error) {
          manejarError(error);
          return;
        } finally {
          setGuardando(false);
        }
      }
      irA(indice + 1);
      return;
    }

    if (paso.clave === 'medicos') {
      const condicion = normalizarValor('condicion_medica', valores.condicion_medica ?? '');
      const alergias = normalizarValor('alergias', valores.alergias ?? '');
      if (condicion || alergias) {
        setGuardando(true);
        try {
          aplicarEstado(await registroApi.guardarDatos({}, { condicion_medica: condicion, alergias }));
        } catch (error) {
          manejarError(error);
          return;
        } finally {
          setGuardando(false);
        }
      }
      irA(indice + 1);
      return;
    }

    if (paso.clave === 'documentos') {
      if (documentosSinResolver(estado, sinTener).length > 0) {
        haptics.warning();
        setErrorGeneral('Sube cada documento o marca «No tengo este documento» en los que te falten para continuar.');
        return;
      }
      irA(indice + 1);
      return;
    }

    // Revisión → terminar.
    setGuardando(true);
    const excedia = excedeMaximoCarta(estado, sinTener);
    try {
      const final = await registroApi.finalizar(sinTenerVigentes(estado, sinTener));
      aplicarEstado(final);
      if (userId !== null) await borrarBorrador(userId);
      haptics.success();
      if (final.carta_compromiso) {
        // Primero se le muestra su carta (folio, fecha límite, descarga);
        // entra a la app al tocar «Continuar».
        setCartaGenerada(final.carta_compromiso);
        return;
      }
      // Más «No tengo» que el máximo: sin carta; `/me` trae el bloqueo
      // (excede_maximo_carta) y la puerta lleva a «Documentos pendientes».
      toast.success(excedia ? 'Tu registro quedó completo. Sube tus documentos pendientes para generar tu carta compromiso.' : '¡Listo! Tu registro quedó completo.');
      marcarRegistroCompleto(true);
      void refrescarUsuario();
    } catch (error) {
      manejarError(error);
      void query.refetch();
    } finally {
      setGuardando(false);
    }
  };

  const salir = async () => {
    const ok = await confirmAction({
      title: 'Salir del registro',
      message: 'Lo que ya guardaste se conserva. Puedes volver a entrar con tu usuario y contraseña para terminar.',
      confirmLabel: 'Salir',
    });
    if (ok) await logout();
  };

  const subirDocumento = async (documento: DocumentoIncorporacion, archivo: { uri: string; name: string; mimeType: string }, onProgress: (p: number) => void) => {
    await documentosApi.upload({ documentTypeId: documento.id, fileUri: archivo.uri, fileName: archivo.name, mimeType: archivo.mimeType, onProgress });
    // Ya lo tiene: deja de ir en la carta compromiso.
    setSinTener((actual) => actual.filter((id) => id !== documento.id));
    const nuevo = await registroApi.estado();
    aplicarEstado(nuevo);
    void queryClient.invalidateQueries({ queryKey: queryKeys.incorporacion });
  };

  const textoBoton = useMemo(() => {
    if (!paso) return 'Siguiente';
    if (paso.clave === 'revision') return 'Entrar a la app';
    if (paso.clave === 'medicos' && !(valores.condicion_medica ?? '').trim() && !(valores.alergias ?? '').trim()) return 'Omitir';
    return 'Siguiente';
  }, [paso, valores.condicion_medica, valores.alergias]);

  const cargando = query.isLoading || (estado !== undefined && indice === null);
  const pendientesDocs = estado ? documentosSinResolver(estado, sinTener) : [];
  const puedeFinalizar = estado ? puedeFinalizarRegistro(estado, sinTener) : false;
  const deshabilitarSiguiente = guardando || (paso?.clave === 'revision' && !puedeFinalizar);

  const continuarALaApp = () => {
    haptics.success();
    toast.success('¡Bienvenido! Recuerda subir tus documentos pendientes a tiempo.');
    marcarRegistroCompleto(true);
    void refrescarUsuario();
  };

  if (cartaGenerada) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.encabezado}>
          <View style={styles.encabezadoFila}>
            <BrandLogo width={150} />
          </View>
        </View>
        <CartaGenerada carta={cartaGenerada} onVer={() => setVisor({ tipo: 'carta', folio: cartaGenerada.folio })} onContinuar={continuarALaApp} />
        <CartaCompromisoVisor visor={visor} onClose={() => setVisor(null)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.encabezado}>
        <View style={styles.encabezadoFila}>
          <BrandLogo width={150} />
          <PressableScale accessibilityLabel="Salir del registro" haptic={false} onPress={() => void salir()} style={styles.salir}>
            <Ionicons name="log-out-outline" size={20} color={Colors.textMuted} />
            <Text style={styles.salirTexto}>Salir</Text>
          </PressableScale>
        </View>
        {paso && indice !== null ? (
          <View style={styles.progreso}>
            <View style={styles.progresoFila}>
              <Text style={styles.progresoTexto}>{textoProgreso(indice)}</Text>
              {paso.opcional ? <Text style={styles.opcional}>Opcional</Text> : null}
            </View>
            <AnimatedProgressBar percent={((indice + 1) / PASOS_REGISTRO.length) * 100} height={6} />
          </View>
        ) : null}
      </View>

      {query.error && !estado ? (
        <View style={styles.centro}>
          <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />
        </View>
      ) : cargando || !paso || !estado ? (
        <View style={styles.cargando}>
          <SkeletonBlock height={64} radius={Radius.lg} />
          <SkeletonBlock height={320} radius={Radius.lg} />
        </View>
      ) : (
        <>
          <FormularioScroll alturaBarra={alturaBarra} contentContainerStyle={styles.scroll}>
            <View style={styles.contenido}>
              <View style={styles.tituloPaso}>
                <View style={styles.iconoPaso}>
                  <Ionicons name={paso.icono} size={24} color={Colors.primaryDark} />
                </View>
                <View style={styles.tituloTextos}>
                  <Text style={styles.titulo} accessibilityRole="header">
                    {indice === 0 && nombre ? `${nombre}, ${paso.titulo.charAt(0).toLowerCase()}${paso.titulo.slice(1)}` : paso.titulo}
                  </Text>
                  <Text style={styles.descripcion}>{paso.descripcion}</Text>
                </View>
              </View>

              {indice === 0 ? (
                <View style={styles.aviso}>
                  <Ionicons name="sparkles-outline" size={18} color={Colors.primaryDark} />
                  <Text style={styles.avisoTexto}>
                    Tu cuenta ya está creada. Termina tu registro aquí mismo — datos y documentos — y entras directo a la app. Tu avance se guarda solo.
                  </Text>
                </View>
              ) : null}

              {esPasoDatos(paso.clave) ? (
                <PasoDatosFormulario
                  paso={paso.clave}
                  campos={estado.datos.campos}
                  valores={valores}
                  errores={errores}
                  onChange={cambiar}
                  onBlur={validarAlSalir}
                />
              ) : paso.clave === 'medicos' ? (
                <View style={styles.campos}>
                  {estado.datos_medicos.capturados ? (
                    <Text style={styles.ayuda}>Ya tienes datos médicos registrados. Si escribes algo aquí, se actualizan.</Text>
                  ) : null}
                  <Input
                    label="Condición médica (opcional)"
                    placeholder="Ej. diabetes, hipertensión, asma…"
                    value={valores.condicion_medica ?? ''}
                    onChangeText={(texto) => cambiar('condicion_medica', texto)}
                    multiline
                    maxLength={1000}
                    error={errores.condicion_medica}
                    style={styles.multilinea}
                  />
                  <Input
                    label="Alergias (opcional)"
                    placeholder="Ej. penicilina, mariscos…"
                    value={valores.alergias ?? ''}
                    onChangeText={(texto) => cambiar('alergias', texto)}
                    multiline
                    maxLength={1000}
                    error={errores.alergias}
                    style={styles.multilinea}
                  />
                  <View style={styles.privado}>
                    <Ionicons name="lock-closed-outline" size={16} color={Colors.textMuted} />
                    <Text style={styles.ayuda}>Se guarda cifrado y solo lo ve personal autorizado de RH, para atenderte en una emergencia.</Text>
                  </View>
                </View>
              ) : paso.clave === 'documentos' ? (
                <PasoDocumentos estado={estado} sinTener={sinTener} onElegir={setDocumentoActivo} onAlternarSinTener={alternarSinTener} />
              ) : (
                <PasoRevision
                  estado={estado}
                  sinTener={sinTener}
                  puedeFinalizar={puedeFinalizar}
                  onIr={irA}
                  onVistaPrevia={(documentos) => setVisor({ tipo: 'vista-previa', documentos })}
                />
              )}

              {errorGeneral ? (
                <View style={styles.errorGeneral} accessibilityLiveRegion="assertive">
                  <Ionicons name="alert-circle-outline" size={18} color={Colors.danger} />
                  <Text style={styles.errorGeneralTexto}>{errorGeneral}</Text>
                </View>
              ) : null}
            </View>
          </FormularioScroll>

          <BarraAccionInferior
            fila
            onAltura={setAlturaBarra}
            nota={
              paso.clave === 'documentos' && pendientesDocs.length > 0
                ? `Te ${pendientesDocs.length === 1 ? 'falta 1 documento' : `faltan ${pendientesDocs.length} documentos`}.`
                : paso.clave === 'revision' && !puedeFinalizar
                  ? 'Completa lo pendiente para entrar.'
                  : undefined
            }>
            {indice !== null && indice > 0 ? (
              <Button title="Atrás" variant="outline" leftIcon="chevron-back" onPress={() => irA(indice - 1)} disabled={guardando} style={styles.botonAtras} />
            ) : null}
            <Button
              title={textoBoton}
              rightIcon={paso.clave === 'revision' ? 'log-in-outline' : 'chevron-forward'}
              onPress={() => siguiente()}
              loading={guardando}
              disabled={deshabilitarSiguiente}
              style={styles.botonSiguiente}
            />
          </BarraAccionInferior>
        </>
      )}

      <DocumentUploadSheet
        visible={documentoActivo !== null}
        title={documentoActivo?.nombre ?? ''}
        onClose={() => setDocumentoActivo(null)}
        onConfirm={async (archivo, onProgress) => {
          if (!documentoActivo) return;
          await subirDocumento(documentoActivo, archivo, onProgress);
        }}
      />
      <CartaCompromisoVisor visor={visor} onClose={() => setVisor(null)} />
    </SafeAreaView>
  );
}

function PasoDatosFormulario({
  paso,
  campos,
  valores,
  errores,
  onChange,
  onBlur,
}: {
  paso: PasoDatos;
  campos: CampoRegistro[];
  valores: Record<string, string>;
  errores: Record<string, string>;
  onChange: (campo: string, valor: string) => void;
  onBlur: (campo: string) => void;
}) {
  const styles = useEstilos(crearEstilos);
  const propios = camposDelPaso(paso, campos);
  const bloqueados = propios.filter((c) => c.bloqueado);
  const editables = propios.filter((c) => !c.bloqueado);

  if (propios.length === 0) {
    return <Text style={styles.ayuda}>Recursos Humanos ya tiene estos datos. Continúa al siguiente paso.</Text>;
  }

  const domicilioEditables = editables.filter((c) => esCampoDomicilio(c.campo));
  const otros = editables.filter((c) => !esCampoDomicilio(c.campo));
  const estadosApi = domicilioEditables.find((c) => c.campo === 'domicilio_estado')?.opciones?.map((o) => o.value);

  return (
    <View style={styles.campos}>
      {otros.map((campo) => (
        <CampoFormulario
          key={campo.campo}
          campo={campo}
          valor={valores[campo.campo]}
          error={errores[campo.campo]}
          onChange={(v) => onChange(campo.campo, v)}
          onBlur={() => onBlur(campo.campo)}
        />
      ))}
      {domicilioEditables.length > 0 ? (
        <DomicilioFields
          valores={valores}
          errores={errores}
          campos={domicilioEditables.map((c) => c.campo).filter(esCampoDomicilio) as CampoDomicilio[]}
          estados={estadosApi}
          onChange={onChange}
        />
      ) : null}
      {bloqueados.length > 0 ? <DatosBloqueados campos={bloqueados} /> : null}
    </View>
  );
}

function CampoFormulario({
  campo,
  valor,
  error,
  onChange,
  onBlur,
}: {
  campo: CampoRegistro;
  valor?: string;
  error?: string;
  onChange: (valor: string) => void;
  onBlur: () => void;
}) {
  const etiqueta = campo.obligatorio ? campo.etiqueta : `${campo.etiqueta} (opcional)`;

  if (campo.tipo === 'opciones' && campo.opciones) {
    return campo.opciones.length > 4 ? (
      <SelectField label={etiqueta} value={valor || undefined} options={campo.opciones} onChange={onChange} error={error} placeholder="Elige una opción" />
    ) : (
      <OpcionesField label={etiqueta} value={valor} opciones={campo.opciones} onChange={onChange} error={error} />
    );
  }

  if (campo.tipo === 'date') {
    return (
      <DateField
        label={etiqueta}
        value={valor ? fromApiDateString(valor) : undefined}
        onChange={(fecha) => onChange(toApiDateString(fecha))}
        error={error}
        placeholder="Elige la fecha"
      />
    );
  }

  const mayusculas = campo.campo === 'curp' || campo.campo === 'rfc' || campo.campo === 'clave_elector';
  const numerico = campo.tipo === 'tel' || campo.tipo === 'number';
  const maximo: Record<string, number> = { curp: 18, rfc: 13, nss: 11, clave_elector: 18, telefono: 10, contacto_emergencia_telefono: 10 };
  const ayuda: Record<string, string> = {
    curp: '18 caracteres. La encuentras en tu INE o en gob.mx/curp.',
    rfc: '13 caracteres con homoclave (constancia de situación fiscal).',
    nss: '11 números de tu alta en el IMSS.',
    clave_elector: '18 caracteres, al frente de tu INE.',
    nacionalidad: 'Ej. Mexicana',
    lugar_nacimiento: 'Ciudad y estado, ej. Cuernavaca, Morelos',
    profesion: 'Ej. Ventas, contabilidad, chofer…',
    correo_personal: 'nombre@gmail.com',
    contacto_emergencia_nombre: 'Nombre completo',
    contacto_emergencia_parentesco: 'Ej. Madre, esposo, hermana',
    beneficiario_nombre: 'Nombre completo',
    beneficiario_parentesco: 'Ej. Hijo, esposa',
    telefono: '10 dígitos',
    contacto_emergencia_telefono: '10 dígitos',
  };

  return (
    <Input
      label={etiqueta}
      value={valor ?? ''}
      onChangeText={(texto) => onChange(numerico ? texto.replace(/[^0-9]/g, '') : mayusculas ? texto.toUpperCase().replace(/\s/g, '') : texto)}
      onBlur={onBlur}
      keyboardType={campo.tipo === 'tel' ? 'phone-pad' : campo.tipo === 'number' ? 'number-pad' : campo.tipo === 'email' ? 'email-address' : 'default'}
      autoCapitalize={campo.tipo === 'email' ? 'none' : mayusculas ? 'characters' : 'sentences'}
      autoCorrect={!mayusculas && campo.tipo !== 'email'}
      maxLength={maximo[campo.campo] ?? 150}
      placeholder={ayuda[campo.campo]}
      error={error}
      textContentType={campo.tipo === 'email' ? 'emailAddress' : campo.tipo === 'tel' ? 'telephoneNumber' : undefined}
    />
  );
}

function DatosBloqueados({ campos }: { campos: CampoRegistro[] }) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  return (
    <View style={styles.bloqueados}>
      <View style={styles.bloqueadosTitulo}>
        <Ionicons name="lock-closed-outline" size={16} color={Colors.textMuted} />
        <Text style={styles.bloqueadosTituloTexto}>Ya registrados por Recursos Humanos</Text>
      </View>
      {campos.map((campo) => (
        <View key={campo.campo} style={styles.bloqueadoFila}>
          <Text style={styles.bloqueadoEtiqueta}>{campo.etiqueta}</Text>
          <Text style={styles.bloqueadoValor}>{campo.actual_legible ?? campo.actual}</Text>
        </View>
      ))}
      <Text style={styles.ayuda}>Si algo está mal, podrás solicitar una corrección cuando entres a la app.</Text>
    </View>
  );
}

function PasoDocumentos({
  estado,
  sinTener,
  onElegir,
  onAlternarSinTener,
}: {
  estado: EstadoRegistro;
  sinTener: number[];
  onElegir: (documento: DocumentoIncorporacion) => void;
  onAlternarSinTener: (documento: DocumentoIncorporacion) => void;
}) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const lista = estado.documentos.lista;
  const pendientes = documentosPorSubir(estado);
  const listos = lista.length - pendientes.length;
  const marcados = documentosSinTener(estado, sinTener).length;
  const maximo = maxCartaRegistro(estado);
  const excede = marcados > maximo;

  if (lista.length === 0) {
    return <Text style={styles.ayuda}>Recursos Humanos no te pide documentos en este momento. Continúa.</Text>;
  }

  return (
    <View style={styles.campos}>
      <View style={styles.resumenDocs}>
        <Text style={styles.resumenDocsNumero}>
          {listos}/{lista.length}
        </Text>
        <Text style={styles.resumenDocsTexto}>documentos listos. Con foto: buena luz, sin reflejos y el documento completo en la imagen.</Text>
      </View>
      {pendientes.length > 0 && excede ? (
        <TarjetaAviso
          icono="lock-closed-outline"
          tono="peligro"
          titulo={`Marcaste ${textoDocumentos(marcados)} · máximo ${maximo} con carta`}
          mensaje={textoExcedeMaximoCarta(maximo)}
        />
      ) : pendientes.length > 0 ? (
        <View style={styles.aviso} accessibilityLiveRegion="polite">
          <Ionicons name="time-outline" size={18} color={Colors.primaryDark} />
          <Text style={styles.avisoTexto}>
            {marcados > 0
              ? `Marcaste ${textoDocumentos(marcados)} de ${maximo} posibles para entregar después. Al terminar se generará una carta compromiso con 7 días para subirlos.`
              : `¿Te falta alguno? Márcalo con «No tengo este documento» y podrás subirlo después (hasta ${textoDocumentos(maximo)}; se genera una carta compromiso con 7 días de plazo).`}
          </Text>
        </View>
      ) : null}
      {lista.map((documento) => {
        const falta = pendientes.some((p) => p.id === documento.id);
        const marcado = falta && sinTener.includes(documento.id);
        const contenido = (
          <>
            <View style={[styles.docIcono, marcado ? styles.docIconoDespues : falta ? styles.docIconoPendiente : styles.docIconoListo]}>
              <Ionicons
                name={marcado ? 'time-outline' : falta ? 'cloud-upload-outline' : 'checkmark'}
                size={20}
                color={marcado ? Colors.warning : falta ? Colors.primaryDark : Colors.success}
              />
            </View>
            <View style={styles.docTextos}>
              <Text style={styles.docNombre}>{documento.nombre}</Text>
              {marcado ? (
                <Text style={styles.ayuda}>Lo subirás después. Si ya lo tienes, tócalo para subirlo ahora.</Text>
              ) : documento.motivo_rechazo ? (
                <Text style={styles.docRechazo}>{`RH pidió corregirlo: ${documento.motivo_rechazo}`}</Text>
              ) : documento.mensaje && falta ? (
                <Text style={styles.ayuda}>{documento.mensaje}</Text>
              ) : null}
              {marcado ? (
                <View style={styles.pillDespues}>
                  <Text style={styles.pillDespuesTexto}>{excede ? 'Pendiente · por subir' : 'Pendiente · carta compromiso'}</Text>
                </View>
              ) : (
                <DocumentStatusBadge status={documento.estado} />
              )}
            </View>
            {falta ? <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} /> : null}
          </>
        );

        if (!falta) {
          // Ya enviado: fila informativa (no parece un botón apagado).
          return (
            <View key={documento.id} style={[styles.docFila, styles.docFilaListo]} accessible accessibilityLabel={`${documento.nombre}, ya enviado`}>
              {contenido}
            </View>
          );
        }

        return (
          <View key={documento.id} style={[styles.docTarjeta, marcado ? styles.docTarjetaDespues : styles.docFilaPendiente]}>
            {documento.puede_subir ? (
              <PressableScale accessibilityLabel={`Subir ${documento.nombre}`} onPress={() => onElegir(documento)} style={styles.docFilaInterna}>
                {contenido}
              </PressableScale>
            ) : (
              <View style={styles.docFilaInterna}>{contenido}</View>
            )}
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: marcado }}
              accessibilityLabel={`No tengo este documento: ${documento.nombre}`}
              onPress={() => onAlternarSinTener(documento)}
              style={({ pressed }) => [styles.sinTenerFila, pressed ? styles.presionado : null]}>
              <Ionicons name={marcado ? 'checkbox' : 'square-outline'} size={20} color={marcado ? Colors.warning : Colors.textMuted} />
              <Text style={[styles.sinTenerTexto, marcado ? styles.sinTenerTextoActivo : null]}>No tengo este documento</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

function PasoRevision({
  estado,
  sinTener,
  puedeFinalizar,
  onIr,
  onVistaPrevia,
}: {
  estado: EstadoRegistro;
  sinTener: number[];
  puedeFinalizar: boolean;
  onIr: (indice: number) => void;
  onVistaPrevia: (documentos: number[]) => void;
}) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const faltan = new Set(estado.datos.faltan.map((f) => f.campo));
  const paraCarta = documentosSinTener(estado, sinTener);
  const maximo = maxCartaRegistro(estado);
  const excede = paraCarta.length > maximo;
  const docsResueltos = estado.documentos.completo || documentosSinResolver(estado, sinTener).length === 0;
  const secciones: { clave: ClavePaso; titulo: string; completo: boolean }[] = [
    { clave: 'personales', titulo: 'Datos personales', completo: !camposDelPaso('personales', estado.datos.campos).some((c) => faltan.has(c.campo)) },
    { clave: 'domicilio', titulo: 'Domicilio', completo: !camposDelPaso('domicilio', estado.datos.campos).some((c) => faltan.has(c.campo)) },
    { clave: 'emergencia', titulo: 'Contacto de emergencia y beneficiario', completo: !camposDelPaso('emergencia', estado.datos.campos).some((c) => faltan.has(c.campo)) },
    { clave: 'medicos', titulo: 'Datos médicos (opcional)', completo: true },
    { clave: 'documentos', titulo: paraCarta.length > 0 ? `Documentos (${paraCarta.length} para después)` : 'Documentos', completo: docsResueltos },
  ];

  return (
    <View style={styles.campos}>
      {secciones.map((seccion) => {
        const indice = PASOS_REGISTRO.findIndex((p) => p.clave === seccion.clave);
        return (
          <PressableScale key={seccion.clave} accessibilityLabel={`${seccion.titulo}: ${seccion.completo ? 'completo' : 'pendiente'}. Editar`} onPress={() => onIr(indice)} style={styles.revisionFila}>
            <Ionicons name={seccion.completo ? 'checkmark-circle' : 'alert-circle'} size={24} color={seccion.completo ? Colors.success : Colors.warning} />
            <Text style={styles.revisionTexto}>{seccion.titulo}</Text>
            <Text style={styles.revisionAccion}>{seccion.completo ? 'Revisar' : 'Completar'}</Text>
          </PressableScale>
        );
      })}

      {excede ? (
        <View style={[styles.carta, styles.cartaExcede]}>
          <View style={styles.cartaEncabezado}>
            <View style={[styles.cartaIcono, styles.cartaIconoExcede]}>
              <Ionicons name="lock-closed-outline" size={22} color={Colors.danger} />
            </View>
            <View style={styles.tituloTextos}>
              <Text style={styles.cartaTitulo}>Tu app quedará bloqueada al terminar</Text>
              <Text style={styles.cartaSubtitulo}>{`Marcaste ${textoDocumentos(paraCarta.length)} que no tienes (máximo ${maximo} con carta):`}</Text>
            </View>
          </View>
          <View style={styles.cartaLista}>
            {paraCarta.map((documento) => (
              <View key={documento.id} style={styles.cartaItem}>
                <Ionicons name="ellipse" size={6} color={Colors.danger} />
                <Text style={styles.cartaItemTexto}>{documento.nombre}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.cartaTexto}>{textoExcedeMaximoCarta(maximo)}</Text>
        </View>
      ) : paraCarta.length > 0 ? (
        <View style={styles.carta}>
          <View style={styles.cartaEncabezado}>
            <View style={styles.cartaIcono}>
              <Ionicons name="document-text-outline" size={22} color={Colors.warning} />
            </View>
            <View style={styles.tituloTextos}>
              <Text style={styles.cartaTitulo}>Se generará una carta compromiso</Text>
              <Text style={styles.cartaSubtitulo}>{`Por ${textoDocumentos(paraCarta.length)} que entregarás después:`}</Text>
            </View>
          </View>
          <View style={styles.cartaLista}>
            {paraCarta.map((documento) => (
              <View key={documento.id} style={styles.cartaItem}>
                <Ionicons name="ellipse" size={6} color={Colors.warning} />
                <Text style={styles.cartaItemTexto}>{documento.nombre}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.cartaTexto}>
            Tendrás <Text style={styles.cartaNegritas}>7 días</Text> para subirlos desde la app. Si no los subes a tiempo, la app quedará limitada a subir
            documentos hasta que los entregues.
          </Text>
          <Button
            title="Ver vista previa"
            variant="outline"
            leftIcon="eye-outline"
            onPress={() => onVistaPrevia(paraCarta.map((d) => d.id))}
          />
        </View>
      ) : null}

      {puedeFinalizar ? (
        <View style={styles.listo}>
          <Ionicons name="checkmark-done-circle-outline" size={28} color={Colors.success} />
          <Text style={styles.listoTexto}>
            {excede
              ? `Tu registro está listo para terminar. Después solo podrás subir documentos hasta que te falten ${maximo} o menos; entonces se generará tu carta compromiso.`
              : paraCarta.length > 0
              ? 'Todo está listo. Al entrar se genera tu carta compromiso y Recursos Humanos revisará los documentos que ya subiste.'
              : 'Todo está listo. Recursos Humanos revisará tus documentos y te avisará en la app si necesita algo más.'}
          </Text>
        </View>
      ) : (
        <View style={styles.errorGeneral}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.warning} />
          <Text style={styles.pendienteTexto}>{`Todavía falta — ${estado.pendientes.join(' · ')}`}</Text>
        </View>
      )}
    </View>
  );
}

function CartaGenerada({ carta, onVer, onContinuar }: { carta: CartaCompromiso; onVer: () => void; onContinuar: () => void }) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const [alturaBarra, setAlturaBarra] = useState(0);

  return (
    <>
      <FormularioScroll alturaBarra={alturaBarra} contentContainerStyle={styles.scroll}>
        <View style={styles.contenido}>
          <View style={styles.exitoEncabezado}>
            <View style={styles.exitoIcono}>
              <Ionicons name="checkmark-done" size={36} color={Colors.success} />
            </View>
            <Text style={styles.exitoTitulo} accessibilityRole="header">
              ¡Tu registro quedó completo!
            </Text>
            <Text style={styles.exitoTexto}>Generamos tu carta compromiso por los documentos que entregarás después.</Text>
          </View>

          <View style={styles.carta}>
            <View style={styles.datoFila}>
              <Text style={styles.datoEtiqueta}>Folio</Text>
              <Text style={styles.datoValor}>{carta.folio}</Text>
            </View>
            <View style={styles.datoFila}>
              <Text style={styles.datoEtiqueta}>Fecha límite</Text>
              <Text style={styles.datoValor}>{formatDateLong(carta.fecha_limite) || carta.fecha_limite}</Text>
            </View>
            <View style={styles.datoFila}>
              <Text style={styles.datoEtiqueta}>Días para entregarlos</Text>
              <Text style={styles.datoValor}>{carta.dias_restantes === 1 ? '1 día' : `${carta.dias_restantes} días`}</Text>
            </View>
            {carta.documentos.length > 0 ? (
              <View style={styles.cartaLista}>
                {carta.documentos.map((documento) => (
                  <View key={documento.document_type_id} style={styles.cartaItem}>
                    <Ionicons name="ellipse" size={6} color={Colors.warning} />
                    <Text style={styles.cartaItemTexto}>{documento.nombre}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.aviso}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.primaryDark} />
            <Text style={styles.avisoTexto}>
              Súbelos desde la app antes de la fecha límite. Si se vence la carta, la app quedará limitada a subir documentos hasta que los entregues.
            </Text>
          </View>

          <Button title="Descargar carta compromiso" variant="outline" leftIcon="download-outline" onPress={onVer} />
        </View>
      </FormularioScroll>
      <BarraAccionInferior onAltura={setAlturaBarra}>
        <Button title="Continuar a la app" rightIcon="log-in-outline" onPress={onContinuar} />
      </BarraAccionInferior>
    </>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.background },
    encabezado: {
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.md,
      gap: Spacing.md,
      backgroundColor: Colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: Colors.border,
    },
    encabezadoFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
    salir: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, minHeight: Layout.minTouchTarget, paddingHorizontal: Spacing.sm },
    salirTexto: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '600' },
    progreso: { gap: Spacing.xs },
    progresoFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    progresoTexto: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.4, textTransform: 'uppercase' },
    opcional: {
      fontSize: FontSize.xs,
      fontWeight: '700',
      color: Colors.primaryDark,
      backgroundColor: Colors.primarySoft,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: Radius.full,
      overflow: 'hidden',
    },
    centro: { flex: 1, justifyContent: 'center', padding: Spacing.lg },
    cargando: { padding: Spacing.lg, gap: Spacing.lg },
    scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
    contenido: { width: '100%', maxWidth: Layout.maxFormWidth, alignSelf: 'center', gap: Spacing.lg },
    tituloPaso: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
    iconoPaso: {
      width: 48,
      height: 48,
      borderRadius: Radius.lg,
      backgroundColor: Colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tituloTextos: { flex: 1, gap: 2 },
    titulo: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
    descripcion: { fontSize: FontSize.sm, color: Colors.textMuted, lineHeight: 19 },
    aviso: {
      flexDirection: 'row',
      gap: Spacing.sm,
      backgroundColor: Colors.secondarySoft,
      borderRadius: Radius.md,
      padding: Spacing.md,
      alignItems: 'flex-start',
    },
    avisoTexto: { flex: 1, fontSize: FontSize.sm, color: Colors.text, lineHeight: 19 },
    campos: { gap: Spacing.lg },
    ayuda: { fontSize: FontSize.sm, color: Colors.textMuted, lineHeight: 19 },
    multilinea: { minHeight: 96, textAlignVertical: 'top', paddingTop: Spacing.md },
    privado: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
    errorGeneral: {
      flexDirection: 'row',
      gap: Spacing.sm,
      alignItems: 'flex-start',
      backgroundColor: Colors.dangerSoft,
      borderRadius: Radius.md,
      padding: Spacing.md,
    },
    errorGeneralTexto: { flex: 1, fontSize: FontSize.sm, color: Colors.danger, fontWeight: '600', lineHeight: 19 },
    pendienteTexto: { flex: 1, fontSize: FontSize.sm, color: Colors.text, lineHeight: 19 },
    bloqueados: {
      gap: Spacing.sm,
      backgroundColor: Colors.surfaceMuted,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
    },
    bloqueadosTitulo: { flexDirection: 'row', gap: Spacing.xs, alignItems: 'center' },
    bloqueadosTituloTexto: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textMuted },
    bloqueadoFila: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md },
    bloqueadoEtiqueta: { fontSize: FontSize.sm, color: Colors.textMuted, flexShrink: 1 },
    bloqueadoValor: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
    resumenDocs: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      backgroundColor: Colors.primarySoft,
      borderRadius: Radius.lg,
      padding: Spacing.md,
    },
    resumenDocsNumero: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.primaryDark },
    resumenDocsTexto: { flex: 1, fontSize: FontSize.sm, color: Colors.text, lineHeight: 19 },
    docFila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      borderRadius: Radius.lg,
      borderWidth: 1,
      padding: Spacing.md,
      minHeight: 72,
      backgroundColor: Colors.surface,
    },
    docFilaPendiente: { borderColor: Colors.border },
    docFilaListo: { borderColor: Colors.successSoft },
    docIcono: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
    docIconoPendiente: { backgroundColor: Colors.primarySoft },
    docIconoListo: { backgroundColor: Colors.successSoft },
    docTextos: { flex: 1, gap: Spacing.xs, alignItems: 'flex-start' },
    docNombre: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
    docRechazo: { fontSize: FontSize.sm, color: Colors.danger, lineHeight: 19 },
    revisionFila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      backgroundColor: Colors.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: Colors.border,
      padding: Spacing.md,
      minHeight: 56,
    },
    revisionTexto: { flex: 1, fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
    revisionAccion: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primaryDark },
    listo: {
      flexDirection: 'row',
      gap: Spacing.sm,
      alignItems: 'flex-start',
      backgroundColor: Colors.successSoft,
      borderRadius: Radius.md,
      padding: Spacing.md,
    },
    listoTexto: { flex: 1, fontSize: FontSize.sm, color: Colors.text, lineHeight: 19 },
    docIconoDespues: { backgroundColor: Colors.warningSoft },
    pillDespues: {
      backgroundColor: Colors.warningSoft,
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
    },
    pillDespuesTexto: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.warning },
    docTarjeta: {
      borderRadius: Radius.lg,
      borderWidth: 1,
      backgroundColor: Colors.surface,
      overflow: 'hidden',
    },
    docTarjetaDespues: { borderColor: Colors.warningSoft, backgroundColor: Colors.surface },
    docFilaInterna: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      padding: Spacing.md,
      minHeight: 72,
    },
    sinTenerFila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      minHeight: Layout.minTouchTarget,
      paddingHorizontal: Spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: Colors.border,
      backgroundColor: Colors.surfaceMuted,
    },
    sinTenerTexto: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textMuted },
    sinTenerTextoActivo: { color: Colors.warning, fontWeight: '700' },
    presionado: { opacity: 0.7 },
    carta: {
      gap: Spacing.md,
      backgroundColor: Colors.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: Colors.warningSoft,
      padding: Spacing.lg,
    },
    cartaExcede: { borderColor: Colors.dangerSoft },
    cartaIconoExcede: { backgroundColor: Colors.dangerSoft },
    cartaEncabezado: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
    cartaIcono: {
      width: 44,
      height: 44,
      borderRadius: Radius.md,
      backgroundColor: Colors.warningSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cartaTitulo: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
    cartaSubtitulo: { fontSize: FontSize.sm, color: Colors.textMuted, lineHeight: 19 },
    cartaLista: { gap: Spacing.xs, backgroundColor: Colors.surfaceMuted, borderRadius: Radius.md, padding: Spacing.md },
    cartaItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    cartaItemTexto: { flex: 1, fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
    cartaTexto: { fontSize: FontSize.sm, color: Colors.text, lineHeight: 19 },
    cartaNegritas: { fontWeight: '800' },
    exitoEncabezado: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md },
    exitoIcono: {
      width: 72,
      height: 72,
      borderRadius: Radius.full,
      backgroundColor: Colors.successSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    exitoTitulo: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text, textAlign: 'center' },
    exitoTexto: { fontSize: FontSize.sm, color: Colors.textMuted, lineHeight: 19, textAlign: 'center' },
    datoFila: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md },
    datoEtiqueta: { fontSize: FontSize.sm, color: Colors.textMuted, flexShrink: 1 },
    datoValor: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text, flexShrink: 1, textAlign: 'right' },
    botonAtras: { flex: 1 },
    botonSiguiente: { flex: 2 },
  });
