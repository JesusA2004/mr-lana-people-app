import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { useCallback, useState } from 'react';

import type { LocalUploadFile } from '@/api/upload';
import { toast } from '@/store/toastStore';
import { logError } from '@/utils/errors';
import { prepararFotoExpediente, validarAssetFoto } from '@/utils/fotoExpediente';

export type OrigenFoto = 'camera' | 'gallery';

/** Explicación previa al diálogo del sistema (PermissionPrimerSheet `message`). */
export const MENSAJE_PERMISO_FOTO: Record<OrigenFoto, string> = {
  camera: 'La usamos para tomar tu fotografía para expediente (tu foto de perfil) y fotografiar tus documentos. Nunca se comparte fuera de la app.',
  gallery: 'La usamos solo para elegir tu fotografía para expediente o la imagen de un documento. Nunca accedemos a nada más de tu galería.',
};

export const TEXTO_PERMISO_DENEGADO: Record<OrigenFoto, string> = {
  camera: 'No diste permiso para usar la cámara. Actívalo en Ajustes o elige una foto de tu galería.',
  gallery: 'No diste permiso para ver tus fotos. Actívalo en Ajustes o toma la foto con la cámara.',
};

const OPCIONES: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  // Recorte cuadrado (1:1) con el editor nativo; la compresión final la hace
  // `prepararFotoExpediente` (1024 px, JPEG 0.8).
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.9,
};

/**
 * Elegir/tomar la foto de perfil (= fotografía para expediente): permisos
 * con explicación previa (y Ajustes si ya se negó), cámara frontal o
 * galería, recorte 1:1, validación y redimensión a 1024 px. Lo comparten
 * `ProfilePhotoSheet` (perfil) y el paso «foto» del registro: una sola
 * lógica, dos pantallas.
 */
export function useSeleccionFoto() {
  const [archivo, setArchivo] = useState<LocalUploadFile | null>(null);
  const [origen, setOrigen] = useState<OrigenFoto | null>(null);
  const [preparando, setPreparando] = useState(false);
  const [primer, setPrimer] = useState<{ kind: OrigenFoto; blocked: boolean } | null>(null);
  const [denegado, setDenegado] = useState<OrigenFoto | null>(null);

  const lanzar = useCallback(async (kind: OrigenFoto) => {
    try {
      const resultado =
        kind === 'camera'
          ? await ImagePicker.launchCameraAsync({ ...OPCIONES, cameraType: ImagePicker.CameraType.front })
          : await ImagePicker.launchImageLibraryAsync(OPCIONES);
      if (resultado.canceled || !resultado.assets?.[0]) return;
      const validado = validarAssetFoto(resultado.assets[0]);
      if ('error' in validado) {
        toast.error(validado.error);
        return;
      }
      setPreparando(true);
      const listo = await prepararFotoExpediente(validado.archivo);
      setArchivo(listo);
      setOrigen(kind);
    } catch (error) {
      logError('useSeleccionFoto.lanzar', error);
      toast.error(kind === 'camera' ? 'No pudimos abrir la cámara. Intenta de nuevo.' : 'No pudimos abrir tu galería. Intenta de nuevo.');
    } finally {
      setPreparando(false);
    }
  }, []);

  /** Toca «Tomar foto» / «Elegir de galería»: con permiso abre directo; sin él, explica primero. */
  const elegir = useCallback(
    async (kind: OrigenFoto) => {
      const actual = kind === 'camera' ? await ImagePicker.getCameraPermissionsAsync() : await ImagePicker.getMediaLibraryPermissionsAsync();
      if (actual.granted) {
        setDenegado(null);
        await lanzar(kind);
        return;
      }
      setPrimer({ kind, blocked: actual.status === 'denied' && !actual.canAskAgain });
    },
    [lanzar],
  );

  /** «Permitir acceso» en la explicación previa → diálogo del sistema. */
  const confirmarPermiso = useCallback(async () => {
    if (!primer) return;
    const kind = primer.kind;
    setPrimer(null);
    const resultado = kind === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (resultado.granted) {
      setDenegado(null);
      await lanzar(kind);
      return;
    }
    // Negado: se explica en pantalla (con botón a Ajustes) y la otra opción sigue disponible.
    setDenegado(kind);
    if (!resultado.canAskAgain) setPrimer({ kind, blocked: true });
  }, [primer, lanzar]);

  const cerrarPrimer = useCallback(() => setPrimer(null), []);

  /** «Repetir»: vuelve a abrir el mismo origen. */
  const repetir = useCallback(() => {
    if (origen) void elegir(origen);
  }, [origen, elegir]);

  /** «Cambiar» / tras subir: descarta la foto local. */
  const descartar = useCallback(() => {
    setArchivo(null);
    setOrigen(null);
  }, []);

  const abrirAjustes = useCallback(() => {
    void Linking.openSettings();
  }, []);

  return { archivo, origen, preparando, primer, denegado, elegir, confirmarPermiso, cerrarPrimer, repetir, descartar, abrirAjustes };
}

export type SeleccionFoto = ReturnType<typeof useSeleccionFoto>;
