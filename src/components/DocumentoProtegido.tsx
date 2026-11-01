import { Ionicons } from '@expo/vector-icons';
import * as ScreenCapture from 'expo-screen-capture';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { AnimatedProgressBar } from './AnimatedProgressBar';
import { Button } from './Button';
import { SecureDocumentViewer } from './SecureDocumentViewer';
import { StatusBadge } from './StatusBadge';
import { TransicionEstado } from './TransicionEstado';

import { FontSize, Radius, Shadow, Spacing, type ColorPalette } from '@/constants/colors';
import { useDescargaDocumento, type ArchivoLocal } from '@/hooks/useDescargaDocumento';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import { etiquetaDescarga, formatearTamano, tipoLegible } from '@/utils/descargaDocumento';
import { isPreviewableSniffedType, type SniffedFileType } from '@/utils/fileSniff';
import { logError } from '@/utils/errors';

export type ModoDocumento = 'descarga' | 'consulta' | 'firma';

export const TEXTO_RESTRICCION_CONSULTA = 'Este documento solo se puede consultar en la app. No se puede descargar ni compartir.';
export const TEXTO_SIN_AUTORIZACION = 'No tienes autorización para descargar este documento.';
const TEXTO_NO_ABRIO = 'No se pudo abrir el documento en este teléfono.';

/** Clave propia: nunca la del hook global de privacidad. Ver la nota de `abrirVisor`. */
const CLAVE_CAPTURA = 'mrlana-documento-protegido';

export interface DocumentoProtegidoProps {
  titulo: string;
  estado?: { status: string; etiqueta?: string | null };
  modo: ModoDocumento;
  /** Ruta de la API que entrega el archivo para guardarlo («Descargar PDF»). */
  path?: string | null;
  /**
   * Autorización de descarga de ESTE documento. Solo `true` muestra «Descargar
   * PDF» y «Abrir con…»: ausente es NO. Donde el backend aún no manda flag, la
   * pantalla pasa `AUTORIZADO_POR_POLICY_ACTUAL` con su justificación.
   */
  puedeDescargar?: boolean;
  /** Modos `consulta` y `firma`: ruta para ver dentro de la app. */
  pathConsulta?: string | null;
  /** Nombre de quien consulta + fecha/hora, para documentos ajenos. */
  marcaDeAgua?: string;
  /** Sustituye la frase que explica la restricción en modo `consulta`. */
  motivoRestriccion?: string;
  /** Solo `firma`: se llama cuando el PDF se dibujó de verdad; nunca al cerrar ni al fallar. */
  onAperturaVerificada?: () => void;
  tipoEsperado?: SniffedFileType;
  tamanoConocido?: number | null;
  /** Por qué se ofrece esta tarjeta (p. ej. el visor de inducción no pudo dibujar). */
  motivo?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Componente ÚNICO de documentos. Las pantallas no eligen visor:
 *
 * - `descarga`: nombre, estado, «Descargar PDF» y «Abrir con…» si está
 *   autorizado, progreso y error. Sin visor embebido.
 * - `consulta`: visor autenticado con protección de captura y marca de agua.
 *   Nunca hay guardar, compartir ni entrega a otra app.
 * - `firma`: visor para revisar el documento; solo un dibujo correcto llama
 *   `onAperturaVerificada`. Abrirlo con otra app no cuenta: no es verificable.
 */
export function DocumentoProtegido({
  titulo,
  estado,
  modo,
  path,
  puedeDescargar = false,
  pathConsulta,
  marcaDeAgua,
  motivoRestriccion,
  onAperturaVerificada,
  tipoEsperado = 'pdf',
  tamanoConocido,
  motivo,
  style,
}: DocumentoProtegidoProps) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const permiteSalida = puedeDescargar === true && modo !== 'consulta' && Boolean(path);
  const usaVisor = modo !== 'descarga';
  // En `firma` la misma copia sirve al visor y a «Descargar PDF» si la ruta es la misma.
  const rutaVisor = pathConsulta ?? (modo === 'firma' ? path : null);
  const descarga = useDescargaDocumento({
    path: usaVisor ? rutaVisor : path,
    titulo,
    intencion: modo === 'consulta' ? 'consultar' : 'descargar',
  });
  const salidaAparte = useDescargaDocumento({ path: usaVisor && permiteSalida && path !== rutaVisor ? path : null, titulo });
  const salida = usaVisor && path !== rutaVisor ? salidaAparte : descarga;

  const [visor, setVisor] = useState<ArchivoLocal | null>(null);
  const [errorApertura, setErrorApertura] = useState<string | null>(null);
  const [abriendo, setAbriendo] = useState(false);
  const abriendoRef = useRef(false);

  useEffect(
    () => () => {
      void ScreenCapture.allowScreenCaptureAsync(CLAVE_CAPTURA).catch(() => {});
    },
    [],
  );

  const cerrarVisor = () => {
    setVisor(null);
    void ScreenCapture.allowScreenCaptureAsync(CLAVE_CAPTURA).catch(() => {});
    // Lo que solo se puede consultar no se queda en disco al cerrar.
    if (modo === 'consulta') descarga.descartar();
  };

  const alFallarVisor = (mensaje: string) => {
    setErrorApertura(mensaje || TEXTO_NO_ABRIO);
    cerrarVisor();
    // Un archivo dañado no debe reusarse: «Reintentar» lo baja de nuevo.
    descarga.descartar();
  };

  const abrirVisor = async () => {
    if (abriendoRef.current) return;
    abriendoRef.current = true;
    setAbriendo(true);
    setErrorApertura(null);
    try {
      const archivo = await descarga.obtener();
      if (!archivo) return;
      if (!isPreviewableSniffedType(archivo.tipo)) {
        setErrorApertura('Este archivo no puede mostrarse en la app. Consúltalo en el portal web de PEOPLE.');
        return;
      }
      // ANTES de crear el Modal: en Android es otra ventana y React Native solo
      // copia FLAG_SECURE de la actividad al crearla.
      try {
        await ScreenCapture.preventScreenCaptureAsync(CLAVE_CAPTURA);
      } catch (error) {
        logError('DocumentoProtegido.captura', error);
      }
      setVisor(archivo);
    } finally {
      abriendoRef.current = false;
      setAbriendo(false);
    }
  };

  const archivoInfo = salida.archivo ?? descarga.archivo;
  const tipo = archivoInfo?.tipo ?? tipoEsperado;
  const tamano = formatearTamano(archivoInfo?.tamano ?? tamanoConocido);
  const icono = tipo === 'png' || tipo === 'jpeg' ? 'image-outline' : tipo === 'pdf' ? 'document-text-outline' : 'document-outline';

  const activa = usaVisor && descarga.estado === 'descargando' ? descarga : salida;
  const descargando = activa.estado === 'descargando';
  const errorMostrado = errorApertura ?? descarga.error ?? salida.error;
  const estadoVisual = descargando ? 'descargando' : errorMostrado ? 'error' : salida.aviso ? 'listo' : 'inactivo';
  const salidaEnError = !usaVisor && salida.estado === 'error';
  const ocupado = abriendo || descarga.ocupado !== null || salida.ocupado !== null;
  const sinPermisoNiRuta = !usaVisor && !permiteSalida;

  return (
    <View style={style}>
      <View style={styles.tarjeta}>
        {motivo ? <Mensaje tono="info" texto={motivo} /> : null}

        <View style={styles.encabezado}>
          <View style={styles.icono}>
            <Ionicons name={icono} size={28} color={Colors.primaryDark} />
          </View>
          <View style={styles.datos}>
            <Text style={styles.nombre} numberOfLines={3} accessibilityRole="header">
              {titulo}
            </Text>
            <Text style={styles.meta}>{[tipoLegible(tipo), tamano].filter(Boolean).join(' · ')}</Text>
            {estado ? (
              <View style={styles.estado}>
                <StatusBadge status={estado.status} label={estado.etiqueta ?? undefined} />
              </View>
            ) : null}
          </View>
        </View>

        {modo === 'consulta' ? <Mensaje tono="info" texto={motivoRestriccion ?? TEXTO_RESTRICCION_CONSULTA} /> : null}
        {sinPermisoNiRuta ? <Mensaje tono="info" texto={TEXTO_SIN_AUTORIZACION} /> : null}

        <TransicionEstado estado={estadoVisual} style={styles.estados}>
          {descargando ? (
            <View style={styles.progreso} accessibilityLiveRegion="polite" accessibilityLabel="Descargando documento">
              <View style={styles.progresoFila}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.progresoTexto}>Descargando documento…</Text>
                {activa.progreso !== null ? <Text style={styles.progresoPorcentaje}>{activa.progreso}%</Text> : null}
              </View>
              {activa.progreso !== null ? <AnimatedProgressBar percent={activa.progreso} height={8} /> : null}
            </View>
          ) : null}
          {errorMostrado ? <Mensaje tono="error" texto={errorMostrado} /> : null}
          {salida.aviso ? <Mensaje tono="exito" texto={salida.aviso} /> : null}
        </TransicionEstado>

        <View style={styles.acciones}>
          {usaVisor ? (
            <Button
              title={errorApertura || descarga.estado === 'error' ? 'Reintentar' : modo === 'firma' ? 'Abrir documento para revisarlo' : 'Consultar documento'}
              leftIcon={errorApertura || descarga.estado === 'error' ? 'refresh' : 'eye-outline'}
              onPress={abrirVisor}
              loading={abriendo}
              disabled={ocupado || !rutaVisor}
            />
          ) : null}
          {permiteSalida ? (
            <>
              <Button
                title={salidaEnError && salida.ocupado === null ? 'Reintentar descarga' : etiquetaDescarga(tipo)}
                variant={usaVisor ? 'outline' : 'primary'}
                leftIcon={salidaEnError ? 'refresh' : 'download-outline'}
                onPress={() => (salidaEnError ? salida.reintentar() : salida.guardar())}
                loading={salida.ocupado === 'guardar'}
                disabled={ocupado}
              />
              <Button
                title="Abrir con…"
                variant="outline"
                leftIcon="open-outline"
                onPress={() => salida.abrirCon()}
                loading={salida.ocupado === 'abrir'}
                disabled={ocupado}
              />
            </>
          ) : null}
        </View>
        {modo === 'firma' && permiteSalida ? <Text style={styles.ayuda}>Para habilitar la firma, ábrelo aquí: abrirlo con otra app no la habilita.</Text> : null}
      </View>

      {usaVisor ? (
        <Modal visible={visor !== null} animationType="slide" presentationStyle="fullScreen" onRequestClose={cerrarVisor}>
          {visor ? (
            <SecureDocumentViewer
              title={titulo}
              archivoLocal={visor}
              watermarkLabel={marcaDeAgua}
              onClose={cerrarVisor}
              onDibujado={modo === 'firma' ? onAperturaVerificada : undefined}
              onFalloVisualizacion={alFallarVisor}
            />
          ) : null}
        </Modal>
      ) : null}
    </View>
  );
}

function Mensaje({ tono, texto }: { tono: 'info' | 'error' | 'exito'; texto: string }) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const visual = {
    info: { caja: styles.info, letra: styles.infoTexto, color: Colors.info, icono: 'information-circle-outline' as const },
    error: { caja: styles.error, letra: styles.errorTexto, color: Colors.danger, icono: 'alert-circle-outline' as const },
    exito: { caja: styles.exito, letra: styles.exitoTexto, color: Colors.success, icono: 'checkmark-circle-outline' as const },
  }[tono];
  return (
    <View style={[styles.mensaje, visual.caja]} accessibilityRole={tono === 'error' ? 'alert' : undefined} accessibilityLiveRegion="polite">
      <Ionicons name={visual.icono} size={18} color={visual.color} />
      <Text style={[styles.mensajeTexto, visual.letra]}>{texto}</Text>
    </View>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    tarjeta: {
      width: '100%',
      maxWidth: 560,
      alignSelf: 'center',
      gap: Spacing.lg,
      padding: Spacing.lg,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: Colors.border,
      backgroundColor: Colors.surface,
      ...Shadow.md,
    },
    encabezado: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    icono: {
      width: 56,
      height: 56,
      borderRadius: Radius.lg,
      backgroundColor: Colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    datos: { flex: 1, gap: 2 },
    nombre: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
    meta: { fontSize: FontSize.sm, color: Colors.textMuted },
    estado: { flexDirection: 'row', marginTop: Spacing.xs },
    estados: { gap: Spacing.sm },
    progreso: { gap: Spacing.sm },
    progresoFila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    progresoTexto: { flex: 1, fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
    progresoPorcentaje: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.primaryDark },
    mensaje: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start', padding: Spacing.md, borderRadius: Radius.md },
    mensajeTexto: { flex: 1, fontSize: FontSize.sm, lineHeight: 19 },
    info: { backgroundColor: Colors.infoSoft },
    infoTexto: { color: Colors.text },
    error: { backgroundColor: Colors.dangerSoft },
    errorTexto: { fontWeight: '600', color: Colors.danger },
    exito: { backgroundColor: Colors.successSoft },
    exitoTexto: { fontWeight: '600', color: Colors.success },
    acciones: { gap: Spacing.sm },
    ayuda: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center', lineHeight: 17 },
  });
