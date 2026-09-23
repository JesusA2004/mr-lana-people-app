import { StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { Card } from './Card';
import { ProfileAvatar } from './ProfileAvatar';
import { RhIdentityBadge } from './RhIdentityBadge';

import { Colors, FontSize, Spacing } from '@/constants/colors';
import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';
import { useExperienceStore } from '@/store/experienceStore';
import { toast } from '@/store/toastStore';
import { openCrossExperienceRoute } from '@/utils/crossNavigation';
import { canSwitchExperience, experienceAvailability, resolveExperience } from '@/utils/experience';
import { joinName } from '@/utils/formatters';
import { haptics } from '@/utils/haptics';

const HOME = { colaborador: '/(app)/(tabs)', rh: '/(app)/rh/(tabs)' } as const;

/**
 * "Cuenta y experiencia": quién soy, qué experiencia está activa y —solo si
 * la cuenta tiene ambas— el botón para cambiar. Cambiar NO toca roles ni la
 * sesión: mismo usuario, mismo token; solo cambia la navegación.
 * Disponibilidad: `mobile/bootstrap` (capabilities/features), nunca el rol.
 */
export function ExperienceSwitchCard({ compact = false }: { compact?: boolean }) {
  const bootstrap = useMobileBootstrap(true);
  const stored = useExperienceStore((state) => state.experience);
  const availability = experienceAvailability(bootstrap.data?.capabilities, bootstrap.data?.features);
  const activa = resolveExperience(stored, availability) ?? 'colaborador';
  const puedeCambiar = canSwitchExperience(availability);

  const user = bootstrap.data?.user;
  const nombre = joinName(user?.name, user?.apellidos) ?? user?.name;
  const esRh = activa === 'rh';
  const destino = esRh ? 'colaborador' : 'rh';

  const cambiar = () => {
    haptics.selection();
    // Mismo mecanismo que un push: cambia de árbol y navega cuando ya está montado.
    openCrossExperienceRoute(HOME[destino], destino);
    toast.success(destino === 'rh' ? 'Estás en Gestión RH.' : 'Estás en Mi espacio.');
  };

  return (
    <Card style={styles.card}>
      {compact ? null : <Text style={styles.eyebrow}>Cuenta y experiencia</Text>}
      <View style={styles.row}>
        {esRh ? (
          <RhIdentityBadge size={compact ? 'sm' : 'md'} accessibilityLabel="Gestión RH" />
        ) : (
          <ProfileAvatar name={nombre} fotoUrlApi={user?.foto_url} size={compact ? 36 : 48} />
        )}
        <View style={styles.text}>
          {compact ? null : (
            <Text style={styles.name} numberOfLines={1}>
              {nombre ?? 'Mi cuenta'}
            </Text>
          )}
          <Text style={compact ? styles.name : styles.active}>{esRh ? 'Gestión RH activa' : 'Mi espacio activo'}</Text>
        </View>
      </View>
      {puedeCambiar ? (
        <Button
          title={esRh ? 'Cambiar a Mi espacio' : 'Cambiar a Gestión RH'}
          variant="outline"
          leftIcon={esRh ? 'person-outline' : 'people-outline'}
          onPress={cambiar}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.md,
  },
  eyebrow: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  active: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
});
