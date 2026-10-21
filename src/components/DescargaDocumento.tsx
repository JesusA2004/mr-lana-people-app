import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { AnimatedProgressBar } from './AnimatedProgressBar';
import { BarraAccionInferior } from './BarraAccionInferior';
import { Button } from './Button';

import { FontSize, Radius, Shadow, Spacing, type ColorPalette } from '@/constants/colors';
import { useDescargaDocumento, type ArchivoLocal } from '@/hooks/useDescargaDocumento';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import { etiquetaDescarga, formatearTamano, tipoLegible } from '@/utils/descargaDocumento';
import type { SniffedFileType } from '@/utils/fileSniff';

export interface DescargaDocumentoProps {
  /** Nombre visible del documento («Contrato individual de trabajo»). */
  titulo: string;
  /** Ruta RELATIVA de la API que sirve el archivo (Bearer). Ignorada si llega `archivoLocal`. */
  path?: string | null;
  /** Archivo ya descargado por el visor: no se vuelve a bajar. */
  archivoLocal?: ArchivoLocal | null;
  /** Tipo esperado antes de descargar (para el texto del botón); default PDF. */
  tipoEsperado?: SniffedFileType;
  /** Tamaño conocido de antemano (bytes), si la API lo manda. */
  tamanoConocido?: number | null;
  /** Por qué se muestra (p. ej. «No se pudo mostrar la vista previa en este teléfono.»). */
  motivo?: string;
  /** `pantalla`: centrado a pantalla completa (visor sin vista previa). `tarjeta`: bloque dentro de un detalle. */
  variante?: 'pantalla' | 'tarjeta';
  style?: StyleProp<ViewStyle>;
}

/**
 * Tarjeta/pantalla REUTILIZABLE de descarga de documentos (PDF y demás):
 * nombre, tipo, tamaño, botón grande «Descargar PDF», «Abrir con…»,
 * indicador de descarga con progreso y error legible en español.
 *
 * La descarga siempre es autenticada con el Bearer de la sesión contra una
 * ruta de la API (nunca una URL pública del NAS) y se guarda en la caché
 * privada de la app; las copias temporales se borran al terminar.
 *
 * Úsala SOLO donde el backend ya autorizó la descarga del documento
 * (`puede_descargar` / `allowDownload`). Ejemplos:
 *
 * ```tsx
 * // Detalle con ruta de API (descarga al tocar):
 * <DescargaDocumento titulo="Recibo de nómina 15/10/2026" path={`/colaborador/recibos/${id}/pdf`} variante="tarjeta" />
 * // Visor que ya tiene el archivo en disco y no pudo previsualizarlo:
 * <DescargaDocumento titulo={title} archivoLocal={{ uri, tipo: 'pdf', tamano }} motivo="No se pudo mostrar la vista previa." />
 * ```
 */
export function DescargaDocumento({
  titulo,
  path,
  archivoLocal,
  tipoEsperado = 'pdf',
  tamanoConocido,
  motivo,
  variante = 'tarjeta',
  style,
}: DescargaDocumentoProps) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const descarga = useDescargaDocumento({ path, archivoLocal, titulo });
  const tipo = descarga.archivo?.tipo ?? tipoEsperado;
  const tamano = formatearTamano(descarga.archivo?.tamano ?? tamanoConocido);
  const descargando = descarga.estado === 'descargando';
  const icono = tipo === 'png' || tipo === 'jpeg' ? 'image-outline' : tipo === 'pdf' ? 'document-text-outline' : 'document-outline';

  return (
    <View style={[variante === 'pantalla' ? styles.pantalla : null, style]}>
      <View style={styles.tarjeta}>
        {motivo ? (
          <View style={styles.motivo}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.info} />
            <Text style={styles.motivoTexto}>{motivo}</Text>
          </View>
        ) : null}

        <View style={styles.encabezado}>
          <View style={styles.icono}>
            <Ionicons name={icono} size={28} color={Colors.primaryDark} />
          </View>
          <View style={styles.datos}>
            <Text style={styles.nombre} numberOfLines={3} accessibilityRole="header">
              {titulo}
            </Text>
            <Text style={styles.meta}>{[tipoLegible(tipo), tamano].filter(Boolean).join(' · ')}</Text>
          </View>
        </View>

        {descargando ? (
          <View style={styles.progreso} accessibilityLiveRegion="polite" accessibilityLabel="Descargando documento">
            <View style={styles.progresoFila}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.progresoTexto}>Descargando documento…</Text>
              {descarga.progreso !== null ? <Text style={styles.progresoPorcentaje}>{descarga.progreso}%</Text> : null}
            </View>
            {descarga.progreso !== null ? <AnimatedProgressBar percent={descarga.progreso} height={8} /> : null}
          </View>
        ) : null}

        {descarga.error ? (
          <View style={styles.error} accessibilityRole="alert">
            <Ionicons name="alert-circle-outline" size={18} color={Colors.danger} />
            <Text style={styles.errorTexto}>{descarga.error}</Text>
          </View>
        ) : null}

        {descarga.aviso ? (
          <View style={styles.exito} accessibilityLiveRegion="polite">
            <Ionicons name="checkmark-circle-outline" size={18} color={Colors.success} />
            <Text style={styles.exitoTexto}>{descarga.aviso}</Text>
          </View>
        ) : null}

        <View style={styles.acciones}>
          <Button
            title={descarga.estado === 'error' ? 'Reintentar descarga' : etiquetaDescarga(tipo)}
            leftIcon={descarga.estado === 'error' ? 'refresh' : 'download-outline'}
            onPress={() => (descarga.estado === 'error' ? descarga.reintentar() : descarga.guardar())}
            loading={descarga.ocupado === 'guardar'}
            disabled={descarga.ocupado !== null}
          />
          <Button
            title="Abrir con…"
            variant="outline"
            leftIcon="open-outline"
            onPress={() => descarga.abrirCon()}
            loading={descarga.ocupado === 'abrir'}
            disabled={descarga.ocupado !== null}
          />
        </View>
      </View>
    </View>
  );
}

/**
 * Acciones de descarga como BARRA INFERIOR (respeta el safe area) para los
 * visores que SÍ pudieron previsualizar el documento: «Descargar PDF» y
 * «Abrir con…» siempre a la mano, sin tapar el documento.
 */
export function BarraDescargaDocumento({ titulo, archivoLocal }: { titulo: string; archivoLocal: ArchivoLocal }) {
  const descarga = useDescargaDocumento({ archivoLocal, titulo });
  return (
    <BarraAccionInferior fila sobreTeclado={false} nota={descarga.error ?? descarga.aviso ?? undefined}>
      <Button
        title={etiquetaDescarga(archivoLocal.tipo)}
        leftIcon="download-outline"
        onPress={() => descarga.guardar()}
        loading={descarga.ocupado === 'guardar'}
        disabled={descarga.ocupado !== null}
        fullWidth={false}
        style={{ flex: 1 }}
      />
      <Button
        title="Abrir con…"
        variant="outline"
        leftIcon="open-outline"
        onPress={() => descarga.abrirCon()}
        loading={descarga.ocupado === 'abrir'}
        disabled={descarga.ocupado !== null}
        fullWidth={false}
        style={{ flex: 1 }}
      />
    </BarraAccionInferior>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    pantalla: {
      flex: 1,
      justifyContent: 'center',
      padding: Spacing.lg,
      backgroundColor: Colors.background,
    },
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
    motivo: {
      flexDirection: 'row',
      gap: Spacing.sm,
      alignItems: 'flex-start',
      padding: Spacing.md,
      borderRadius: Radius.md,
      backgroundColor: Colors.infoSoft,
    },
    motivoTexto: { flex: 1, fontSize: FontSize.sm, color: Colors.text, lineHeight: 19 },
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
    progreso: { gap: Spacing.sm },
    progresoFila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    progresoTexto: { flex: 1, fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
    progresoPorcentaje: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.primaryDark },
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
    acciones: { gap: Spacing.sm },
  });
