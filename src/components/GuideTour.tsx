import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Button } from './Button';
import { MascotAvatar } from './mascot/MascotAvatar';

import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import type { GuideSlide } from '@/constants/guideSlides';
import { haptics } from '@/utils/haptics';

export interface GuideTourProps {
  slides: GuideSlide[];
  /** Nombre del colaborador para personalizar la primera diapositiva, si se conoce. */
  greetingName?: string;
  onFinish: () => void;
  onSkip: () => void;
  /** Etiqueta del botón final, ej. "Comenzar" (primer ingreso) o "Entendido" (re-visita). */
  finishLabel?: string;
  /** Etiqueta del botón de saltar/cerrar, ej. "Omitir" o "Cerrar". */
  skipLabel?: string;
}

/**
 * Tour guiado con la mascota — usado tanto en el onboarding de primer
 * ingreso (`src/app/onboarding.tsx`) como en la guía re-visitable desde
 * Ayuda (`src/app/(app)/guia.tsx`, sección "Guía de usuario" del encargo
 * V3). Un solo componente, un solo lugar donde vive la animación/UX del
 * tour — el contenido (slides) lo decide quien lo use.
 */
export function GuideTour({ slides, greetingName, onFinish, onSkip, finishLabel = 'Comenzar', skipLabel = 'Omitir' }: GuideTourProps) {
  const [step, setStep] = useState(0);

  const isFirst = step === 0;
  const isLast = step === slides.length - 1;
  const slide = slides[step];

  const handleNext = () => {
    if (isLast) {
      onFinish();
      return;
    }
    haptics.selection();
    setStep((current) => current + 1);
  };

  const handleBack = () => {
    haptics.selection();
    setStep((current) => Math.max(0, current - 1));
  };

  if (!slide) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.progressRow}>
          {slides.map((_, index) => (
            <View key={index} style={[styles.dot, index === step && styles.dotActive] as ViewStyle[]} />
          ))}
        </View>
        {!isLast ? (
          <Button title={skipLabel} onPress={onSkip} variant="ghost" fullWidth={false} style={styles.skipButton} />
        ) : (
          <View style={styles.skipButton} />
        )}
      </View>

      <Animated.View key={step} entering={FadeIn.duration(260)} exiting={FadeOut.duration(120)} style={styles.content}>
        <View style={styles.mascotWrapper}>
          <MascotAvatar orientation={step % 2 === 0 ? 'right' : 'left'} size="lg" />
        </View>

        <View style={styles.iconBadge}>
          <Ionicons name={slide.icon} size={22} color={Colors.primaryDark} />
        </View>

        <Text style={styles.title}>{isFirst && greetingName ? `${slide.title}, ${greetingName}` : slide.title}</Text>
        <Text style={styles.message}>{slide.message}</Text>
      </Animated.View>

      <View style={styles.footer}>
        {!isFirst ? (
          <Button title="Anterior" onPress={handleBack} variant="outline" fullWidth={false} style={styles.footerButton} />
        ) : (
          <View style={styles.footerButton} />
        )}
        <Button
          title={isLast ? finishLabel : 'Siguiente'}
          onPress={handleNext}
          fullWidth={false}
          style={[styles.footerButton, styles.footerButtonPrimary]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  progressRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.border,
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 20,
  },
  skipButton: {
    minHeight: 36,
    paddingHorizontal: Spacing.sm,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.md,
  },
  mascotWrapper: {
    marginBottom: Spacing.md,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
  },
  message: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  footerButton: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  footerButtonPrimary: {
    flex: 1.4,
  },
});
