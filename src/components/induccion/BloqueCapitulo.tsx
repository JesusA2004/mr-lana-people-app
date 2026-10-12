import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import type { BloqueCapitulo } from '@/types/induccion';

import { MiniOrganigrama } from './MiniOrganigrama';

/**
 * Un bloque del contenido REAL de un capítulo (lo manda el backend desde
 * `InduccionMrLanaModuloSeeder`): la app no tiene el texto de la inducción
 * escrito a mano, solo sabe pintar cada tipo de bloque.
 */
export function BloqueCapituloView({ bloque }: { bloque: BloqueCapitulo }) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);

  switch (bloque.tipo) {
    case 'parrafo':
      return (
        <View style={styles.seccion}>
          {bloque.titulo ? <Text style={styles.subtitulo}>{bloque.titulo}</Text> : null}
          <Text style={styles.texto}>{bloque.texto}</Text>
        </View>
      );
    case 'destacado':
      return (
        <View style={styles.destacado}>
          <Ionicons name="sparkles-outline" size={18} color={Colors.warning} />
          <Text style={[styles.texto, styles.flex]}>{bloque.texto}</Text>
        </View>
      );
    case 'datos':
      return (
        <View style={styles.datos}>
          {bloque.items.map((item) => (
            <Card key={`${item.etiqueta}-${item.valor}`} style={styles.dato}>
              <Text style={styles.datoEtiqueta}>{item.etiqueta}</Text>
              <Text style={styles.datoValor}>{item.valor}</Text>
            </Card>
          ))}
        </View>
      );
    case 'lista':
      return (
        <View style={[styles.seccion, bloque.destacado && styles.listaDestacada]}>
          {bloque.titulo ? <Text style={styles.subtitulo}>{bloque.titulo}</Text> : null}
          {bloque.texto ? <Text style={styles.texto}>{bloque.texto}</Text> : null}
          {bloque.items.map((item) => (
            <View key={item} style={styles.itemLista}>
              <Text style={styles.vineta}>•</Text>
              <Text style={[styles.texto, styles.flex]}>{item}</Text>
            </View>
          ))}
        </View>
      );
    case 'tarjetas':
      return (
        <View style={styles.seccion}>
          {bloque.titulo ? <Text style={styles.subtitulo}>{bloque.titulo}</Text> : null}
          {bloque.items.map((item) => (
            <Card key={item.titulo} style={styles.tarjeta}>
              <Text style={styles.tarjetaTitulo}>{item.titulo}</Text>
              <Text style={styles.texto}>{item.texto}</Text>
              {item.nota ? <Text style={styles.nota}>{item.nota}</Text> : null}
            </Card>
          ))}
        </View>
      );
    case 'organigrama_dinamico':
      return <MiniOrganigrama vista={bloque.vista} titulo={bloque.titulo} nota={bloque.nota} />;
    case 'cierre':
      return (
        <View style={styles.cierre}>
          <Text style={styles.cierreTitulo}>{bloque.titulo}</Text>
          <Text style={styles.cierreTexto}>{bloque.texto}</Text>
        </View>
      );
  }
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    flex: { flex: 1 },
    seccion: { gap: Spacing.sm },
    subtitulo: { fontSize: FontSize.md, fontWeight: '800', color: Colors.primaryDark },
    texto: { fontSize: FontSize.md, color: Colors.text, lineHeight: 22 },
    nota: { fontSize: FontSize.sm, color: Colors.warning, lineHeight: 19 },
    destacado: {
      flexDirection: 'row',
      gap: Spacing.sm,
      padding: Spacing.md,
      borderRadius: Radius.md,
      backgroundColor: Colors.secondarySoft,
      borderLeftWidth: 3,
      borderLeftColor: Colors.secondary,
    },
    datos: { gap: Spacing.sm },
    dato: { gap: 2 },
    datoEtiqueta: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase' },
    datoValor: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
    listaDestacada: { padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.dangerSoft },
    itemLista: { flexDirection: 'row', gap: Spacing.sm },
    vineta: { fontSize: FontSize.md, color: Colors.secondary, lineHeight: 22 },
    tarjeta: { gap: Spacing.xs },
    tarjetaTitulo: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
    cierre: { gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.primary },
    cierreTitulo: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textInverse },
    cierreTexto: { fontSize: FontSize.md, color: Colors.textInverse, lineHeight: 22 },
  });
