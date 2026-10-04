import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { Card } from './Card';

import { FontSize, Spacing, type ColorPalette } from '@/constants/colors';
import { useEstilos } from '@/theme/ThemeProvider';
import type { Celebracion } from '@/types/celebracion';

export interface AniversarioHeroCardProps {
  celebracion: Celebracion;
}

/**
 * Aniversario laboral de hoy en Inicio — compacto, discreto (AGENTS.md
 * sección 72: "no confeti por toda la app"). Solo aparece si
 * `GET /celebraciones/activas` trae un `aniversario_laboral` visible hoy
 * (el propio o el de un compañero, según `BirthdayGreetingPolicy::view`).
 */
export function AniversarioHeroCard({ celebracion }: AniversarioHeroCardProps) {
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const primerNombre = celebracion.homenajeado.nombre.split(' ')[0];

  return (
    <Card style={styles.card} onPress={() => router.push(`/celebracion/${celebracion.id}` as never)}>
      <View style={styles.row}>
        <Text style={styles.emoji} accessibilityElementsHidden importantForAccessibility="no">
          🎉
        </Text>
        <View style={styles.textColumn}>
          <Text style={styles.title}>
            {celebracion.es_mia ? `Hoy cumples ${celebracion.anios} años con nosotros` : `Hoy celebramos a ${primerNombre}`}
          </Text>
          <Text style={styles.subtitle}>
            {celebracion.es_mia
              ? 'Gracias por ser parte de Mr. Lana.'
              : [celebracion.anios !== null ? `${celebracion.anios} años en Mr. Lana` : null, celebracion.homenajeado.sucursal]
                  .filter(Boolean)
                  .join(' · ')}
          </Text>
        </View>
      </View>
      <Button
        title="Ver celebración"
        variant="secondary"
        rightIcon="ribbon-outline"
        fullWidth={false}
        onPress={() => router.push(`/celebracion/${celebracion.id}` as never)}
        style={styles.cta}
      />
    </Card>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
  card: { backgroundColor: Colors.celebrationSoft, borderColor: Colors.celebrationSoft, gap: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  emoji: { fontSize: 32 },
  textColumn: { flex: 1, minWidth: 0 },
  title: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  cta: { alignSelf: 'flex-start' },
});
