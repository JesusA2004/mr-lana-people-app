import { Ionicons } from '@expo/vector-icons';
import type { File } from 'expo-file-system';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedProgressBar } from './AnimatedProgressBar';
import { Button } from './Button';
import { SuccessCheck } from './SuccessCheck';

import { FontSize, Radius, Shadow, Spacing, type ColorPalette } from '@/constants/colors';
import { borrarTemporal, compartirArchivoLocal, descargarArchivoPrivado, guardarArchivoLocal, mensajeErrorAccionLocal } from '@/hooks/useDescargaDocumento';
import { useAuthStore } from '@/store/authStore';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import { esErrorDeRed, formatearTamano, mensajeErrorDescargaExpediente, nombreArchivoSeguro, porcentajeDescarga, progresoEnBytes, statusDesdeErrorDescarga } from '@/utils/descargaDocumento';
import { logError } from '@/utils/errors';
import { haptics } from '@/utils/haptics';

export interface DescargaExpedienteModalProps {
  visible: boolean;
  /** Ruta RELATIVA de la API (`rhExpedientesApi.descargarZipPath(id)`). */
  path: string;
  /** Nombre visible del colaborador («Ana López Ruiz»). */
  colaborador: string;
  /** Base del nombre del archivo, sin extensión («Expediente 4321 - Ana Lopez Ruiz»). */
  nombreArchivo: string;
  onClose: () => void;
}

type Fase = 'preparando' | 'descargando' | 'listo' | 'error';

const MIME_ZIP = 'application/zip';
const UTI_ZIP = 'public.zip-archive';

/**
 * Pantalla completa «Descargando expediente…» para el ZIP del expediente
 * (mismo ZIP con INDICE.csv que la web). Descarga directo a disco con
 * progreso real (bytes y %), se puede cancelar en cualquier momento, y al
 * terminar ofrece guardarlo en el teléfono o compartirlo. El ZIP temporal se
 * borra al cerrar. El servidor tarda unos segundos en armar el ZIP antes de
 * mandar el primer byte: esa espera se muestra como «Preparando…».
 */
export function DescargaExpedienteModal(props: DescargaExpedienteModalProps) {
  // Se monta de cero en cada apertura: estado limpio y descarga nueva.
  return props.visible ? <PantallaDescargaExpediente {...props} /> : null;
}

function PantallaDescargaExpediente({ path, colaborador, nombreArchivo, onClose }: DescargaExpedienteModalProps) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);
  const [fase, setFase] = useState<Fase>('preparando');
  const [bytes, setBytes] = useState<{ escritos: number; total: number }>({ escritos: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<'guardar' | 'compartir' | null>(null);
  const [intento, setIntento] = useState(0);
  const archivoRef = useRef<File | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const limpiar = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    borrarTemporal(archivoRef.current);
    archivoRef.current = null;
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;

    descargarArchivoPrivado(path, token, {
      extension: 'zip',
      accept: 'application/zip,application/octet-stream,*/*',
      signal: controller.signal,
      onProgreso: (escritos, total) => {
        if (controller.signal.aborted) return;
        setBytes({ escritos, total });
        if (escritos > 0) setFase('descargando');
      },
    })
      .then((archivo) => {
        if (controller.signal.aborted) {
          borrarTemporal(archivo);
          return;
        }
        archivoRef.current = archivo;
        setBytes({ escritos: archivo.size, total: archivo.size });
        setFase('listo');
        haptics.success();
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        logError('DescargaExpedienteModal', err);
        const status = statusDesdeErrorDescarga(err);
        if (status === 401) void logout();
        setError(mensajeErrorDescargaExpediente(status, esErrorDeRed(err)));
        setFase('error');
        haptics.error();
      });

    return () => {
      controller.abort();
    };
  }, [path, token, logout, intento]);

  // Al cerrar (desmontar) se cancela lo pendiente y se borra el ZIP temporal.
  useEffect(() => limpiar, [limpiar]);

  const reintentar = () => {
    setFase('preparando');
    setBytes({ escritos: 0, total: 0 });
    setError(null);
    setAviso(null);
    setIntento((n) => n + 1);
  };

  const cerrar = () => {
    limpiar();
    onClose();
  };

  const nombreFinal = nombreArchivoSeguro(nombreArchivo, 'zip');

  const accion = async (tipo: 'guardar' | 'compartir') => {
    const archivo = archivoRef.current;
    if (!archivo || ocupado) return;
    setOcupado(tipo);
    setAviso(null);
    setError(null);
    try {
      const datos = { uri: archivo.uri, nombre: nombreFinal, mime: MIME_ZIP, uti: UTI_ZIP, titulo: `Expediente de ${colaborador}` };
      const hecho = tipo === 'guardar' ? await guardarArchivoLocal(datos) : await compartirArchivoLocal(datos);
      if (hecho && tipo === 'guardar') setAviso('Listo: el expediente quedó guardado en la carpeta que elegiste.');
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : '';
      if (!/cancel/i.test(mensaje)) {
        logError(`DescargaExpedienteModal.${tipo}`, err);
        setError(mensajeErrorAccionLocal(err));
      }
    } finally {
      setOcupado(null);
    }
  };

  const porcentaje = porcentajeDescarga(bytes.escritos, bytes.total);
  const detalleBytes = progresoEnBytes(bytes.escritos, bytes.total > 0 ? bytes.total : null);

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={cerrar} statusBarTranslucent>
      <SafeAreaView style={styles.pantalla} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.cuerpo}>
          <View style={styles.tarjeta}>
            {fase === 'listo' ? (
              <View style={styles.centro}>
                <SuccessCheck size={84} />
              </View>
            ) : (
              <View style={[styles.icono, fase === 'error' ? styles.iconoError : null]}>
                <Ionicons name={fase === 'error' ? 'cloud-offline-outline' : 'archive-outline'} size={40} color={fase === 'error' ? Colors.danger : Colors.primaryDark} />
              </View>
            )}

            <View style={styles.textos}>
              <Text style={styles.titulo} accessibilityRole="header">
                {fase === 'listo' ? 'Expediente listo' : fase === 'error' ? 'No se pudo descargar' : 'Descargando expediente…'}
              </Text>
              <Text style={styles.subtitulo} numberOfLines={2}>
                {colaborador}
              </Text>
            </View>

            {fase === 'preparando' ? (
              <View style={styles.progreso} accessibilityLiveRegion="polite" accessibilityLabel="Preparando el expediente">
                <View style={styles.fila}>
                  <ActivityIndicator color={Colors.primary} />
                  <Text style={styles.progresoTexto}>Preparando el ZIP en el servidor…</Text>
                </View>
                <Text style={styles.ayuda}>Juntamos todos los documentos, su historial y el índice. Puede tardar unos segundos.</Text>
              </View>
            ) : null}

            {fase === 'descargando' ? (
              <View style={styles.progreso} accessibilityLiveRegion="polite" accessibilityLabel={`Descargando expediente ${porcentaje ?? ''}%`}>
                <View style={styles.fila}>
                  <Text style={styles.porcentaje}>{porcentaje !== null ? `${porcentaje}%` : '…'}</Text>
                  {detalleBytes ? <Text style={styles.bytes}>{detalleBytes}</Text> : null}
                </View>
                {porcentaje !== null ? <AnimatedProgressBar percent={porcentaje} height={10} /> : <ActivityIndicator color={Colors.primary} />}
                <Text style={styles.ayuda}>No cierres esta pantalla; puedes cancelar cuando quieras.</Text>
              </View>
            ) : null}

            {fase === 'listo' ? (
              <View style={styles.progreso}>
                <Text style={styles.ayudaCentro}>
                  {[nombreFinal, formatearTamano(bytes.total)].filter(Boolean).join(' · ')}
                </Text>
                <Text style={styles.ayudaCentro}>Incluye los documentos vigentes, el historial de versiones y un INDICE.csv.</Text>
              </View>
            ) : null}

            {error ? (
              <View style={styles.error} accessibilityRole="alert">
                <Ionicons name="alert-circle-outline" size={18} color={Colors.danger} />
                <Text style={styles.errorTexto}>{error}</Text>
              </View>
            ) : null}

            {aviso ? (
              <View style={styles.exito} accessibilityLiveRegion="polite">
                <Ionicons name="checkmark-circle-outline" size={18} color={Colors.success} />
                <Text style={styles.exitoTexto}>{aviso}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.acciones}>
          {fase === 'listo' ? (
            <>
              <Button
                title="Guardar en el teléfono"
                leftIcon="download-outline"
                onPress={() => void accion('guardar')}
                loading={ocupado === 'guardar'}
                disabled={ocupado !== null}
              />
              <Button
                title="Compartir…"
                variant="outline"
                leftIcon="share-outline"
                onPress={() => void accion('compartir')}
                loading={ocupado === 'compartir'}
                disabled={ocupado !== null}
              />
              <Button title="Cerrar" variant="ghost" onPress={cerrar} disabled={ocupado !== null} />
            </>
          ) : fase === 'error' ? (
            <>
              <Button title="Reintentar" leftIcon="refresh" onPress={reintentar} />
              <Button title="Cerrar" variant="ghost" onPress={cerrar} />
            </>
          ) : (
            <Button title="Cancelar descarga" variant="outline" leftIcon="close" onPress={cerrar} />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: Colors.background },
    cuerpo: { flex: 1, justifyContent: 'center', padding: Spacing.lg },
    tarjeta: {
      width: '100%',
      maxWidth: 520,
      alignSelf: 'center',
      gap: Spacing.lg,
      padding: Spacing.xl,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: Colors.border,
      backgroundColor: Colors.surface,
      ...Shadow.md,
    },
    centro: { alignItems: 'center' },
    icono: {
      alignSelf: 'center',
      width: 84,
      height: 84,
      borderRadius: Radius.full,
      backgroundColor: Colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconoError: { backgroundColor: Colors.dangerSoft },
    textos: { gap: Spacing.xs, alignItems: 'center' },
    titulo: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text, textAlign: 'center' },
    subtitulo: { fontSize: FontSize.md, color: Colors.textMuted, textAlign: 'center' },
    progreso: { gap: Spacing.sm },
    fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
    progresoTexto: { flex: 1, fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
    porcentaje: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.primaryDark },
    bytes: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textMuted },
    ayuda: { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 17 },
    ayudaCentro: { fontSize: FontSize.sm, color: Colors.textMuted, lineHeight: 19, textAlign: 'center' },
    error: {
      flexDirection: 'row',
      gap: Spacing.sm,
      alignItems: 'flex-start',
      padding: Spacing.md,
      borderRadius: Radius.md,
      backgroundColor: Colors.dangerSoft,
    },
    errorTexto: { flex: 1, fontSize: FontSize.sm, fontWeight: '600', color: Colors.danger, lineHeight: 19 },
    exito: {
      flexDirection: 'row',
      gap: Spacing.sm,
      alignItems: 'center',
      padding: Spacing.md,
      borderRadius: Radius.md,
      backgroundColor: Colors.successSoft,
    },
    exitoTexto: { flex: 1, fontSize: FontSize.sm, fontWeight: '600', color: Colors.success },
    acciones: {
      width: '100%',
      maxWidth: 520,
      alignSelf: 'center',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.lg,
    },
  });
