import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { AnimatedProgressBar } from '@/components/AnimatedProgressBar';
import { Button } from '@/components/Button';
import { PermissionPrimerSheet } from '@/components/PermissionPrimerSheet';
import { PressableScale } from '@/components/PressableScale';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useSubirFotoPerfil } from '@/hooks/queries/useFotoPerfil';
import { MENSAJE_PERMISO_FOTO, TEXTO_PERMISO_DENEGADO, useSeleccionFoto, type OrigenFoto } from '@/hooks/useSeleccionFoto';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import type { FotoRegistro } from '@/types/registro';
import { logError } from '@/utils/errors';
import { mensajeErrorSubidaFoto } from '@/utils/fotoExpediente';
import { haptics } from '@/utils/haptics';

export interface PasoFotoExpedienteProps {
  foto: FotoRegistro | null | undefined;
  nombre?: string;
  /** Ya se subió: el padre refresca `GET colaborador/registro` y ofrece el siguiente paso. */
  onSubida: () => Promise<void> | void;
}

const RECOMENDACIONES = ['De frente y con el rostro descubierto (sin gorra ni lentes oscuros)', 'Fondo claro y buena luz', 'Foto formal, sin filtros ni stickers'];

/**
 * Paso «Fotografía para expediente» del registro (docs/FOTO_EXPEDIENTE.md):
 * es la misma foto de perfil. Tomar (cámara frontal) o elegir de galería →
 * recorte 1:1 → vista previa → «Usar esta foto» (sube con barra de
 * progreso; reintenta sola 2 veces ante fallas de red/5xx y, si aun así
 * falla, «Reintentar» con el motivo). Con el registro abierto
 * (`puede_reemplazar`) se cambia directo, sin revisión de RH.
 */
export function PasoFotoExpediente({ foto, nombre, onSubida }: PasoFotoExpedienteProps) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const seleccion = useSeleccionFoto();
  const subir = useSubirFotoPerfil();
  const [progreso, setProgreso] = useState(0);
  const [reintento, setReintento] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [cambiando, setCambiando] = useState(false);
  const { archivo, primer, denegado } = seleccion;
  const subiendo = subir.isPending;
  const completa = Boolean(foto?.completo);
  const puedeReemplazar = foto?.puede_reemplazar !== false;

  const enviar = async () => {
    if (!archivo) return;
    setError(null);
    setProgreso(0);
    setReintento(0);
    try {
      await subir.mutateAsync({ file: archivo, onProgress: setProgreso, onReintento: setReintento });
      haptics.success();
      seleccion.descartar();
      setCambiando(false);
      await onSubida();
    } catch (e) {
      logError('PasoFotoExpediente.enviar', e);
      haptics.error();
      setError(mensajeErrorSubidaFoto(e));
    }
  };

  const cambiar = () => {
    haptics.selection();
    setError(null);
    seleccion.descartar();
  };

  const elegir = (origen: OrigenFoto) => {
    setError(null);
    void seleccion.elegir(origen);
  };

  const mostrarOpciones = !archivo && (!completa || cambiando);

  return (
    <View style={styles.contenedor}>
      <View style={styles.recomendaciones}>
        <Text style={styles.recomendacionesTitulo}>Será tu foto de perfil. Tómala así:</Text>
        {RECOMENDACIONES.map((texto) => (
          <View key={texto} style={styles.recomendacion}>
            <Ionicons name="checkmark-circle-outline" size={18} color={Colors.primaryDark} />
            <Text style={styles.recomendacionTexto}>{texto}</Text>
          </View>
        ))}
      </View>

      {foto?.cubre_documento ? (
        <View style={styles.nota}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.primaryDark} />
          <Text style={styles.notaTexto}>{`Con esta foto ya no necesitas subir «${foto.cubre_documento.nombre}».`}</Text>
        </View>
      ) : null}

      {archivo ? (
        <View style={styles.previa}>
          <Image source={{ uri: archivo.uri }} style={styles.previaImagen} accessibilityLabel="Vista previa de tu fotografía" />
          <Text style={styles.ayuda}>Así se verá tu foto. Revisa que tu rostro se vea completo y nítido.</Text>
          {subiendo ? (
            <View style={styles.progreso} accessibilityLiveRegion="polite">
              <Text style={styles.ayuda}>{reintento > 0 ? `Reintentando (${reintento} de 2)… ${progreso}%` : `Subiendo tu foto… ${progreso}%`}</Text>
              <AnimatedProgressBar percent={progreso} height={8} />
            </View>
          ) : null}
          {error ? (
            <View style={styles.error} accessibilityLiveRegion="assertive">
              <Ionicons name="alert-circle-outline" size={18} color={Colors.danger} />
              <Text style={styles.errorTexto}>{error}</Text>
            </View>
          ) : null}
          {error ? (
            <Button key="reintentar" title="Reintentar" leftIcon="refresh-outline" onPress={() => void enviar()} loading={subiendo} disabled={subiendo} />
          ) : (
            <Button key="usar" title="Usar esta foto" leftIcon="cloud-upload-outline" onPress={() => void enviar()} loading={subiendo} disabled={subiendo} />
          )}
          <View style={styles.fila}>
            <Button title="Repetir" variant="outline" leftIcon="camera-reverse-outline" onPress={seleccion.repetir} disabled={subiendo} style={styles.flex} />
            <Button title="Cambiar" variant="outline" leftIcon="swap-horizontal-outline" onPress={cambiar} disabled={subiendo} style={styles.flex} />
          </View>
        </View>
      ) : completa && !cambiando ? (
        <View style={styles.previa}>
          <ProfileAvatar name={nombre} fotoUrlApi={foto?.url} size={168} />
          <View style={styles.listo}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <Text style={styles.listoTexto}>Tu fotografía para expediente quedó guardada.</Text>
          </View>
          {foto?.pendiente_revision ? <Text style={styles.ayuda}>Recursos Humanos la revisará.</Text> : null}
          {puedeReemplazar ? <Button title="Cambiar foto" variant="outline" leftIcon="camera-outline" onPress={() => setCambiando(true)} /> : null}
        </View>
      ) : null}

      {mostrarOpciones ? (
        <>
          <View style={styles.fila}>
            <Opcion icono="camera-outline" titulo="Tomar foto" detalle="Cámara frontal" onPress={() => elegir('camera')} deshabilitado={seleccion.preparando} />
            <Opcion icono="images-outline" titulo="Elegir de galería" detalle="Una foto que ya tengas" onPress={() => elegir('gallery')} deshabilitado={seleccion.preparando} />
          </View>
          {seleccion.preparando ? <Text style={styles.ayuda}>Preparando tu foto…</Text> : null}
          {denegado ? (
            <View style={styles.permiso}>
              <View style={styles.permisoFila}>
                <Ionicons name="lock-closed-outline" size={18} color={Colors.warning} />
                <Text style={styles.permisoTexto}>{TEXTO_PERMISO_DENEGADO[denegado]}</Text>
              </View>
              <Button title="Abrir Ajustes" variant="outline" leftIcon="settings-outline" onPress={seleccion.abrirAjustes} />
            </View>
          ) : null}
          {cambiando ? <Button title="Conservar mi foto actual" variant="ghost" onPress={() => setCambiando(false)} /> : null}
        </>
      ) : null}

      <PermissionPrimerSheet
        visible={Boolean(primer)}
        kind={primer?.kind ?? 'camera'}
        blocked={primer?.blocked ?? false}
        message={MENSAJE_PERMISO_FOTO[primer?.kind ?? 'camera']}
        onClose={seleccion.cerrarPrimer}
        onConfirm={() => void seleccion.confirmarPermiso()}
      />
    </View>
  );
}

function Opcion({ icono, titulo, detalle, onPress, deshabilitado }: { icono: keyof typeof Ionicons.glyphMap; titulo: string; detalle: string; onPress: () => void; deshabilitado?: boolean }) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  return (
    <PressableScale onPress={onPress} disabled={deshabilitado} accessibilityRole="button" accessibilityLabel={titulo} style={[styles.opcion, styles.flex]}>
      <View style={styles.opcionIcono}>
        <Ionicons name={icono} size={30} color={Colors.primaryDark} />
      </View>
      <Text style={styles.opcionTitulo}>{titulo}</Text>
      <Text style={styles.opcionDetalle}>{detalle}</Text>
    </PressableScale>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    contenedor: { gap: Spacing.lg },
    recomendaciones: { gap: Spacing.xs, backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md },
    recomendacionesTitulo: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text, marginBottom: Spacing.xs },
    recomendacion: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
    recomendacionTexto: { flex: 1, fontSize: FontSize.sm, color: Colors.text, lineHeight: 19 },
    nota: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start', backgroundColor: Colors.secondarySoft, borderRadius: Radius.md, padding: Spacing.md },
    notaTexto: { flex: 1, fontSize: FontSize.sm, color: Colors.text, lineHeight: 19 },
    fila: { flexDirection: 'row', gap: Spacing.md },
    flex: { flex: 1 },
    opcion: {
      alignItems: 'center',
      gap: Spacing.xs,
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing.sm,
      minHeight: 132,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: Colors.border,
      backgroundColor: Colors.surface,
    },
    opcionIcono: { width: 56, height: 56, borderRadius: Radius.full, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    opcionTitulo: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, textAlign: 'center' },
    opcionDetalle: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center' },
    previa: { alignItems: 'center', gap: Spacing.md },
    previaImagen: { width: 200, height: 200, borderRadius: 100, backgroundColor: Colors.surfaceMuted },
    progreso: { alignSelf: 'stretch', gap: Spacing.xs },
    ayuda: { fontSize: FontSize.sm, color: Colors.textMuted, lineHeight: 19, textAlign: 'center' },
    error: { alignSelf: 'stretch', flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start', backgroundColor: Colors.dangerSoft, borderRadius: Radius.md, padding: Spacing.md },
    errorTexto: { flex: 1, fontSize: FontSize.sm, color: Colors.danger, fontWeight: '600', lineHeight: 19 },
    listo: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', backgroundColor: Colors.successSoft, borderRadius: Radius.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
    listoTexto: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '600' },
    permiso: { gap: Spacing.sm, backgroundColor: Colors.warningSoft, borderRadius: Radius.md, padding: Spacing.md },
    permisoFila: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
    permisoTexto: { flex: 1, fontSize: FontSize.sm, color: Colors.text, lineHeight: 19 },
  });
