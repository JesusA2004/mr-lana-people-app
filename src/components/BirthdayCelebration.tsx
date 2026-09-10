import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from './Button';
import { Confetti } from './Confetti';
import { MascotAvatar } from './mascot/MascotAvatar';
import { SkeletonBlock } from './SkeletonBlock';

import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { useBirthdayImageSource } from '@/hooks/queries/useBirthday';
import type { BirthdayGreeting } from '@/types/birthday';

export interface BirthdayCelebrationProps {
  greeting: BirthdayGreeting;
  nombre?: string;
  onClose?: () => void;
}

/**
 * Celebración de cumpleaños a pantalla completa (AGENTS.md sección 31):
 * elegante, corporativa MR. LANA, festiva sin ser infantil. Todo el
 * contenido viene del backend (`greeting`) salvo la mascota/confetti —
 * nunca texto ni imagen inventados en el cliente. Nunca muestra año de
 * nacimiento ni edad (sección 73): el tipo `BirthdayGreeting` ni siquiera
 * los declara.
 */
export function BirthdayCelebration({ greeting, nombre, onClose }: BirthdayCelebrationProps) {
  const router = useRouter();
  const imageSource = useBirthdayImageSource(true);
  const [imageStatus, setImageStatus] = useState<'loading' | 'ready' | 'error'>(imageSource ? 'loading' : 'error');

  const handleClose = () => {
    if (onClose) {
      onClose();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(app)/(tabs)');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Confetti />
      <View style={styles.closeRow}>
        <Button
          title="Cerrar"
          variant="ghost"
          onPress={handleClose}
          fullWidth={false}
          leftIcon="close"
          style={styles.closeButton}
        />
      </View>

      <View style={styles.content}>
        <MascotAvatar size="lg" orientation="right" />
        <Text style={styles.emoji} accessibilityElementsHidden importantForAccessibility="no">
          🎉
        </Text>
        <Text style={styles.title}>{greeting.titulo}</Text>
        {nombre ? <Text style={styles.name}>{nombre}</Text> : null}
        <Text style={styles.message}>{greeting.mensaje}</Text>
        {greeting.frase ? <Text style={styles.phrase}>&ldquo;{greeting.frase}&rdquo;</Text> : null}

        <View style={styles.cardWrapper}>
          {imageSource && imageStatus !== 'error' ? (
            <Image
              source={{ uri: imageSource.uri, headers: imageSource.headers }}
              style={styles.cardImage}
              contentFit="contain"
              onLoad={() => setImageStatus('ready')}
              onError={() => setImageStatus('error')}
              accessibilityLabel="Tarjeta de felicitación de cumpleaños de MR. LANA"
            />
          ) : null}
          {imageStatus === 'loading' ? (
            <View style={styles.cardImageOverlay}>
              <SkeletonBlock height={220} radius={Radius.xl} />
            </View>
          ) : null}
          {imageStatus === 'error' ? (
            <View style={styles.cardFallback}>
              <Ionicons name="gift-outline" size={40} color={Colors.primaryDark} />
              <Text style={styles.cardFallbackText}>MR. LANA PEOPLE te desea un gran día</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.brand}>MR. LANA</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  closeRow: {
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
  },
  closeButton: {
    minHeight: 40,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },
  emoji: {
    fontSize: 40,
    marginTop: -Spacing.sm,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
  },
  name: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.primaryDark,
    textAlign: 'center',
  },
  message: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  phrase: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  cardWrapper: {
    width: '100%',
    marginTop: Spacing.lg,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: 260,
    borderRadius: Radius.xl,
  },
  cardImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardFallback: {
    width: '100%',
    height: 200,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  cardFallbackText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primaryDark,
    textAlign: 'center',
  },
  brand: {
    marginTop: 'auto',
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 4,
  },
});
