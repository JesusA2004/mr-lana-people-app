import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { PasoGuiaFila } from './PasoGuiaFila';

import { AnimatedProgressBar } from '@/components/AnimatedProgressBar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { PressableScale } from '@/components/PressableScale';
import { SkeletonBlock } from '@/components/SkeletonBlock';
import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import type { GuiaColaborador } from '@/types/guia';
import { isNotFoundError } from '@/utils/errors';
import { agruparPasos, textoResumenGuia } from '@/utils/guia';

/**
 * «Tu siguiente paso» arriba del Inicio: el paso que sigue con su botón, la
 * Inducción a la vista mientras esté en curso (nunca escondida en Perfil),
 * el avance por sección y si el autoservicio está en pausa. Datos y orden:
 * `GET colaborador/guia`.
 */
export function TarjetaSiguientePaso({
  guia,
  isLoading,
  error,
  onRetry,
}: {
  guia: GuiaColaborador | undefined;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const router = useRouter();

  if (isLoading) return <SkeletonBlock height={180} radius={Radius.lg} />;

  // Backend anterior sin la guía (404) o cuenta sin colaborador: no ocupa espacio.
  if (error && isNotFoundError(error)) return null;
  if (error || !guia) {
    return (
      <Card style={styles.card} onPress={onRetry}>
        <Text style={styles.titulo}>Tu siguiente paso</Text>
        <Text style={styles.texto}>No pudimos cargar tus pendientes. Toca para reintentar.</Text>
      </Card>
    );
  }

  const porcentaje = guia.resumen.total > 0 ? Math.round((guia.resumen.hechos / guia.resumen.total) * 100) : 100;
  const grupos = agruparPasos(guia.pasos).filter((g) => g.grupo !== 'induccion');
  const pasosInduccion = guia.pasos.filter((p) => p.grupo === 'induccion');
  const siguienteEsInduccion = guia.siguiente?.grupo === 'induccion';

  return (
    <Card style={styles.card}>
      <View style={styles.encabezado}>
        <View style={styles.icono}>
          <Ionicons name="footsteps-outline" size={18} color={Colors.primaryDark} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.titulo} accessibilityRole="header">
            Tu siguiente paso
          </Text>
          <Text style={styles.texto}>{textoResumenGuia(guia)}</Text>
        </View>
      </View>
      <AnimatedProgressBar percent={porcentaje} />

      {guia.bloqueo.bloqueado ? (
        <View style={styles.bloqueo}>
          <Ionicons name="lock-closed-outline" size={16} color={Colors.warning} />
          <Text style={styles.bloqueoTexto}>Mientras completas tu expediente, Solicitudes, Vacaciones y Préstamos quedan en pausa.</Text>
        </View>
      ) : null}

      {guia.siguiente ? (
        <View style={styles.siguiente}>
          <PasoGuiaFila paso={guia.siguiente} destacado />
        </View>
      ) : (
        <Text style={styles.texto}>No tienes nada por hacer ahora. Si Recursos Humanos revisa algo, te avisaremos.</Text>
      )}

      {/* Inducción: módulo visible mientras está en curso. */}
      {guia.induccion.activa && !siguienteEsInduccion ? (
        <PressableScale accessibilityRole="button" accessibilityLabel={`Inducción Mr. Lana, ${guia.induccion.porcentaje} por ciento`} onPress={() => router.push('/induccion')}>
          <View style={styles.induccion}>
            <Ionicons name="school-outline" size={22} color={Colors.primaryDark} />
            <View style={styles.flex}>
              <Text style={styles.grupoTitulo}>Inducción Mr. Lana</Text>
              <Text style={styles.texto}>
                {pasosInduccion.find((p) => p.estado !== 'hecho')?.descripcion ?? 'Continúa donde te quedaste.'}
              </Text>
            </View>
            <Text style={styles.porcentaje}>{guia.induccion.porcentaje} %</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </View>
        </PressableScale>
      ) : null}

      {grupos.length > 0 ? (
        <View style={styles.grupos}>
          {grupos.map((g) => (
            <View key={g.grupo} style={styles.grupo}>
              <Ionicons
                name={g.porHacer > 0 ? 'ellipse-outline' : 'checkmark-circle'}
                size={16}
                color={g.porHacer > 0 ? Colors.warning : Colors.success}
              />
              <Text style={styles.grupoTexto}>
                {g.titulo}
                {g.pasos.length > 1 ? ` · ${g.hechos} de ${g.pasos.length} listos` : g.porHacer > 0 ? ' · pendiente' : ' · listo'}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <Button title="Ver todos mis pasos" variant="ghost" rightIcon="list-outline" onPress={() => router.push('/siguiente-paso')} />
    </Card>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    card: { gap: Spacing.md },
    flex: { flex: 1, minWidth: 0 },
    encabezado: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    icono: {
      width: 32,
      height: 32,
      borderRadius: Radius.full,
      backgroundColor: Colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    titulo: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
    texto: { fontSize: FontSize.sm, color: Colors.textMuted, lineHeight: 19 },
    bloqueo: {
      flexDirection: 'row',
      gap: Spacing.sm,
      alignItems: 'flex-start',
      backgroundColor: Colors.warningSoft,
      borderRadius: Radius.md,
      padding: Spacing.md,
    },
    bloqueoTexto: { flex: 1, fontSize: FontSize.sm, color: Colors.text, lineHeight: 19 },
    siguiente: {
      borderWidth: 1,
      borderColor: Colors.border,
      borderRadius: Radius.md,
      padding: Spacing.md,
      backgroundColor: Colors.surface,
    },
    induccion: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      backgroundColor: Colors.primarySoft,
      borderRadius: Radius.md,
      padding: Spacing.md,
    },
    grupoTitulo: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
    porcentaje: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.primary },
    grupos: { gap: Spacing.xs },
    grupo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    grupoTexto: { flex: 1, fontSize: FontSize.sm, color: Colors.text },
  });
