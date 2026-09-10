import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Card } from '@/components/Card';
import { PressableScale } from '@/components/PressableScale';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';
import { useAuthStore } from '@/store/authStore';
import { useExperienceStore } from '@/store/experienceStore';
import { toast } from '@/store/toastStore';
import { joinName } from '@/utils/formatters';

/** Perfil de Gestión RH (AGENTS.md sección 5): identidad + acceso rápido a cambiar de experiencia y a Configuración. */
export default function RhPerfilScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const bootstrap = useMobileBootstrap(true);
  const setExperience = useExperienceStore((state) => state.setExperience);

  const nombre = joinName(user?.nombre, user?.apellidos);
  const roles = bootstrap.data?.user.roles ?? [];
  const sucursal = bootstrap.data?.user.sucursal?.nombre;

  const handleSwitchToColaborador = async () => {
    await setExperience('colaborador');
    toast.success('Cambiaste a Mi espacio.');
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Perfil"
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Configuración"
            onPress={() => router.push('/configuracion')}
            style={styles.settingsButton}>
            <Ionicons name="settings-outline" size={20} color={Colors.text} />
          </Pressable>
        }
      />

      <View style={styles.content}>
        <Card style={styles.headerCard}>
          <ProfileAvatar name={nombre} size={88} ringColor={Colors.primary} />
          <Text style={styles.name}>{nombre ?? 'Equipo RH'}</Text>
          {sucursal ? <Text style={styles.sucursal}>{sucursal}</Text> : null}
          <View style={styles.badgeRow}>
            <Ionicons name="briefcase-outline" size={13} color={Colors.primaryDark} />
            <Text style={styles.badgeText}>Gestión RH activa</Text>
          </View>
        </Card>

        {roles.length > 0 ? (
          <Card style={styles.rolesCard}>
            <Text style={styles.sectionTitle}>Roles</Text>
            <View style={styles.rolesRow}>
              {roles.map((role) => (
                <View key={role} style={styles.roleChip}>
                  <Text style={styles.roleChipText}>{role}</Text>
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        <PressableScale style={styles.linkCard} onPress={() => void handleSwitchToColaborador()}>
          <View style={styles.linkIcon}>
            <Ionicons name="person-outline" size={20} color={Colors.primaryDark} />
          </View>
          <View style={styles.linkText}>
            <Text style={styles.linkTitle}>Cambiar a Mi espacio</Text>
            <Text style={styles.linkCaption}>Tu expediente, solicitudes y vacaciones</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </PressableScale>

        <PressableScale style={styles.linkCard} onPress={() => router.push('/configuracion')}>
          <View style={styles.linkIcon}>
            <Ionicons name="settings-outline" size={20} color={Colors.primaryDark} />
          </View>
          <View style={styles.linkText}>
            <Text style={styles.linkTitle}>Configuración</Text>
            <Text style={styles.linkCaption}>Notificaciones, biometría y seguridad</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCard: {
    alignItems: 'center',
    gap: 2,
  },
  name: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  sucursal: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  rolesCard: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.text,
  },
  rolesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  roleChip: {
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  roleChipText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.text,
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
