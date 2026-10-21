import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { coloresTono, Pill, type Tono } from '@/components/ui';
import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import type { Correccion } from '@/types/correcciones';
import { formatFechaHoraFlujo } from '@/utils/flujoAprobacion';
import { estadoCorreccionVisual, pasosCorreccion, type EstadoPasoCorreccion } from '@/utils/correcciones';

const TONO_PASO: Record<EstadoPasoCorreccion, Tono> = {
  hecho: 'exito',
  actual: 'info',
  accion: 'aviso',
  pendiente: 'neutral',
  rechazado: 'peligro',
  cancelado: 'neutral',
};

const ICONO_PASO: Record<EstadoPasoCorreccion, keyof typeof Ionicons.glyphMap> = {
  hecho: 'checkmark',
  actual: 'time',
  accion: 'alert',
  pendiente: 'ellipse-outline',
  rechazado: 'close',
  cancelado: 'remove',
};

/** Barra de 3 pasos de la corrección: Enviada → En revisión → Resuelta. */
export function PasosCorreccion({ estado, testID }: { estado: Correccion['estado']; testID?: string }) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const pasos = pasosCorreccion(estado);
  return (
    <View style={styles.pasos} testID={testID} accessibilityRole="progressbar" accessibilityLabel={pasos.map((p) => p.etiqueta).join(', ')}>
      {pasos.map((paso, index) => {
        const c = coloresTono(Colors, TONO_PASO[paso.estado]);
        const relleno = paso.estado === 'hecho' || paso.estado === 'rechazado';
        return (
          <View key={paso.clave} style={styles.paso}>
            <View style={styles.pasoLinea}>
              <View style={[styles.barra, index === 0 && styles.invisible, { backgroundColor: paso.estado === 'pendiente' ? Colors.border : c.texto }]} />
              <View style={[styles.punto, relleno ? { backgroundColor: c.texto } : { backgroundColor: c.fondo, borderColor: c.texto, borderWidth: 1.5 }]}>
                <Ionicons name={ICONO_PASO[paso.estado]} size={13} color={relleno ? Colors.white : c.texto} />
              </View>
              <View
                style={[
                  styles.barra,
                  index === pasos.length - 1 && styles.invisible,
                  { backgroundColor: pasos[index + 1] && pasos[index + 1]!.estado !== 'pendiente' ? coloresTono(Colors, TONO_PASO[pasos[index + 1]!.estado]).texto : Colors.border },
                ]}
              />
            </View>
            <Text style={[styles.pasoTexto, paso.estado === 'pendiente' && { color: Colors.textMuted }]} numberOfLines={2}>
              {paso.etiqueta}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/**
 * Tarjeta de estado de una corrección: chip con ícono, barra de 3 pasos,
 * qué significa el estado, comentario de RH, campos pedidos (etiquetas,
 * nunca valores), quién resolvió e historial.
 */
export function CorreccionResumen({ correccion, mostrarHistorial = true }: { correccion: Correccion; mostrarHistorial?: boolean }) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const visual = estadoCorreccionVisual(correccion.estado);

  return (
    <>
      <Card style={styles.tarjeta}>
        <View style={styles.encabezado}>
          <Text style={styles.titulo} accessibilityRole="header">
            {correccion.titulo}
          </Text>
          <Pill texto={correccion.estado_etiqueta || visual.texto} tono={visual.tono} icono={visual.icono} />
        </View>
        {correccion.folio ? <Text style={styles.meta}>Folio {correccion.folio}</Text> : null}
        <PasosCorreccion estado={correccion.estado} />
        {correccion.estado_descripcion ? <Text style={styles.descripcion}>{correccion.estado_descripcion}</Text> : null}
        {correccion.campos.length > 0 ? <Text style={styles.meta}>Datos: {correccion.campos.join(', ')}</Text> : null}
        {correccion.resuelta_por ? (
          <Text style={styles.meta}>
            Resuelta por {correccion.resuelta_por}
            {correccion.resuelta_en ? ` el ${formatFechaHoraFlujo(correccion.resuelta_en)}` : ''}
          </Text>
        ) : null}
      </Card>

      {correccion.comentario_rh ? (
        <View style={[styles.comentario, { backgroundColor: coloresTono(Colors, visual.tono === 'exito' ? 'exito' : visual.tono === 'peligro' ? 'peligro' : 'aviso').fondo }]}>
          <View style={styles.comentarioEncabezado}>
            <Ionicons name="chatbox-ellipses-outline" size={18} color={Colors.text} />
            <Text style={styles.comentarioTitulo}>Comentario de Recursos Humanos</Text>
          </View>
          <Text style={styles.descripcion}>{correccion.comentario_rh}</Text>
        </View>
      ) : null}

      {mostrarHistorial && correccion.historial.length > 0 ? (
        <Card style={styles.tarjeta}>
          <Text style={styles.seccion} accessibilityRole="header">
            Historial
          </Text>
          {correccion.historial.map((entrada, index) => (
            <View key={`${entrada.accion}-${entrada.en ?? index}`} style={[styles.historial, index === correccion.historial.length - 1 && styles.historialUltimo]}>
              <Text style={styles.historialAccion}>{entrada.etiqueta}</Text>
              <Text style={styles.meta}>
                {[entrada.por ? `${entrada.por}${entrada.es_rh ? ' (RH)' : ''}` : null, formatFechaHoraFlujo(entrada.en), entrada.origen_etiqueta].filter(Boolean).join(' · ')}
              </Text>
              {entrada.comentario ? <Text style={styles.descripcion}>{entrada.comentario}</Text> : null}
            </View>
          ))}
        </Card>
      ) : null}
    </>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    tarjeta: {
      gap: Spacing.sm,
    },
    encabezado: {
      gap: Spacing.sm,
    },
    titulo: {
      fontSize: FontSize.lg,
      fontWeight: '800',
      color: Colors.text,
    },
    meta: {
      fontSize: FontSize.xs,
      color: Colors.textMuted,
    },
    descripcion: {
      fontSize: FontSize.sm,
      color: Colors.text,
      lineHeight: 20,
    },
    pasos: {
      flexDirection: 'row',
      marginVertical: Spacing.sm,
    },
    paso: {
      flex: 1,
      alignItems: 'center',
      gap: Spacing.xs,
    },
    pasoLinea: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
    },
    barra: {
      flex: 1,
      height: 3,
      borderRadius: Radius.full,
    },
    invisible: {
      opacity: 0,
    },
    punto: {
      width: 28,
      height: 28,
      borderRadius: Radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pasoTexto: {
      fontSize: FontSize.xs,
      fontWeight: '700',
      color: Colors.text,
      textAlign: 'center',
    },
    comentario: {
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      gap: Spacing.xs,
    },
    comentarioEncabezado: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    comentarioTitulo: {
      fontSize: FontSize.sm,
      fontWeight: '800',
      color: Colors.text,
    },
    seccion: {
      fontSize: FontSize.xs,
      fontWeight: '800',
      color: Colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    historial: {
      gap: 2,
      paddingBottom: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: Colors.divider,
    },
    historialUltimo: {
      borderBottomWidth: 0,
      paddingBottom: 0,
    },
    historialAccion: {
      fontSize: FontSize.sm,
      fontWeight: '700',
      color: Colors.text,
    },
  });
