import { StyleSheet, Text, View } from 'react-native';

import { AnimatedProgressBar } from '@/components/AnimatedProgressBar';
import { Card } from '@/components/Card';
import { EmptyMessage, Notice, Screen, SectionTitle } from '@/components/ciclo/Screen';
import { PasoGuiaFila } from '@/components/guia/PasoGuiaFila';
import { FontSize, Spacing, type ColorPalette } from '@/constants/colors';
import { useGuia } from '@/hooks/queries/useGuia';
import { useEstilos } from '@/theme/ThemeProvider';
import { agruparPasos, textoResumenGuia } from '@/utils/guia';

/**
 * «Tu siguiente paso» completo: todos los pasos del colaborador en el orden
 * del backend (datos → foto → documentos → inducción → firmas), cada uno con
 * su estado y botón a la pantalla exacta.
 */
export default function SiguientePasoScreen() {
  const styles = useEstilos(crearEstilos);
  const guia = useGuia();
  const data = guia.data;
  const grupos = data ? agruparPasos(data.pasos) : [];
  const porcentaje = data && data.resumen.total > 0 ? Math.round((data.resumen.hechos / data.resumen.total) * 100) : 100;

  return (
    <Screen
      title="Tu siguiente paso"
      isLoading={guia.isLoading}
      error={guia.error}
      hayDatos={data !== undefined}
      notFoundMessage="Tu cuenta todavía no tiene pasos por completar."
      onRetry={() => void guia.refetch()}
      refreshing={guia.isRefetching}
      onRefresh={() => void guia.refetch()}>
      {data ? (
        <>
          <Card style={styles.resumen}>
            <Text style={styles.resumenTexto}>{textoResumenGuia(data)}</Text>
            <AnimatedProgressBar percent={porcentaje} />
            <Text style={styles.nota}>
              {data.resumen.hechos} de {data.resumen.total} pasos listos
            </Text>
          </Card>

          {data.bloqueo.bloqueado ? (
            <Notice tone="warning">
              {data.bloqueo.mensaje ?? 'Completa tu expediente.'} Mientras tanto, Solicitudes, Vacaciones y Préstamos quedan en pausa. Lo que ya subiste y está en
              revisión no te detiene.
            </Notice>
          ) : null}

          {data.siguiente ? (
            <Card style={styles.bloque}>
              <SectionTitle>Sigue esto</SectionTitle>
              <PasoGuiaFila paso={data.siguiente} destacado />
            </Card>
          ) : null}

          {grupos.length === 0 ? <EmptyMessage message="No tienes pasos pendientes. ¡Todo listo!" /> : null}

          {grupos.map((grupo) => (
            <Card key={grupo.grupo} style={styles.bloque}>
              <View style={styles.grupoEncabezado}>
                <SectionTitle>{grupo.titulo}</SectionTitle>
                <Text style={styles.nota}>
                  {grupo.hechos} de {grupo.pasos.length} listos
                </Text>
              </View>
              {grupo.pasos.map((paso, index) => (
                <View key={paso.clave} style={index > 0 ? styles.separado : undefined}>
                  <PasoGuiaFila paso={paso} />
                </View>
              ))}
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    resumen: { gap: Spacing.sm },
    resumenTexto: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
    nota: { fontSize: FontSize.xs, color: Colors.textMuted },
    bloque: { gap: Spacing.md },
    grupoEncabezado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
    separado: { borderTopWidth: 1, borderTopColor: Colors.divider, paddingTop: Spacing.md },
  });
