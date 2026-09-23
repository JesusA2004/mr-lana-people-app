import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { ExperienceSwitchCard } from '@/components/ExperienceSwitchCard';
import { PressableScale } from '@/components/PressableScale';
import { Colors, FontSize, Layout, Radius, Spacing } from '@/constants/colors';
import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';

/**
 * Perfil en Gestión RH: cuenta + experiencia activa (con el cambio a Mi
 * espacio solo si la cuenta tiene ambas) y acceso a Configuración.
 */
export default function RhPerfilScreen() {
  const router = useRouter();
  const bootstrap = useMobileBootstrap(true);
  const user = bootstrap.data?.user;
  const datos = [user?.puesto?.nombre, user?.sucursal?.nombre, user?.email].filter(Boolean) as string[];

  return (
    <View style={styles.container}>
      <AppHeader
        title="Perfil"
        right={
          <Pressable accessibilityRole="button" accessibilityLabel="Configuración" onPress={() => router.push('/configuracion')} style={styles.settingsButton}>
            <Ionicons name="settings-outline" size={20} color={Colors.text} />
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        <ExperienceSwitchCard />

        {datos.length > 0 ? (
          <View style={styles.details}>
            {datos.map((dato) => (
              <Text key={dato} style={styles.detail} numberOfLines={1}>
                {dato}
              </Text>
            ))}
          </View>
        ) : null}

        <PressableScale style={styles.linkCard} onPress={() => router.push('/configuracion')}>
          <View style={styles.linkIcon}>
            <Ionicons name="settings-outline" size={20} color={Colors.primaryDark} />
          </View>
          <View style={styles.linkText}>
            <Text style={styles.linkTitle}>Configuración</Text>
            <Text style={styles.linkCaption}>Notificaciones, seguridad y ayuda</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </PressableScale>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    width: '100%',
    maxWidth: Layout.maxFormWidth,
    alignSelf: 'center',
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: {
    gap: 2,
    paddingHorizontal: Spacing.xs,
  },
  detail: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  linkIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    flex: 1,
  },
  linkTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  linkCaption: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
