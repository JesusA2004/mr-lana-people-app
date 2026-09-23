import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from './Avatar';
import { PressableScale } from './PressableScale';

import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { useBirthdayWalls } from '@/hooks/queries/useBirthdayWall';
import { useAuthStore } from '@/store/authStore';

/**
 * Accesos a los muros de cumpleaños ABIERTOS (Inicio de Mi espacio y de
 * Gestión RH). No aparece nada si no hay muros abiertos o si el backend
 * todavía no tiene el endpoint (404): nunca un error en el home.
 */
export function BirthdayWallBanner({ enabled = true, max = 3 }: { enabled?: boolean; max?: number }) {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const walls = useBirthdayWalls(enabled);
  const abiertos = (walls.data ?? []).filter((wall) => wall.abierto).slice(0, max);

  if (abiertos.length === 0) return null;

  return (
    <View style={styles.list}>
      {abiertos.map((wall) => {
        const nombre = wall.cumpleanero.nombre ?? 'Un compañero';
        const primerNombre = nombre.split(' ')[0];
        const title = wall.es_mi_muro ? '¡Tus compañeros te están felicitando!' : wall.es_hoy ? `Hoy cumple ${nombre}` : `Cumpleaños de ${nombre}`;
        const subtitle = wall.es_mi_muro
          ? `${wall.mensajes_count} ${wall.mensajes_count === 1 ? 'felicitación' : 'felicitaciones'} en tu muro`
          : `Déjale una felicitación a ${primerNombre}${wall.mensajes_count > 0 ? ` · ${wall.mensajes_count} ya lo hicieron` : ''}`;
        return (
          <PressableScale
            key={wall.id}
            accessibilityLabel={`${title}. ${subtitle}`}
            onPress={() => router.push(`/muro-cumpleanos/${wall.id}` as never)}
            style={styles.card}>
            <Avatar
              name={nombre}
              uri={wall.cumpleanero.foto_url ?? undefined}
              headers={token ? { Authorization: `Bearer ${token}` } : undefined}
              size={48}
              ringColor={Colors.celebration}
            />
            <View style={styles.text}>
              <Text style={styles.title} numberOfLines={2}>
                {title}
              </Text>
              <Text style={styles.subtitle} numberOfLines={2}>
                {subtitle}
              </Text>
            </View>
            <View style={styles.cta}>
              <Ionicons name="gift" size={18} color={Colors.white} />
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.celebrationSoft,
  },
  text: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  subtitle: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  cta: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.celebration,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
