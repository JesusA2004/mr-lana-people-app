import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colaboradorApi } from '@/api/colaborador';
import { Avatar } from '@/components/Avatar';
import { AppHeader } from '@/components/AppHeader';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { NotificationBellButton } from '@/components/NotificationBellButton';
import { RequestCard } from '@/components/RequestCard';
import { SkeletonBlock, SkeletonCardList } from '@/components/SkeletonBlock';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { useAuthStore } from '@/store/authStore';
import type { DashboardData } from '@/types/collaborator';
import type { Solicitud } from '@/types/request';
import { formatDateLong } from '@/utils/dates';
import { getErrorMessage, logError } from '@/utils/errors';
import { pickNumber, pickString } from '@/utils/formatters';

type ViewState = 'loading' | 'success' | 'error';

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [data, setData] = useState<DashboardData | null>(null);
  const [state, setState] = useState<ViewState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setState('loading');
    setErrorMessage(null);
    try {
      const dashboard = await colaboradorApi.getDashboard();
      setData(dashboard);
      setState('success');
    } catch (error) {
      logError('dashboard.getDashboard', error);
      setErrorMessage(getErrorMessage(error));
      setState('error');
    } finally {
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  // El backend podría anidar los datos del colaborador o devolverlos aplanados; se
  // combinan ambas formas para leer campos de forma defensiva (ver utils/formatters.ts).
  const source: Record<string, unknown> = { ...(data ?? {}), ...(data?.colaborador ?? {}) };

  const nombre = pickString(source, ['nombre_completo', 'nombre', 'name']) ?? pickString(user, ['nombre', 'name']);
  const puesto = pickString(source, ['puesto']);
  const sucursal = pickString(source, ['sucursal']);
  const empresa = pickString(source, ['empresa']);
  const fechaIngreso = pickString(source, ['fecha_ingreso']);
  const antiguedad = pickString(source, ['antiguedad']);
  const fotoUrl = pickString(source, ['foto_url_api', 'foto_url']);
  const diasDisponibles = pickNumber(source, ['vacaciones_disponibles', 'dias_disponibles']);
  const notificacionesNoLeidas = pickNumber(source, ['notificaciones_no_leidas']) ?? 0;
  const solicitudesRecientes = Array.isArray(data?.solicitudes_recientes)
    ? (data?.solicitudes_recientes as Solicitud[])
    : [];

  return (
    <View style={styles.container}>
      <AppHeader
        title={nombre ? `Hola, ${nombre.split(' ')[0]}` : 'Hola'}
        subtitle={[puesto, sucursal].filter(Boolean).join(' · ') || undefined}
        right={<NotificationBellButton unreadCount={notificacionesNoLeidas} />}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={Colors.primary} />}>
        {state === 'loading' ? (
          <View style={styles.skeletonWrapper}>
            <SkeletonBlock height={100} radius={Radius.lg} />
            <SkeletonCardList count={3} />
          </View>
        ) : state === 'error' ? (
          <ErrorState message={errorMessage ?? undefined} onRetry={() => void load()} />
        ) : (
          <>
            <Card style={styles.profileCard}>
              <Avatar name={nombre} uri={fotoUrl} size={64} />
              <View style={styles.profileInfo}>
                <Text style={styles.profileName} numberOfLines={1}>
                  {nombre ?? 'Colaborador'}
                </Text>
                {empresa ? <Text style={styles.profileMeta}>{empresa}</Text> : null}
                {fechaIngreso ? (
                  <Text style={styles.profileMeta}>Ingreso: {formatDateLong(fechaIngreso)}</Text>
                ) : null}
                {antiguedad ? <Text style={styles.profileMeta}>Antigüedad: {antiguedad}</Text> : null}
              </View>
            </Card>

            {typeof diasDisponibles === 'number' ? (
              <Card style={styles.vacationCard}>
                <View>
                  <Text style={styles.vacationLabel}>Días de vacaciones disponibles</Text>
                  <Text style={styles.vacationValue}>{diasDisponibles}</Text>
                </View>
                <Ionicons name="airplane" size={28} color={Colors.primary} />
              </Card>
            ) : null}

            <Text style={styles.sectionTitle}>Accesos rápidos</Text>
            <View style={styles.quickGrid}>
              <QuickAction
                icon="airplane-outline"
                label="Mis vacaciones"
                onPress={() => router.push('/(app)/(tabs)/vacaciones')}
              />
              <QuickAction
                icon="document-text-outline"
                label="Mis solicitudes"
                onPress={() => router.push('/(app)/(tabs)/solicitudes')}
              />
              <QuickAction
                icon="add-circle-outline"
                label="Nueva solicitud"
                onPress={() => router.push('/solicitud/nueva')}
              />
              <QuickAction
                icon="notifications-outline"
                label="Notificaciones"
                onPress={() => router.push('/notificaciones')}
              />
            </View>

            <Text style={styles.sectionTitle}>Solicitudes recientes</Text>
            {solicitudesRecientes.length === 0 ? (
              <Card>
                <Text style={styles.emptyText}>Aún no tienes solicitudes recientes.</Text>
              </Card>
            ) : (
              <View style={styles.list}>
                {solicitudesRecientes.map((solicitud) => (
                  <RequestCard
                    key={String(solicitud.id)}
                    solicitud={solicitud}
                    onPress={() => router.push({ pathname: '/solicitud/[id]', params: { id: String(solicitud.id) } })}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.quickAction, pressed && styles.quickActionPressed]}>
      <View style={styles.quickIcon}>
        <Ionicons name={icon} size={22} color={Colors.primaryDark} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
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
    paddingBottom: Spacing.xxxl,
  },
  skeletonWrapper: {
    gap: Spacing.lg,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
  },
  profileMeta: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  vacationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primarySoft,
  },
  vacationLabel: {
    fontSize: FontSize.sm,
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  vacationValue: {
    fontSize: FontSize.xxxl,
    color: Colors.primaryDark,
    fontWeight: '800',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  quickAction: {
    width: '47%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    minHeight: 96,
  },
  quickActionPressed: {
    opacity: 0.85,
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  list: {
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
