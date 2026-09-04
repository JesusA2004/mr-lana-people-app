import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { MascotAvatar } from '@/components/mascot/MascotAvatar';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { useAuthStore } from '@/store/authStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { pickString } from '@/utils/formatters';

interface Slide {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
}

const BASE_SLIDES: Slide[] = [
  { icon: 'sparkles-outline', title: 'Bienvenido a MR. LANA PEOPLE', message: 'Tu app de Recursos Humanos, siempre a la mano.' },
  {
    icon: 'briefcase-outline',
    title: 'Tu información y vacaciones',
    message: 'Consulta tus datos laborales y tus días de vacaciones disponibles en un solo lugar.',
  },
  {
    icon: 'document-text-outline',
    title: 'Solicitudes en segundos',
    message: 'Realiza permisos, incapacidades y otros trámites directamente desde la app.',
  },
  {
    icon: 'folder-open-outline',
    title: 'Tu expediente digital',
    message: 'Muy pronto podrás completar tu expediente y dar seguimiento a tus documentos desde aquí.',
  },
  {
    icon: 'notifications-outline',
    title: 'Siempre informado',
    message: 'Recibe avisos y da seguimiento al estatus de tus trámites con Recursos Humanos.',
  },
];

export default function OnboardingScreen() {
  const user = useAuthStore((state) => state.user);
  const completeOnboarding = useOnboardingStore((state) => state.complete);
  const [step, setStep] = useState(0);

  const nombre = pickString(user, ['nombre']);
  const slides = BASE_SLIDES;
  const isFirst = step === 0;
  const isLast = step === slides.length - 1;
  const slide = slides[step];

  const handleNext = () => {
    if (isLast) {
      void completeOnboarding();
      return;
    }
    setStep((current) => current + 1);
  };

  const handleBack = () => setStep((current) => Math.max(0, current - 1));
  const handleSkip = () => void completeOnboarding();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.progressRow}>
          {slides.map((_, index) => (
            <View key={index} style={[styles.dot, index === step && styles.dotActive] as ViewStyle[]} />
          ))}
        </View>
        {!isLast ? (
          <Button title="Omitir" onPress={handleSkip} variant="ghost" fullWidth={false} style={styles.skipButton} />
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

        <Text style={styles.title}>{isFirst && nombre ? `${slide.title}, ${nombre}` : slide.title}</Text>
        <Text style={styles.message}>{slide.message}</Text>
      </Animated.View>

      <View style={styles.footer}>
        {!isFirst ? (
          <Button title="Anterior" onPress={handleBack} variant="outline" fullWidth={false} style={styles.footerButton} />
        ) : (
          <View style={styles.footerButton} />
        )}
        <Button
          title={isLast ? 'Comenzar' : 'Siguiente'}
          onPress={handleNext}
          fullWidth={false}
          style={[styles.footerButton, styles.footerButtonPrimary]}
        />
      </View>
    </SafeAreaView>
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
