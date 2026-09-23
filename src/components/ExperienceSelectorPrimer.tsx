import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableScale } from './PressableScale';
import { ProfileAvatar } from './ProfileAvatar';
import { RhIdentityBadge } from './RhIdentityBadge';

import { Colors, FontSize, Layout, Radius, Spacing } from '@/constants/colors';
import { Motion } from '@/constants/motion';
import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';
import { useExperienceStore, type Experience } from '@/store/experienceStore';
import { canSwitchExperience, experienceAvailability } from '@/utils/experience';
import { joinName } from '@/utils/formatters';
import { haptics } from '@/utils/haptics';

/**
 * Selector de experiencia (AGENTS.md sección 3): solo aparece la primera vez
 * que una cuenta con capacidades RH inicia sesión y todavía no eligió —
 * después se cambia desde Configuración. Si la cuenta solo es colaborador,
 * esto nunca se monta.
 *
 * Dos tarjetas claramente distintas: "Mi espacio" con la foto real del
 * colaborador y "Gestión RH" con `RhIdentityBadge`. Al elegir, la tarjeta
 * marca selección (borde + check) y el overlay se desvanece (~200 ms); las
 * animaciones de layout de Reanimated respetan Reduce Motion del sistema.
 */
export function ExperienceSelectorPrimer() {
  const bootstrap = useMobileBootstrap(true);
  const experience = useExperienceStore((state) => state.experience);
  const experienceLoading = useExperienceStore((state) => state.isLoading);
  const setExperience = useExperienceStore((state) => state.setExperience);
  const [selected, setSelected] = useState<Experience | null>(null);

  if (experienceLoading || !bootstrap.data) return null;

  // Solo se pregunta si la cuenta tiene AMBAS experiencias y aún no eligió.
  if (!canSwitchExperience(experienceAvailability(bootstrap.data.capabilities, bootstrap.data.features)) || experience !== null) return null;

  const user = bootstrap.data.user;
  const nombre = joinName(user.name, user.apellidos) ?? user.name;

  const choose = (value: Experience) => {
    if (selected) return;
    haptics.selection();
    setSelected(value);
    // Deja ver la selección un instante antes de montar el árbol elegido.
    // `selected` se limpia después: si la sesión cambia (logout), el selector vuelve limpio.
    setTimeout(() => void setExperience(value).finally(() => setSelected(null)), Motion.duration.fast);
  };

  return (
    <Animated.View style={styles.overlay} entering={FadeIn.duration(Motion.duration.base)} exiting={FadeOut.duration(Motion.duration.base)}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll} bounces={false}>
          <View style={styles.inner}>
            <Text style={styles.eyebrow}>Bienvenido{nombre ? `, ${nombre.split(' ')[0]}` : ''}</Text>
            <Text style={styles.title} accessibilityRole="header">
              ¿Cómo quieres entrar hoy?
            </Text>
            <Text style={styles.subtitle}>Tu cuenta tiene acceso a tu espacio personal y a Gestión RH. Puedes cambiar cuando quieras desde Configuración.</Text>

            <Animated.View entering={FadeInDown.duration(Motion.duration.base).delay(40)} style={styles.options}>
              <ExperienceCard
                title="Mi espacio"
                subtitle="Solicitudes, documentos, vacaciones y recibos"
                selected={selected === 'colaborador'}
                dimmed={selected === 'rh'}
                onPress={() => choose('colaborador')}
                visual={<ProfileAvatar name={nombre} fotoUrlApi={user.foto_url} size={48} />}
              />
              <ExperienceCard
                title="Gestión RH"
                subtitle="Personal, pendientes y operación"
                selected={selected === 'rh'}
                dimmed={selected === 'colaborador'}
                onPress={() => choose('rh')}
                visual={<RhIdentityBadge size="md" />}
                tone="rh"
              />
            </Animated.View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}

export function ExperienceCard({
  title,
  subtitle,
  visual,
  selected,
  dimmed = false,
  tone = 'default',
  onPress,
}: {
  title: string;
  subtitle: string;
  visual: React.ReactNode;
  selected: boolean;
  dimmed?: boolean;
  tone?: 'default' | 'rh';
  onPress: () => void;
}) {
  const accent = tone === 'rh' ? Colors.rhAccent : Colors.primary;
  return (
    <PressableScale
      haptic={false}
      accessibilityLabel={`${title}. ${subtitle}${selected ? '. Seleccionado' : ''}`}
      onPress={onPress}
      style={[styles.option, selected && { borderColor: accent, borderWidth: 2, padding: Spacing.lg - 1 }, dimmed && styles.dimmed]}>
      <View style={styles.visual}>{visual}</View>
      <View style={styles.optionText}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionSubtitle}>{subtitle}</Text>
      </View>
      {selected ? (
        <Animated.View entering={FadeIn.duration(Motion.duration.fast)} style={[styles.check, { backgroundColor: accent }]}>
          <Ionicons name="checkmark" size={16} color={Colors.white} />
        </Animated.View>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      )}
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
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  inner: {
    width: '100%',
    maxWidth: Layout.maxFormWidth,
    alignSelf: 'center',
    gap: Spacing.sm,
  },
  eyebrow: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  options: {
    gap: Spacing.md,
  },
  option: {
    width: '100%',
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  dimmed: {
    opacity: 0.55,
  },
  visual: {
    width: 56,
    alignItems: 'center',
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
    lineHeight: 17,
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
