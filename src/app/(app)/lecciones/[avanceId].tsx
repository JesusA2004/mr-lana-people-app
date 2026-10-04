import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyMessage, Notice, Screen, SectionTitle } from '@/components/ciclo/Screen';
import { PressableScale } from '@/components/PressableScale';
import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import { useMiProceso, usePresentarLeccion } from '@/hooks/queries/useCicloLaboral';
import { toast } from '@/store/toastStore';
import { getActionErrorMessage, logError } from '@/utils/errors';
import { formatoCalificacion, respuestasCompletas } from '@/utils/miProceso';

/**
 * Una lección de bienvenida: material + preguntas. La calificación, el
 * mínimo (8) y si pasa o pide refuerzo de RH los decide el backend
 * (`OnboardingService::presentarEvaluacion`); aquí solo se envían las
 * respuestas y se muestra el resultado.
 */
export default function LeccionScreen() {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const { avanceId } = useLocalSearchParams<{ avanceId: string }>();
  const query = useMiProceso();
  const presentar = usePresentarLeccion();
  const [respuestas, setRespuestas] = useState<Record<number, number>>({});
  const [resultado, setResultado] = useState<{ calificacion: number; aprobado: boolean } | null>(null);

  const leccion = query.data?.lecciones.find((l) => String(l.avanceId) === avanceId);

  const enviar = async () => {
    if (!leccion || presentar.isPending) return;
    try {
      const r = await presentar.mutateAsync({ avanceId: leccion.avanceId, respuestas });
      setResultado({ calificacion: r.calificacion, aprobado: r.aprobado });
      setRespuestas({});
      if (r.aprobado) toast.success('¡Lección aprobada!');
    } catch (error) {
      logError('lecciones.presentar', error);
      toast.error(getActionErrorMessage(error));
    }
  };

  return (
    <Screen
      title={leccion?.titulo ?? 'Lección'}
      isLoading={query.isLoading}
      error={query.error}
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}>
      {!leccion ? (
        <EmptyMessage message="Esta lección ya no está disponible. Puede que ya la hayas aprobado." />
      ) : (
        <>
          {resultado ? (
            <Notice tone={resultado.aprobado ? 'success' : 'warning'}>
              {resultado.aprobado
                ? `Aprobaste con ${formatoCalificacion(resultado.calificacion)}.`
                : `Obtuviste ${formatoCalificacion(resultado.calificacion)}. Recursos Humanos te dejará un comentario para que vuelvas a intentarlo.`}
            </Notice>
          ) : null}

          {leccion.retroalimentacion ? (
            <Notice tone="info">Comentario de Recursos Humanos: {leccion.retroalimentacion}</Notice>
          ) : null}

          <Card style={styles.material}>
            <SectionTitle>Material</SectionTitle>
            {leccion.descripcion ? <Text style={styles.texto}>{leccion.descripcion}</Text> : null}
            {leccion.contenido ? <Text style={styles.texto}>{leccion.contenido}</Text> : null}
            {leccion.contenidoUrl ? (
              <Button
                title="Abrir material"
                variant="outline"
                leftIcon="open-outline"
                fullWidth={false}
                onPress={() => {
                  if (leccion.contenidoUrl) void Linking.openURL(leccion.contenidoUrl);
                }}
              />
            ) : null}
            {!leccion.descripcion && !leccion.contenido && !leccion.contenidoUrl ? (
              <Text style={styles.texto}>Esta lección no tiene material adicional.</Text>
            ) : null}
          </Card>

          {leccion.estado === 'aprobada' ? (
            <Notice tone="success">Ya aprobaste esta lección ({formatoCalificacion(leccion.calificacion)}).</Notice>
          ) : leccion.estado === 'en_espera' ? (
            <Notice tone="info">Recursos Humanos revisará tu lección y te dejará un comentario antes de tu siguiente intento.</Notice>
          ) : leccion.puedePresentar && leccion.preguntas.length > 0 ? (
            <>
              <SectionTitle>Preguntas</SectionTitle>
              {leccion.preguntas.map((p, n) => (
                <Card key={p.indice} style={styles.pregunta}>
                  <Text style={styles.preguntaTexto}>
                    {n + 1}. {p.pregunta}
                  </Text>
                  {p.opciones.map((opcion, i) => {
                    const elegida = respuestas[p.indice] === i;
                    return (
                      <PressableScale
                        key={`${p.indice}-${i}`}
                        accessibilityLabel={`${opcion}${elegida ? ', elegida' : ''}`}
                        onPress={() => setRespuestas((prev) => ({ ...prev, [p.indice]: i }))}
                        style={[styles.opcion, elegida && styles.opcionElegida]}>
                        <Ionicons
                          name={elegida ? 'radio-button-on' : 'radio-button-off'}
                          size={20}
                          color={elegida ? Colors.primary : Colors.textMuted}
                        />
                        <Text style={styles.opcionTexto}>{opcion}</Text>
                      </PressableScale>
                    );
                  })}
                </Card>
              ))}
              <Button
                title="Enviar respuestas"
                onPress={() => void enviar()}
                loading={presentar.isPending}
                disabled={presentar.isPending || !respuestasCompletas(leccion.preguntas, respuestas)}
              />
              {!respuestasCompletas(leccion.preguntas, respuestas) ? (
                <Text style={styles.ayuda}>Contesta todas las preguntas para enviar.</Text>
              ) : null}
            </>
          ) : (
            <Notice tone="info">Esta lección todavía no tiene preguntas para responder.</Notice>
          )}

          <Button title="Volver a mis lecciones" variant="ghost" onPress={() => router.back()} />
        </>
      )}
    </Screen>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
  material: {
    gap: Spacing.sm,
  },
  texto: {
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 22,
  },
  pregunta: {
    gap: Spacing.sm,
  },
  preguntaTexto: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
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
  },
  opcionElegida: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
  },
  opcionTexto: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  ayuda: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
