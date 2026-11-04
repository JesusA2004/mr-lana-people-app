import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Pill } from '@/components/ui';
import { coloresTono } from '@/components/ui/tonos';
import { FontSize, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import type { PasoGuia } from '@/types/guia';
import { iconoDeEstado, rutaDePaso, tonoDeEstado } from '@/utils/guia';

/**
 * Un paso de «Tu siguiente paso»: estado (ícono + texto, nunca solo color),
 * qué falta en lista legible, el motivo de RH si lo rechazó y el botón que
 * lleva a la pantalla exacta. Todo el texto viene del backend.
 */
export function PasoGuiaFila({ paso, destacado = false, compacto = false }: { paso: PasoGuia; destacado?: boolean; compacto?: boolean }) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const tono = tonoDeEstado(paso.estado);
  const colores = coloresTono(Colors, tono);
  const accionable = (paso.estado === 'pendiente' || paso.estado === 'rechazado') && paso.accion !== null;

  return (
    <View style={styles.fila} accessible={compacto} accessibilityLabel={`${paso.titulo}. ${paso.estadoEtiqueta}`}>
      <Ionicons name={iconoDeEstado(paso.estado)} size={22} color={colores.texto} />
      <View style={styles.texto}>
        <View style={styles.encabezado}>
          <Text style={[styles.titulo, paso.estado === 'hecho' && styles.tituloHecho]}>{paso.titulo}</Text>
          {compacto ? null : <Pill texto={paso.estadoEtiqueta} tono={tono} />}
        </View>
        {paso.descripcion && !compacto ? <Text style={styles.descripcion}>{paso.descripcion}</Text> : null}
        {paso.motivo ? <Text style={styles.motivo}>Motivo de Recursos Humanos: {paso.motivo}</Text> : null}
        {paso.detalle.length > 0 && !compacto ? (
          <View style={styles.lista}>
            {paso.detalle.map((linea) => (
              <View key={linea} style={styles.item}>
                <Text style={styles.vineta}>•</Text>
                <Text style={styles.itemTexto}>{linea}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {accionable && paso.accion && !compacto ? (
          <Button
            title={paso.accion.etiqueta}
            variant={destacado ? 'primary' : 'outline'}
            rightIcon="arrow-forward"
            fullWidth={destacado}
            style={styles.boton}
            onPress={() => {
              if (paso.accion) router.push(rutaDePaso(paso.accion));
            }}
          />
        ) : null}
      </View>
    </View>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    fila: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
    texto: { flex: 1, minWidth: 0, gap: Spacing.xs },
    encabezado: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
    titulo: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, flexShrink: 1 },
    tituloHecho: { color: Colors.textMuted },
    descripcion: { fontSize: FontSize.sm, color: Colors.textMuted, lineHeight: 19 },
    motivo: { fontSize: FontSize.sm, color: Colors.danger, fontWeight: '600', lineHeight: 19 },
    lista: { gap: 2, marginTop: 2 },
    item: { flexDirection: 'row', gap: Spacing.xs },
    vineta: { fontSize: FontSize.sm, color: Colors.textMuted },
    itemTexto: { flex: 1, fontSize: FontSize.sm, color: Colors.text, lineHeight: 19 },
    boton: { alignSelf: 'flex-start', marginTop: Spacing.sm },
  });
