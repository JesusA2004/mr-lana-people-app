import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyMessage, Notice, Screen, SectionTitle } from '@/components/ciclo/Screen';
import { PressableScale } from '@/components/PressableScale';
import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useMiProceso } from '@/hooks/queries/useCicloLaboral';
import { useContenidoEvaluacionInduccion, usePresentarEvaluacionInduccion } from '@/hooks/queries/useInduccion';
import { toast } from '@/store/toastStore';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import type { OpinionInduccion, RespuestasInduccion } from '@/types/induccion';
import { getActionErrorMessage, logError } from '@/utils/errors';
import { evaluacionCompleta, preguntasFaltantes } from '@/utils/induccion';

const LETRAS_OPCION = ['a', 'b', 'c', 'd', 'e', 'f'];

/**
 * Evaluación oficial de inducción (FO-RH-EI, 30 puntos). La app recibe solo
 * las preguntas: la clave de respuestas y la rúbrica nunca salen del
 * servidor. A/B/C las califica el backend al enviar; D (casos prácticos) la
 * califica RH. Solo se puede presentar cuando el backend lo habilita.
 */
export default function EvaluacionInduccionScreen() {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const proceso = useMiProceso();
  const evaluacion = proceso.data?.evaluacionInduccion ?? null;
  const puedePresentar = evaluacion?.puedePresentar === true;
  const contenido = useContenidoEvaluacionInduccion(puedePresentar);
  const presentar = usePresentarEvaluacionInduccion();

  const [respuestas, setRespuestas] = useState<RespuestasInduccion>({ a: {}, b: {}, c: {}, d: {} });
  const [opinion, setOpinion] = useState<OpinionInduccion>({});

  const completa = contenido.data ? evaluacionCompleta(contenido.data, respuestas) : false;
  const faltan = contenido.data ? preguntasFaltantes(contenido.data, respuestas) : 0;

  const enviar = async () => {
    if (!evaluacion || !completa || presentar.isPending) return;
    try {
      const opinionLimpia = Object.keys(opinion).length > 0 ? opinion : null;
      await presentar.mutateAsync({ evaluacionId: evaluacion.id, respuestas, opinion: opinionLimpia });
      toast.success('Evaluación enviada. Recursos Humanos revisará tus casos prácticos.');
      router.replace('/induccion');
    } catch (error) {
      logError('induccion.evaluacion', error);
      toast.error(getActionErrorMessage(error));
    }
  };

  const fijarA = (indice: number, opcion: number) => setRespuestas((prev) => ({ ...prev, a: { ...prev.a, [indice]: opcion } }));
  const fijarB = (indice: number, valor: boolean) => setRespuestas((prev) => ({ ...prev, b: { ...prev.b, [indice]: valor } }));
  const fijarC = (indice: number, letra: string) => setRespuestas((prev) => ({ ...prev, c: { ...prev.c, [indice]: letra } }));
  const fijarD = (clave: string, texto: string) => setRespuestas((prev) => ({ ...prev, d: { ...prev.d, [clave]: texto } }));
  const datos = contenido.data;
  const escala = datos
    ? Array.from({ length: Math.max(0, datos.seccionE.escalaMax - datos.seccionE.escalaMin + 1) }, (_, i) => datos.seccionE.escalaMin + i)
    : [];

  return (
    <Screen
      title="Evaluación de inducción"
      form
      isLoading={proceso.isLoading || (puedePresentar && contenido.isLoading)}
      error={proceso.error ?? contenido.error}
      onRetry={() => void contenido.refetch()}>
      {!puedePresentar ? (
        <EmptyMessage message="Tu evaluación todavía no está disponible. Termina la inducción o espera a que Recursos Humanos la habilite." />
      ) : !contenido.data ? null : (
        <>
          <Notice tone="info">
            Son {contenido.data.totalPuntos} puntos; apruebas con {contenido.data.calificacionAprobatoria}. Contesta todo con calma: tus respuestas se envían una sola vez.
          </Notice>

          <SectionTitle>A · Opción múltiple</SectionTitle>
          {contenido.data.seccionA.map((p, n) => (
            <Card key={`a-${p.indice}`} style={styles.pregunta}>
              <Text style={styles.preguntaTexto}>
                {n + 1}. {p.pregunta}
              </Text>
              {p.opciones.map((opcion, i) => {
                const elegida = respuestas.a[p.indice] === i;
                return (
                  <PressableScale
                    key={`a-${p.indice}-${i}`}
                    haptic={false}
                    accessibilityRole="button"
                    accessibilityLabel={`${opcion}${elegida ? ', elegida' : ''}`}
                    onPress={() => fijarA(p.indice, i)}
                    style={[styles.opcion, elegida && styles.opcionElegida]}>
                    <Ionicons name={elegida ? 'radio-button-on' : 'radio-button-off'} size={20} color={elegida ? Colors.primary : Colors.textMuted} />
                    <Text style={styles.opcionTexto}>
                      {LETRAS_OPCION[i] ?? i + 1}) {opcion}
                    </Text>
                  </PressableScale>
                );
              })}
            </Card>
          ))}

          <SectionTitle>B · Verdadero o falso</SectionTitle>
          {contenido.data.seccionB.map((p, n) => (
            <Card key={`b-${p.indice}`} style={styles.pregunta}>
              <Text style={styles.preguntaTexto}>
                {n + 1}. {p.afirmacion}
              </Text>
              <View style={styles.filaOpciones}>
                {[
                  { valor: true, etiqueta: 'Verdadero' },
                  { valor: false, etiqueta: 'Falso' },
                ].map(({ valor, etiqueta }) => {
                  const elegida = respuestas.b[p.indice] === valor;
                  return (
                    <PressableScale
                      key={etiqueta}
                      haptic={false}
                      accessibilityRole="button"
                      accessibilityLabel={`${etiqueta}${elegida ? ', elegida' : ''}`}
                      onPress={() => fijarB(p.indice, valor)}
                      style={[styles.opcion, styles.flex, elegida && styles.opcionElegida]}>
                      <Text style={[styles.opcionTexto, styles.centrado]}>{etiqueta}</Text>
                    </PressableScale>
                  );
                })}
              </View>
            </Card>
          ))}

          <SectionTitle>C · Relaciona columnas</SectionTitle>
          <Card style={styles.pregunta}>
            {contenido.data.seccionC.descripciones.map((d) => (
              <Text key={d.letra} style={styles.descripcion}>
                <Text style={styles.letra}>{d.letra}) </Text>
                {d.texto}
              </Text>
            ))}
          </Card>
          {contenido.data.seccionC.conceptos.map((p) => (
            <Card key={`c-${p.indice}`} style={styles.pregunta}>
              <Text style={styles.preguntaTexto}>{p.concepto}</Text>
              <View style={styles.filaOpciones}>
                {contenido.data?.seccionC.descripciones.map((d) => {
                  const elegida = respuestas.c[p.indice] === d.letra;
                  return (
                    <PressableScale
                      key={`${p.indice}-${d.letra}`}
                      haptic={false}
                      accessibilityRole="button"
                      accessibilityLabel={`${p.concepto}: opción ${d.letra}${elegida ? ', elegida' : ''}`}
                      onPress={() => fijarC(p.indice, d.letra)}
                      style={[styles.letraBoton, elegida && styles.opcionElegida]}>
                      <Text style={[styles.letra, elegida && styles.letraElegida]}>{d.letra}</Text>
                    </PressableScale>
                  );
                })}
              </View>
            </Card>
          ))}

          <SectionTitle>D · Casos prácticos</SectionTitle>
          {contenido.data.seccionD.map((caso, n) => (
            <Card key={caso.clave} style={styles.pregunta}>
              <Text style={styles.preguntaTexto}>
                Caso {n + 1} ({caso.puntosMax} {caso.puntosMax === 1 ? 'punto' : 'puntos'}). {caso.enunciado}
              </Text>
              <TextInput
                value={respuestas.d[caso.clave] ?? ''}
                onChangeText={(texto) => fijarD(caso.clave, texto)}
                placeholder="Escribe tu respuesta con tus propias palabras"
                placeholderTextColor={Colors.textMuted}
                multiline
                maxLength={2000}
                style={styles.textoLibre}
                accessibilityLabel={`Respuesta del caso ${n + 1}`}
              />
            </Card>
          ))}

          <SectionTitle>E · Tu opinión (no califica)</SectionTitle>
          {contenido.data.seccionE.aspectos.map((aspecto) => {
            const clave = aspecto.clave as keyof Omit<OpinionInduccion, 'tema_reforzar'>;
            return (
              <Card key={aspecto.clave} style={styles.pregunta}>
                <Text style={styles.preguntaTexto}>{aspecto.texto}</Text>
                <View style={styles.filaOpciones}>
                  {escala.map((valor) => {
                    const elegida = opinion[clave] === valor;
                    return (
                      <PressableScale
                        key={valor}
                        haptic={false}
                        accessibilityRole="button"
                        accessibilityLabel={`${valor} de ${contenido.data?.seccionE.escalaMax}${elegida ? ', elegida' : ''}`}
                        onPress={() => setOpinion((prev) => ({ ...prev, [clave]: valor }))}
                        style={[styles.letraBoton, elegida && styles.opcionElegida]}>
                        <Text style={[styles.letra, elegida && styles.letraElegida]}>{valor}</Text>
                      </PressableScale>
                    );
                  })}
                </View>
              </Card>
            );
          })}
          <Card style={styles.pregunta}>
            <Text style={styles.preguntaTexto}>¿Qué tema te gustaría reforzar?</Text>
            <TextInput
              value={opinion.tema_reforzar ?? ''}
              onChangeText={(texto) => setOpinion((prev) => ({ ...prev, tema_reforzar: texto }))}
              placeholder="Opcional"
              placeholderTextColor={Colors.textMuted}
              multiline
              maxLength={500}
              style={styles.textoLibre}
              accessibilityLabel="Tema que te gustaría reforzar"
            />
          </Card>

          {!completa ? (
            <Text style={styles.ayuda}>
              Te {faltan === 1 ? 'falta 1 respuesta' : `faltan ${faltan} respuestas`} de las secciones A a D.
            </Text>
          ) : null}
          <Button title="Enviar evaluación" leftIcon="send-outline" onPress={enviar} loading={presentar.isPending} disabled={!completa || presentar.isPending} />
        </>
      )}
    </Screen>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    flex: { flex: 1 },
    centrado: { textAlign: 'center' },
    pregunta: { gap: Spacing.sm },
    preguntaTexto: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, lineHeight: 21 },
    opcion: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      minHeight: 44,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: Colors.border,
      backgroundColor: Colors.surface,
    },
    opcionElegida: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
    opcionTexto: { flex: 1, fontSize: FontSize.md, color: Colors.text },
    filaOpciones: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    descripcion: { fontSize: FontSize.sm, color: Colors.text, lineHeight: 20 },
    letra: { fontSize: FontSize.md, fontWeight: '800', color: Colors.primaryDark },
    letraElegida: { color: Colors.primary },
    letraBoton: {
      width: 48,
      height: 48,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: Colors.border,
      backgroundColor: Colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textoLibre: {
      minHeight: 96,
      padding: Spacing.md,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: Colors.border,
      backgroundColor: Colors.surface,
      fontSize: FontSize.md,
      color: Colors.text,
      textAlignVertical: 'top',
    },
    ayuda: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center' },
  });
