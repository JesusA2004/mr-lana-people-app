import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { Card } from './Card';

import { Colors, FontSize, Spacing } from '@/constants/colors';
import type { BirthdayGreeting } from '@/types/birthday';

export interface BirthdayHeroCardProps {
  greeting: BirthdayGreeting;
  primerNombre?: string;
}

/**
 * Hero prioritario del Dashboard cuando hoy es cumpleaños del colaborador
 * (AGENTS.md sección 33) — no depende solo del push: si abrió la app
 * directamente también debe verlo.
 */
export function BirthdayHeroCard({ greeting, primerNombre }: BirthdayHeroCardProps) {
  const router = useRouter();

  return (
    <Card style={styles.card} onPress={() => router.push('/cumpleanos')}>
      <View style={styles.row}>
        <Text style={styles.emoji} accessibilityElementsHidden importantForAccessibility="no">
          🎉
        </Text>
        <View style={styles.textColumn}>
          <Text style={styles.title}>{primerNombre ? `¡Feliz cumpleaños, ${primerNombre}!` : greeting.titulo}</Text>
          <Text style={styles.subtitle}>Tenemos algo especial para ti.</Text>
        </View>
      </View>
      <Button
        title="Ver mi felicitación"
        variant="secondary"
        rightIcon="gift-outline"
        fullWidth={false}
        onPress={() => router.push('/cumpleanos')}
        style={styles.cta}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primarySoft,
    gap: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  emoji: {
    fontSize: 32,
  },
  textColumn: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.text,
    marginTop: 2,
  },
  cta: {
    alignSelf: 'flex-start',
  },
});
