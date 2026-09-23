import { Alert } from 'react-native';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Acciones irreversibles o que descartan algo (botón rojo en iOS). */
  destructive?: boolean;
}

/**
 * Confirmación estándar ANTES de cualquier acción sobre un documento o
 * trámite (solicitar cambio, generar, regenerar, importar, aplicar...).
 * Resuelve `true` solo si la persona tocó el botón de confirmar; cerrar el
 * diálogo (Android: tocar fuera / atrás) cuenta como cancelar.
 *
 * Las subidas de archivo no la usan: su hoja ya tiene paso de vista previa
 * con "Confirmar y subir". Los rechazos tampoco: el modal de motivo ya es
 * la confirmación.
 */
export function confirmAction({ title, message, confirmLabel, cancelLabel = 'Cancelar', destructive = false }: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (value: boolean) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: 'cancel', onPress: () => done(false) },
        { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => done(true) },
      ],
      { cancelable: true, onDismiss: () => done(false) },
    );
  });
}
