import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AnimatedProgressBar } from '@/components/AnimatedProgressBar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyMessage, Notice, Screen, SectionTitle } from '@/components/ciclo/Screen';
import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useMiProceso } from '@/hooks/queries/useCicloLaboral';
import { useCapitulosInduccion } from '@/hooks/queries/useInduccion';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import { faseInduccion, fechaLegible, resultadoInduccion, textoProgreso, ultimoIntentoCalificado } from '@/utils/induccion';

/**
 * Inducción Mr. Lana: progreso por capítulos (guardado en el servidor),
 * acceso para retomar y estado de la evaluación oficial. TODO el estado
 * sale de `mi-proceso`; la app no decide si la evaluación está habilitada
 * ni califica nada.
 */
export default function InduccionScreen() {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const proceso = useMiProceso();
  const resumen = proceso.data?.induccion ?? null;
  const evaluacion = proceso.data?.evaluacionInduccion ?? null;
  const capitulos = useCapitulosInduccion(resumen?.avanceId ?? null);
  const fase = faseInduccion(resumen, evaluacion);
  const calificado = ultimoIntentoCalificado(evaluacion);
  const resultado = calificado ? resultadoInduccion(calificado) : null;
  const vistos = resumen?.capitulosVistos ?? 0;

  const refrescar = () => {
    void proceso.refetch();
    void capitulos.refetch();
  };

  return (
    <Screen
      title="Inducción Mr. Lana"
      isLoading={proceso.isLoading}
      error={proceso.error}
      onRetry={refrescar}
      refreshing={proceso.isRefetching}
      onRefresh={refrescar}>
      {fase === 'sin_induccion' || !resumen ? (
        <>
          <EmptyMessage message="Tu proceso de ingreso no incluye la inducción en este momento. Puedes repasarla cuando quieras." />
          <Button title="Ver la inducción" variant="outline" leftIcon="book-outline" onPress={() => router.push('/induccion/presentacion')} />
        </>
      ) : (
        <>
          <Card style={styles.hero}>
            <View style={styles.heroHeader}>
              <View style={styles.heroIcon}>
                <Ionicons name="school-outline" size={22} color={Colors.primaryDark} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.heroTitulo}>{resumen.titulo}</Text>
                <Text style={styles.heroTexto}>{textoProgreso(resumen)}</Text>
              </View>
              <Text style={styles.porcentaje}>{resumen.porcentaje} %</Text>
            </View>
            <AnimatedProgressBar percent={resumen.porcentaje} />
            <Text style={styles.estado}>{resumen.completado ? 'Contenido completado' : vistos === 0 ? 'Sin iniciar' : 'En curso'}</Text>
            <Button
              title={resumen.completado ? 'Repasar capítulos' : vistos === 0 ? 'Comenzar' : 'Continuar'}
              variant={resumen.completado ? 'outline' : 'primary'}
              rightIcon="arrow-forward"
              onPress={() => router.push('/induccion/capitulos')}
            />
          </Card>

          {fase === 'evaluacion_disponible' || fase === 'reevaluacion_disponible' ? (
            <Card style={styles.bloque}>
              <Text style={styles.bloqueTitulo}>{fase === 'reevaluacion_disponible' ? 'Nueva evaluación disponible' : 'Tu evaluación está lista'}</Text>
              {evaluacion?.retroalimentacion ? <Notice tone="info">Comentario de Recursos Humanos: {evaluacion.retroalimentacion}</Notice> : null}
              {fase === 'reevaluacion_disponible' && evaluacion?.fechaLimiteReevaluacion ? (
                <Text style={styles.heroTexto}>Fecha límite: {fechaLegible(evaluacion.fechaLimiteReevaluacion)}</Text>
              ) : null}
              <Button title="Realizar evaluación" leftIcon="create-outline" onPress={() => router.push('/induccion/evaluacion')} />
            </Card>
          ) : null}

          {fase === 'contenido' && resumen.completado ? (
            <Notice tone="info">Terminaste los capítulos. Tu evaluación se habilita en cuanto el sistema la active.</Notice>
          ) : null}
          {fase === 'contenido' && !resumen.completado ? (
            <Notice tone="info">Al terminar los {resumen.totalCapitulos} capítulos se habilita tu evaluación de inducción.</Notice>
          ) : null}

          {fase === 'pendiente_rh' ? (
            <Notice tone="info">Enviaste tu evaluación. Recursos Humanos revisa tus casos prácticos y te avisará tu resultado.</Notice>
          ) : null}

          {resultado ? (
            <Card style={styles.bloque}>
              <SectionTitle>Tu resultado</SectionTitle>
              <View style={styles.resultadoFila}>
                <Text style={styles.resultadoPuntos}>{resultado.puntos}</Text>
                <Text style={styles.resultadoPorcentaje}>{resultado.porcentaje}</Text>
              </View>
              <View style={[styles.etiqueta, resultado.tono === 'success' ? styles.etiquetaExito : styles.etiquetaAviso]}>
                <Text style={[styles.etiquetaTexto, resultado.tono === 'success' ? styles.etiquetaTextoExito : styles.etiquetaTextoAviso]}>
                  {resultado.etiqueta}
                </Text>
              </View>
              {resultado.mensaje ? <Text style={styles.heroTexto}>{resultado.mensaje}</Text> : null}
            </Card>
          ) : null}

          {fase === 'reforzamiento' ? (
            <Card style={styles.bloque}>
              <Text style={styles.bloqueTitulo}>Reforzamiento pendiente</Text>
              <Text style={styles.heroTexto}>
                Recursos Humanos te contactará para reforzar algunos temas. La nueva evaluación aparecerá aquí cuando la habiliten.
              </Text>
              {evaluacion?.fechaLimiteReevaluacion ? (
                <Text style={styles.heroTexto}>Fecha límite: {fechaLegible(evaluacion.fechaLimiteReevaluacion)}</Text>
              ) : null}
            </Card>
          ) : null}

          {capitulos.data?.capitulos.length ? (
            <>
              <SectionTitle>Capítulos</SectionTitle>
              {capitulos.data.capitulos.map((c, i) => {
                const visto = resumen.clavesVistas.length > 0 ? resumen.clavesVistas.includes(c.clave) : i < vistos;
                return (
                  <Card key={c.clave} style={styles.capitulo} onPress={() => router.push({ pathname: '/induccion/capitulos', params: { indice: String(i) } })}>
                    <Text style={styles.capituloNumero}>{c.numero || i + 1}</Text>
                    <Text style={[styles.flex, styles.capituloTitulo]}>{c.titulo}</Text>
                    <Ionicons name={visto ? 'checkmark-circle' : 'chevron-forward'} size={20} color={visto ? Colors.success : Colors.textMuted} />
                  </Card>
                );
              })}
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    flex: { flex: 1 },
    hero: { gap: Spacing.md },
    heroHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    heroIcon: {
      width: 44,
      height: 44,
      borderRadius: Radius.full,
      backgroundColor: Colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroTitulo: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
    heroTexto: { fontSize: FontSize.sm, color: Colors.textMuted, lineHeight: 19 },
    porcentaje: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.primary },
    estado: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primaryDark },
    bloque: { gap: Spacing.sm },
    bloqueTitulo: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
    resultadoFila: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.md },
    resultadoPuntos: { fontSize: FontSize.xxxl, fontWeight: '800', color: Colors.text },
    resultadoPorcentaje: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.textMuted },
    etiqueta: { alignSelf: 'flex-start', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full },
    etiquetaExito: { backgroundColor: Colors.successSoft },
    etiquetaAviso: { backgroundColor: Colors.warningSoft },
    etiquetaTexto: { fontSize: FontSize.sm, fontWeight: '800' },
    etiquetaTextoExito: { color: Colors.success },
    etiquetaTextoAviso: { color: Colors.warning },
    capitulo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 56 },
    capituloNumero: { width: 28, fontSize: FontSize.lg, fontWeight: '300', color: Colors.secondary, textAlign: 'center' },
    capituloTitulo: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  });
