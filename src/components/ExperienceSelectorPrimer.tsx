import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableScale } from './PressableScale';
import { MascotAvatar } from './mascot/MascotAvatar';

import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';
import { useExperienceStore } from '@/store/experienceStore';
import { canUseRhExperience } from '@/utils/capabilities';

/**
 * Selector de experiencia elegante (AGENTS.md sección 3): solo aparece UNA
 * vez, la primera vez que una cuenta con capacidades RH inicia sesión y
 * todavía no eligió — después se puede cambiar sin fricción desde
 * Configuración (`ExperienceSwitcherRow`). Si el colaborador solo tiene
 * capacidad de colaborador, esto nunca se monta: entra directo a Mi espacio.
 */
export function ExperienceSelectorPrimer() {
  const bootstrap = useMobileBootstrap(true);
  const experience = useExperienceStore((state) => state.experience);
  const experienceLoading = useExperienceStore((state) => state.isLoading);
  const setExperience = useExperienceStore((state) => state.setExperience);

  if (experienceLoading || !bootstrap.data) return null;

  const canUseRh = canUseRhExperience(bootstrap.data.capabilities, bootstrap.data.features);
  if (!canUseRh || experience !== null) return null;

  return (
    <View style={styles.overlay}>
      <SafeAreaView style={styles.safeArea}>
        <MascotAvatar orientation="right" size="lg" />
        <Text style={styles.title}>¿Cómo quieres entrar hoy?</Text>
        <Text style={styles.subtitle}>
          Tu cuenta tiene acceso a tu espacio personal y a Gestión RH. Puedes cambiar entre ambos cuando quieras, sin cerrar sesión.
        </Text>

        <View style={styles.options}>
          <ExperienceOption
            icon="person-outline"
            title="Mi espacio"
            subtitle="Tu expediente, solicitudes y vacaciones."
            onPress={() => void setExperience('colaborador')}
          />
          <ExperienceOption
            icon="briefcase-outline"
            title="Gestión RH"
            subtitle="Pendientes, aprobaciones y colaboradores."
            onPress={() => void setExperience('rh')}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

function ExperienceOption({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <PressableScale accessibilityLabel={title} onPress={onPress} style={styles.option}>
      <View style={styles.optionIcon}>
        <Ionicons name={icon} size={22} color={Colors.primaryDark} />
      </View>
      <View style={styles.optionText}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.background,
    zIndex: 1150,
    elevation: 1150,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  options: {
    width: '100%',
    gap: Spacing.md,
  },
  option: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
    minWidth: 0,
  },
  optionTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  optionSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
