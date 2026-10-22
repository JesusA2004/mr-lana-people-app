import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AnimatedProgressBar } from './AnimatedProgressBar';
import { PressableScale } from './PressableScale';
import { StatusBadge } from './StatusBadge';

import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useDescargaDocumento } from '@/hooks/useDescargaDocumento';
import { toast } from '@/store/toastStore';
import { useColores, useEstilos } from '@/theme/ThemeProvider';

export interface FilaDocumentoExpedienteProps {
  nombre: string;
  obligatorio?: boolean;
  estado: string;
  motivoRechazo?: string | null;
  /** Abre el detalle (revisar/aprobar). Sin archivo entregado = no navegable. */
  onPress?: () => void;
  /** Ruta de la API para «Descargar»; null = el backend no lo autoriza (botón oculto). */
  pathDescarga?: string | null;
  /** Nombre sugerido al guardar («INE - Ana López»). */
  tituloDescarga: string;
}

/**
 * Fila de un documento del expediente con «Descargar» propio (uno por uno):
 * progreso dentro de la misma fila y, al terminar, el selector de carpeta
 * (Android) o el sheet de «Guardar en Archivos» (iOS). El botón solo existe
 * si el backend mandó `puede_descargar`.
 */
export function FilaDocumentoExpediente({ nombre, obligatorio, estado, motivoRechazo, onPress, pathDescarga, tituloDescarga }: FilaDocumentoExpedienteProps) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const descarga = useDescargaDocumento({ path: pathDescarga ?? null, titulo: tituloDescarga });
  const descargando = descarga.estado === 'descargando';
  const ocupado = descarga.ocupado !== null;

  useEffect(() => {
    if (descarga.aviso) toast.success(descarga.aviso);
  }, [descarga.aviso]);

  const contenido = (
    <>
      <View style={styles.fila}>
        <View style={styles.icono}>
          <Ionicons name="document-text-outline" size={20} color={Colors.primaryDark} />
        </View>
        <View style={styles.texto}>
          <Text style={styles.nombre} numberOfLines={2}>
            {nombre}
            {obligatorio ? <Text style={styles.obligatorio}> *</Text> : null}
          </Text>
          {motivoRechazo ? (
            <Text style={styles.motivo} numberOfLines={1}>
              {motivoRechazo}
            </Text>
          ) : null}
          <View style={styles.badge}>
            <StatusBadge status={estado} />
          </View>
        </View>
        {pathDescarga ? (
          <Pressable
            onPress={() => (descarga.estado === 'error' ? descarga.reintentar() : void descarga.guardar())}
            disabled={ocupado}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Descargar ${nombre}`}
            style={({ pressed }) => [styles.boton, pressed && styles.botonPresionado, ocupado && styles.botonOcupado]}>
            {ocupado ? (
              <ActivityIndicator size="small" color={Colors.primaryDark} />
            ) : (
              <Ionicons name={descarga.estado === 'error' ? 'refresh' : 'download-outline'} size={18} color={Colors.primaryDark} />
            )}
            <Text style={styles.botonTexto}>
              {descargando && descarga.progreso !== null ? `${descarga.progreso}%` : descarga.estado === 'error' ? 'Reintentar' : 'Descargar'}
            </Text>
          </Pressable>
        ) : onPress ? (
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        ) : null}
      </View>

      {descargando && descarga.progreso !== null ? <AnimatedProgressBar percent={descarga.progreso} height={4} /> : null}
      {descarga.error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {descarga.error}
        </Text>
      ) : null}
    </>
  );

  return onPress ? (
    <PressableScale style={styles.tarjeta} onPress={onPress} accessibilityLabel={`Abrir ${nombre}`}>
      {contenido}
    </PressableScale>
  ) : (
    <View style={[styles.tarjeta, styles.sinArchivo]}>{contenido}</View>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    tarjeta: {
      gap: Spacing.sm,
      backgroundColor: Colors.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: Colors.border,
      padding: Spacing.md,
    },
    sinArchivo: { backgroundColor: Colors.surfaceMuted },
    fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    icono: {
      width: 40,
      height: 40,
      borderRadius: Radius.md,
      backgroundColor: Colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    texto: { flex: 1, minWidth: 0, gap: 2 },
    nombre: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
    obligatorio: { color: Colors.danger },
    motivo: { fontSize: FontSize.xs, color: Colors.danger },
    badge: { flexDirection: 'row', marginTop: 2 },
    boton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      minHeight: 40,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: Colors.primary,
      backgroundColor: Colors.surface,
    },
    botonPresionado: { backgroundColor: Colors.primarySoft },
    botonOcupado: { opacity: 0.8 },
    botonTexto: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.primaryDark },
    error: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.danger },
  });
