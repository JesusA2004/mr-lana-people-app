import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { AnimatedProgressBar } from '@/components/AnimatedProgressBar';
import { Button } from '@/components/Button';
import { PressableScale } from '@/components/PressableScale';
import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import type { ResumenSolicitudRegistro } from '@/types/solicitudEmpleo';
import { NOTA_CROQUIS } from '@/utils/solicitudEmpleoWizard';

/**
 * Paso «Solicitud de empleo» del registro: avance global y por sección (del
 * bloque `solicitud_empleo` de GET registro). Cada sección abre el
 * sub-asistente; «Continuar» abre la primera incompleta.
 */
export function PasoSolicitudEmpleo({ resumen, onAbrir }: { resumen: ResumenSolicitudRegistro | null | undefined; onAbrir: (seccion: string | null) => void }) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);

  if (!resumen) {
    return <Text style={styles.ayuda}>Recursos Humanos no te pide este formato por ahora. Continúa al siguiente paso.</Text>;
  }

  const completas = resumen.secciones.filter((s) => s.completa).length;
  const empezada = resumen.secciones.some((s) => s.porcentaje > 0);

  return (
    <View style={styles.contenedor}>
      <View style={styles.resumen}>
        <View style={styles.resumenFila}>
          <Text style={styles.porcentaje}>{`${resumen.porcentaje}%`}</Text>
          <Text style={styles.resumenTexto}>
            {resumen.completo
              ? 'Tu solicitud de empleo y estudio socioeconómico están completos.'
              : `${completas} de ${resumen.secciones.length} secciones completas. Son pantallas cortas; tu avance se guarda en cada una.`}
          </Text>
        </View>
        <AnimatedProgressBar percent={resumen.porcentaje} height={6} color={resumen.completo ? Colors.success : Colors.primary} />
      </View>

      {!resumen.completo ? (
        <Button
          title={empezada ? 'Continuar donde me quedé' : 'Empezar'}
          rightIcon="chevron-forward"
          onPress={() => onAbrir(null)}
        />
      ) : null}

      <View style={styles.lista}>
        {resumen.secciones.map((s) => (
          <PressableScale
            key={s.clave}
            accessibilityLabel={`${s.titulo}: ${s.completa ? 'completa' : `${s.porcentaje}%, pendiente`}. Abrir`}
            onPress={() => onAbrir(s.clave)}
            style={styles.fila}>
            <Ionicons name={s.completa ? 'checkmark-circle' : s.porcentaje > 0 ? 'ellipse-outline' : 'radio-button-off'} size={22} color={s.completa ? Colors.success : Colors.warning} />
            <View style={styles.filaTextos}>
              <Text style={styles.filaTitulo}>{s.titulo}</Text>
              {!s.completa && s.faltantes.length > 0 ? (
                <Text style={styles.filaFalta} numberOfLines={2}>{`Falta: ${s.faltantes.join(', ')}`}</Text>
              ) : null}
            </View>
            <Text style={styles.filaAccion}>{s.completa ? 'Revisar' : `${s.porcentaje}%`}</Text>
          </PressableScale>
        ))}
      </View>

      <View style={styles.nota}>
        <Ionicons name="create-outline" size={16} color={Colors.textMuted} />
        <Text style={styles.ayuda}>{NOTA_CROQUIS}</Text>
      </View>
    </View>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    contenedor: { gap: Spacing.lg },
    ayuda: { flex: 1, fontSize: FontSize.sm, color: Colors.textMuted, lineHeight: 19 },
    resumen: { gap: Spacing.sm, backgroundColor: Colors.primarySoft, borderRadius: Radius.lg, padding: Spacing.md },
    resumenFila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    porcentaje: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.primaryDark },
    resumenTexto: { flex: 1, fontSize: FontSize.sm, color: Colors.text, lineHeight: 19 },
    lista: { gap: Spacing.sm },
    fila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      backgroundColor: Colors.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: Colors.border,
      padding: Spacing.md,
      minHeight: 56,
    },
    filaTextos: { flex: 1, gap: 2 },
    filaTitulo: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
    filaFalta: { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 17 },
    filaAccion: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primaryDark },
    nota: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  });
