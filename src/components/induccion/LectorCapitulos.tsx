import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AnimatedProgressBar } from '@/components/AnimatedProgressBar';
import { Button } from '@/components/Button';
import { PressableScale } from '@/components/PressableScale';
import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useEstilos } from '@/theme/ThemeProvider';
import type { CapituloInduccion } from '@/types/induccion';

import { BloqueCapituloView } from './BloqueCapitulo';

export interface LectorCapitulosProps {
  capitulos: CapituloInduccion[];
  indiceInicial: number;
  /** Claves ya vistas según el servidor (para marcar los chips). */
  vistos: Set<string>;
  /**
   * Se llama al avanzar o terminar con la clave del capítulo actual. En modo
   * colaborador registra el progreso en el SERVIDOR; en presentación no hace
   * nada (se omite). Si rechaza, el lector no avanza.
   */
  onCapituloVisto?: (clave: string) => Promise<unknown>;
  onTerminar: () => void;
  textoTerminar: string;
  ocupado?: boolean;
  scrollRef?: React.RefObject<ScrollView | null>;
}

/**
 * Lector de los 7 capítulos de la Inducción Mr. Lana: chips de capítulos,
 * barra de avance, bloques del contenido real y navegación Anterior/
 * Siguiente con botones de ≥ 44 pt.
 */
export function LectorCapitulos({
  capitulos,
  indiceInicial,
  vistos,
  onCapituloVisto,
  onTerminar,
  textoTerminar,
  ocupado = false,
  scrollRef,
}: LectorCapitulosProps) {
  const styles = useEstilos(crearEstilos);
  const [indice, setIndice] = useState(Math.min(Math.max(indiceInicial, 0), Math.max(capitulos.length - 1, 0)));
  // Vistos = los del servidor + los marcados en esta sesión (sin copiar la
  // prop a estado: cuando el servidor responde, la prop ya los incluye).
  const [agregados, setAgregados] = useState<Set<string>>(() => new Set());
  const vistosLocal = useMemo(() => new Set([...vistos, ...agregados]), [vistos, agregados]);

  const capitulo = capitulos[indice];
  const esUltimo = indice >= capitulos.length - 1;
  const porcentaje = capitulos.length > 0 ? Math.round((vistosLocal.size / capitulos.length) * 100) : 0;

  const irA = (nuevo: number) => {
    setIndice(nuevo);
    scrollRef?.current?.scrollTo({ y: 0, animated: true });
  };

  const avanzar = async () => {
    if (!capitulo) return;
    if (onCapituloVisto) {
      try {
        await onCapituloVisto(capitulo.clave);
      } catch {
        return; // El llamador ya avisó del error; no se avanza sin guardar.
      }
    }
    setAgregados((prev) => new Set(prev).add(capitulo.clave));
    if (esUltimo) {
      onTerminar();
    } else {
      irA(indice + 1);
    }
  };

  if (!capitulo) {
    return <Text style={styles.texto}>La inducción todavía no tiene contenido cargado.</Text>;
  }

  return (
    <View style={styles.contenedor}>
      <View style={styles.avance}>
        <Text style={styles.avanceTexto}>
          Capítulo {indice + 1} de {capitulos.length}
        </Text>
        <AnimatedProgressBar percent={porcentaje} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {capitulos.map((c, i) => (
          <PressableScale
            key={c.clave}
            haptic={false}
            accessibilityRole="button"
            accessibilityLabel={`Capítulo ${c.numero || i + 1}: ${c.titulo}${vistosLocal.has(c.clave) ? ', visto' : ''}`}
            onPress={() => irA(i)}
            style={[styles.chip, i === indice && styles.chipActivo, vistosLocal.has(c.clave) && i !== indice && styles.chipVisto]}>
            <Text style={[styles.chipTexto, i === indice && styles.chipTextoActivo]}>
              {vistosLocal.has(c.clave) ? '✓ ' : ''}
              {c.numero || i + 1}. {c.titulo}
            </Text>
          </PressableScale>
        ))}
      </ScrollView>

      <View style={styles.encabezado}>
        <Text style={styles.numero}>{String(capitulo.numero || indice + 1).padStart(2, '0')}</Text>
        <View style={styles.flex}>
          <Text style={styles.titulo}>{capitulo.titulo}</Text>
          {capitulo.subtitulo ? <Text style={styles.subtitulo}>{capitulo.subtitulo}</Text> : null}
        </View>
      </View>

      {capitulo.bloques.map((bloque, i) => (
        <BloqueCapituloView key={`${capitulo.clave}-${i}`} bloque={bloque} />
      ))}

      <View style={styles.navegacion}>
        <Button title="Anterior" variant="outline" leftIcon="arrow-back" fullWidth={false} disabled={indice === 0 || ocupado} onPress={() => irA(indice - 1)} style={styles.flex} />
        <Button
          title={esUltimo ? textoTerminar : 'Siguiente'}
          rightIcon={esUltimo ? 'checkmark-circle-outline' : 'arrow-forward'}
          fullWidth={false}
          loading={ocupado}
          disabled={ocupado}
          onPress={avanzar}
          style={styles.flex}
        />
      </View>
    </View>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    flex: { flex: 1 },
    contenedor: { gap: Spacing.lg },
    texto: { fontSize: FontSize.md, color: Colors.textMuted },
    avance: { gap: Spacing.xs },
    avanceTexto: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textMuted },
    chips: { gap: Spacing.sm, paddingVertical: Spacing.xs },
    chip: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: Colors.border,
      backgroundColor: Colors.surface,
    },
    chipActivo: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
    chipVisto: { borderColor: Colors.successSoft },
    chipTexto: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '600' },
    chipTextoActivo: { color: Colors.primaryDark },
    encabezado: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    numero: { fontSize: FontSize.xxxl, fontWeight: '300', color: Colors.secondary },
    titulo: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
    subtitulo: { fontSize: FontSize.sm, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
    navegacion: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  });
