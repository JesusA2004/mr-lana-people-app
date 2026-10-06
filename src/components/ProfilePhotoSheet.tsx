import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AnimatedProgressBar } from './AnimatedProgressBar';
import { Button } from './Button';
import { PermissionPrimerSheet, type PermissionPrimerKind } from './PermissionPrimerSheet';
import { PressableScale } from './PressableScale';

import type { LocalUploadFile } from '@/api/upload';
import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useSubirFotoPerfil } from '@/hooks/queries/useFotoPerfil';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import type { FotoPerfilEstado } from '@/types/collaborator';
import { getErrorMessage, logError } from '@/utils/errors';
import { haptics } from '@/utils/haptics';

/** Límite del backend (SubirFotoRequest: 8 MB). La app recorta y comprime antes. */
const MAX_MB = 8;

export interface ProfilePhotoSheetProps {
  visible: boolean;
  onClose: () => void;
  estado: FotoPerfilEstado | null | undefined;
}

type Paso = 'elegir' | 'vista_previa';

/**
 * Foto de perfil desde la app:
 *  - Sin foto oficial → «Agregar foto de perfil»: queda oficial al instante.
 *  - Con foto oficial → «Solicitar cambio de foto»: la nueva queda pendiente
 *    de RH y la actual se sigue viendo hasta que la aprueben.
 *  - Con un cambio pendiente no se puede mandar otro.
 * Cámara o galería, con recorte cuadrado (editor nativo), compresión y
 * vista previa antes de subir. El backend vuelve a validar el MIME real.
 */
export function ProfilePhotoSheet({ visible, onClose, estado }: ProfilePhotoSheetProps) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const subir = useSubirFotoPerfil();
  const [paso, setPaso] = useState<Paso>('elegir');
  const [archivo, setArchivo] = useState<LocalUploadFile | null>(null);
  const [progreso, setProgreso] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [primer, setPrimer] = useState<{ kind: PermissionPrimerKind; blocked: boolean } | null>(null);

  const requiereRevision = estado ? !estado.puede_subir_directo : false;
  const pendiente = estado?.estado === 'cambio_pendiente';
  const titulo = requiereRevision ? 'Solicitar cambio de foto' : 'Agregar foto de perfil';

  const reiniciar = () => {
    setPaso('elegir');
    setArchivo(null);
    setProgreso(0);
    setError(null);
  };

  const cerrar = () => {
    if (subir.isPending) return;
    reiniciar();
    onClose();
  };

  const opciones: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    // Recorte cuadrado para avatar con el editor nativo; JPEG comprimido.
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  };

  const usarResultado = (resultado: ImagePicker.ImagePickerResult) => {
    if (resultado.canceled || !resultado.assets[0]) return;
    const asset = resultado.assets[0];

    if (asset.fileSize && asset.fileSize > MAX_MB * 1024 * 1024) {
      toast.error(`La foto supera ${MAX_MB} MB. Elige otra.`);
      return;
    }

    const mime = asset.mimeType ?? 'image/jpeg';

    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(mime)) {
      toast.error('La foto debe ser JPG, PNG o WEBP.');
      return;
    }

    setArchivo({ uri: asset.uri, name: asset.fileName ?? `foto-perfil.${mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg'}`, mimeType: mime });
    setError(null);
    setPaso('vista_previa');
  };

  const lanzar = async (kind: 'camera' | 'gallery') => {
    usarResultado(kind === 'camera' ? await ImagePicker.launchCameraAsync({ ...opciones, cameraType: ImagePicker.CameraType.front }) : await ImagePicker.launchImageLibraryAsync(opciones));
  };

  const pedir = async (kind: 'camera' | 'gallery') => {
    const actual = kind === 'camera' ? await ImagePicker.getCameraPermissionsAsync() : await ImagePicker.getMediaLibraryPermissionsAsync();
    if (actual.granted) {
      await lanzar(kind);
      return;
    }
    setPrimer({ kind, blocked: actual.status === 'denied' && !actual.canAskAgain });
  };

  const confirmarPermiso = async () => {
    if (!primer) return;
    const kind = primer.kind === 'camera' ? 'camera' : 'gallery';
    setPrimer(null);
    const resultado = kind === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (resultado.granted) await lanzar(kind);
    else if (!resultado.canAskAgain) setPrimer({ kind, blocked: true });
  };

  const enviar = async () => {
    if (!archivo) return;
    setError(null);
    setProgreso(0);
    try {
      const respuesta = await subir.mutateAsync({ file: archivo, onProgress: setProgreso });
      haptics.success();
      toast.success(respuesta.message);
      reiniciar();
      onClose();
    } catch (e) {
      logError('ProfilePhotoSheet.enviar', e);
      haptics.error();
      setError(getErrorMessage(e));
      setProgreso(0);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={cerrar}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{titulo}</Text>
          <PressableScale accessibilityLabel="Cerrar" onPress={cerrar} haptic={false} disabled={subir.isPending} style={styles.closeButton}>
            <Ionicons name="close" size={22} color={Colors.text} />
          </PressableScale>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {pendiente ? (
            <View style={styles.aviso}>
              {estado?.pendiente?.foto_url ? <AvisoFoto uri={estado.pendiente.foto_url} /> : null}
              <Text style={styles.avisoTexto}>Ya enviaste una foto nueva y está esperando la aprobación de RH. Tu foto actual se conserva mientras tanto.</Text>
              <Button title="Entendido" onPress={cerrar} />
            </View>
          ) : paso === 'elegir' ? (
            <>
              <Text style={styles.helper}>
                {requiereRevision
                  ? 'Tu foto nueva la revisa RH. Mientras tanto se sigue mostrando la actual.'
                  : 'Usa una foto formal de trabajo: de frente, rostro descubierto, fondo claro y buena luz.'}
              </Text>
              {estado?.ultimo_cambio?.estado === 'rechazado' ? (
                <View style={styles.rechazo}>
                  <Ionicons name="alert-circle-outline" size={16} color={Colors.warning} />
                  <Text style={styles.rechazoTexto}>
                    RH no aprobó tu último cambio{estado.ultimo_cambio.motivo_rechazo ? `: ${estado.ultimo_cambio.motivo_rechazo}` : '.'}
                  </Text>
                </View>
              ) : null}
              <Opcion icon="camera-outline" label="Tomar foto" onPress={() => void pedir('camera')} />
              <Opcion icon="image-outline" label="Elegir de galería" onPress={() => void pedir('gallery')} />
              <Button title="Cancelar" variant="ghost" onPress={cerrar} />
            </>
          ) : archivo ? (
            <>
              <Text style={styles.helper}>Así se verá tu foto. Si no te convence, elige otra.</Text>
              <View style={styles.previewWrap}>
                <Image source={{ uri: archivo.uri }} style={styles.preview} accessibilityLabel="Vista previa de la foto" />
              </View>
              {subir.isPending ? (
                <View style={{ gap: Spacing.xs }}>
                  <Text style={styles.helper}>Subiendo foto… {progreso}%</Text>
                  <AnimatedProgressBar percent={progreso} height={8} />
                </View>
              ) : null}
              {error ? (
                <View style={styles.rechazo}>
                  <Ionicons name="alert-circle-outline" size={16} color={Colors.danger} />
                  <Text style={[styles.rechazoTexto, { color: Colors.danger }]}>{error}</Text>
                </View>
              ) : null}
              <View style={styles.acciones}>
                <Button title="Elegir otra" variant="outline" onPress={reiniciar} disabled={subir.isPending} style={{ flex: 1 }} />
                <Button
                  title={requiereRevision ? 'Enviar a RH' : 'Usar esta foto'}
                  onPress={() => void enviar()}
                  loading={subir.isPending}
                  disabled={subir.isPending}
                  style={{ flex: 1 }}
                />
              </View>
            </>
          ) : null}
        </ScrollView>
      </View>

      <PermissionPrimerSheet
        visible={Boolean(primer)}
        kind={primer?.kind ?? 'camera'}
        blocked={primer?.blocked ?? false}
        onClose={() => setPrimer(null)}
        onConfirm={() => void confirmarPermiso()}
      />
    </Modal>
  );
}

function AvisoFoto({ uri }: { uri: string }) {
  const styles = useEstilos(crearEstilos);
  // Propuesta servida con el Bearer token (ruta /colaborador/foto/propuesta).
  return <ProposalImage uri={uri} style={styles.propuesta} />;
}

function ProposalImage({ uri, style }: { uri: string; style: object }) {
  const token = useAuthStore((s) => s.token);
  return <Image source={{ uri, headers: token ? { Authorization: `Bearer ${token}` } : undefined }} style={style} accessibilityLabel="Foto propuesta" />;
}

function Opcion({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  return (
    <PressableScale onPress={onPress} style={styles.opcion} accessibilityRole="button" accessibilityLabel={label}>
      <View style={styles.opcionIcono}>
        <Ionicons name={icon} size={20} color={Colors.primaryDark} />
      </View>
      <Text style={styles.opcionTexto}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </PressableScale>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: Spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
    },
    headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, flex: 1 },
    closeButton: { padding: Spacing.xs },
    content: { padding: Spacing.lg, gap: Spacing.md },
    helper: { fontSize: FontSize.sm, color: Colors.textMuted },
    opcion: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      padding: Spacing.md,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: Colors.border,
      backgroundColor: Colors.surface,
    },
    opcionIcono: {
      width: 36,
      height: 36,
      borderRadius: Radius.md,
      backgroundColor: Colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    opcionTexto: { flex: 1, fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
    previewWrap: { alignItems: 'center' },
    preview: { width: 220, height: 220, borderRadius: 110, backgroundColor: Colors.surfaceMuted },
    acciones: { flexDirection: 'row', gap: Spacing.sm },
    aviso: { gap: Spacing.md, alignItems: 'center' },
    avisoTexto: { fontSize: FontSize.md, color: Colors.text, textAlign: 'center' },
    propuesta: { width: 140, height: 140, borderRadius: 70, backgroundColor: Colors.surfaceMuted },
    rechazo: {
      flexDirection: 'row',
      gap: Spacing.xs,
      alignItems: 'flex-start',
      padding: Spacing.sm,
      borderRadius: Radius.md,
      backgroundColor: Colors.surfaceMuted,
    },
    rechazoTexto: { flex: 1, fontSize: FontSize.sm, color: Colors.text },
  });
