import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colaboradorApi } from '@/api/colaborador';
import { AnimatedProgressBar } from '@/components/AnimatedProgressBar';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { FadeInView } from '@/components/FadeInView';
import { MascotAssistant } from '@/components/mascot/MascotAssistant';
import { NotificationBellButton } from '@/components/NotificationBellButton';
import { PressableScale } from '@/components/PressableScale';
import { RequestCard } from '@/components/RequestCard';
import { SkeletonBlock, SkeletonCardList } from '@/components/SkeletonBlock';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { MascotMessages } from '@/constants/mascotMessages';
import { useAuthStore } from '@/store/authStore';
import type { CollaboratorProfile, DashboardData } from '@/types/collaborator';
import type { Solicitud } from '@/types/request';
import { getGreeting } from '@/utils/dates';
import { getErrorMessage, logError } from '@/utils/errors';
import { joinName, pickString } from '@/utils/formatters';

type ViewState = 'loading' | 'success' | 'error';

/** Campos laborales que se muestran en la tarjeta de "Tu información" del dashboard. */
const PROFILE_FIELDS: (keyof CollaboratorProfile)[] = ['puesto', 'departamento', 'sucursal', 'empresa', 'jefe_directo'];

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  const perfil = data?.perfil;
  const nombre = joinName(perfil?.nombre, perfil?.apellidos) ?? joinName(pickString(user, ['nombre']), pickString(user, ['apellidos']));
  const primerNombre = nombre?.split(' ')[0];
  const puesto = perfil?.puesto;
  const sucursal = perfil?.sucursal;

  const diasDisponibles = data?.vacaciones?.dias_disponibles;
  const diasEnSolicitud = data?.vacaciones?.dias_en_solicitud ?? 0;
  const noLeidas = data?.notificaciones?.no_leidas ?? 0;
  const solicitudesRecientes = useMemo(
    () => (Array.isArray(data?.solicitudes_recientes) ? (data?.solicitudes_recientes as Solicitud[]) : []),
    [data],
  );
  const enProceso = solicitudesRecientes.filter((item) => item.estado === 'enviada' || item.estado === 'en_revision').length;

  const filledFields = PROFILE_FIELDS.filter((field) => Boolean(perfil?.[field]));
  const profilePercent = perfil ? Math.round((filledFields.length / PROFILE_FIELDS.length) * 100) : 0;
  const missingFields = PROFILE_FIELDS.length - filledFields.length;

  const priorityMascot = useMemo(() => {
    const requiresCorrection = solicitudesRecientes.find((item) => item.estado === 'requiere_correccion');
    if (requiresCorrection) {
      return {
        type: 'warning' as const,
        priority: 'high' as const,
        message: MascotMessages.documentoRechazado,
        actionLabel: 'Ver solicitud',
        onAction: () => router.push({ pathname: '/solicitud/[id]', params: { id: String(requiresCorrection.id) } }),
      };
    }
    if (noLeidas > 0) {
      return {
        type: 'info' as const,
        priority: 'normal' as const,
        message: `Tienes ${noLeidas} ${noLeidas === 1 ? 'notificación nueva' : 'notificaciones nuevas'}.`,
        actionLabel: 'Ver notificaciones',
        onAction: () => router.push('/notificaciones'),
      };
    }
    if (missingFields > 0) {
      return {
        type: 'tip' as const,
        priority: 'normal' as const,
        message: MascotMessages.perfilIncompleto,
        actionLabel: 'Solicitar actualización',
        onAction: () =>
          router.push({ pathname: '/solicitud/nueva', params: { tipo: 'actualizacion_datos' } }),
      };
    }
    return null;
  }, [solicitudesRecientes, noLeidas, missingFields, router]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <PressableScale
          accessibilityLabel="Ir a mi perfil"
          onPress={() => router.push('/(app)/(tabs)/perfil')}
          haptic={false}
          style={styles.headerLeft}>
          <Avatar name={nombre} uri={perfil?.foto_url ?? undefined} size={48} />
          <View style={styles.headerText}>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.name} numberOfLines={1}>
              {primerNombre ?? 'Colaborador'}
            </Text>
          </View>
        </PressableScale>
        <NotificationBellButton unreadCount={noLeidas} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={Colors.primary} />}>
        {state === 'loading' ? (
          <View style={styles.skeletonWrapper}>
            <SkeletonBlock height={110} radius={Radius.lg} />
            <SkeletonCardList count={3} />
          </View>
        ) : state === 'error' ? (
          <ErrorState message={errorMessage ?? undefined} onRetry={() => void load()} />
        ) : (
          <>
            {(puesto ?? sucursal) ? (
              <Text style={styles.roleLine}>{[puesto, sucursal].filter(Boolean).join(' · ')}</Text>
            ) : null}

            {priorityMascot ? (
              <MascotAssistant
                message={priorityMascot.message}
                type={priorityMascot.type}
                priority={priorityMascot.priority}
                actionLabel={priorityMascot.actionLabel}
                onAction={priorityMascot.onAction}
              />
            ) : null}

            <FadeInView index={0}>
              <Card style={styles.infoCard} onPress={() => router.push('/(app)/(tabs)/perfil')}>
                <View style={styles.infoHeaderRow}>
                  <Text style={styles.infoTitle}>Tu información laboral</Text>
                  <Text style={styles.infoPercent}>{profilePercent}%</Text>
                </View>
                <AnimatedProgressBar percent={profilePercent} />
                <Text style={styles.infoCaption}>
                  {missingFields === 0
                    ? 'Tu información laboral está completa.'
                    : `${missingFields} ${missingFields === 1 ? 'dato pendiente' : 'datos pendientes'} de confirmar.`}
                </Text>
              </Card>
            </FadeInView>

            <View style={styles.statGrid}>
              <FadeInView index={1} style={styles.statFlex}>
                <StatTile
                  icon="airplane-outline"
                  label="Días disponibles"
                  value={typeof diasDisponibles === 'number' ? diasDisponibles : '—'}
                  caption={diasEnSolicitud > 0 ? `${diasEnSolicitud} en solicitud` : undefined}
                  highlight
                  onPress={() => router.push('/(app)/(tabs)/vacaciones')}
                />
              </FadeInView>
              <FadeInView index={2} style={styles.statFlex}>
                <StatTile
                  icon="document-text-outline"
                  label="En proceso"
                  value={enProceso}
                  caption="Solicitudes"
                  onPress={() => router.push('/(app)/(tabs)/solicitudes')}
                />
              </FadeInView>
            </View>

            <Text style={styles.sectionTitle}>Accesos rápidos</Text>
            <View style={styles.quickGrid}>
              <QuickAction icon="add-circle-outline" label="Nueva solicitud" onPress={() => router.push('/solicitud/nueva')} />
              <QuickAction icon="airplane-outline" label="Vacaciones" onPress={() => router.push('/(app)/(tabs)/vacaciones')} />
              <QuickAction icon="folder-open-outline" label="Mi expediente" onPress={() => router.push('/(app)/(tabs)/expediente')} />
              <QuickAction icon="help-buoy-outline" label="Ayuda" onPress={() => router.push('/ayuda')} />
            </View>

            <Text style={styles.sectionTitle}>Solicitudes recientes</Text>
            {solicitudesRecientes.length === 0 ? (
              <Card style={styles.emptyCard}>
                <MascotAssistant
                  message={MascotMessages.todoTranquilo}
                  type="tip"
                  dismissible={false}
                  actionLabel="Crear solicitud"
                  onAction={() => router.push('/solicitud/nueva')}
                />
              </Card>
            ) : (
              <View style={styles.list}>
                {solicitudesRecientes.slice(0, 5).map((solicitud, index) => (
                  <FadeInView key={String(solicitud.id)} index={index + 3}>
                    <RequestCard
                      solicitud={solicitud}
                      onPress={() => router.push({ pathname: '/solicitud/[id]', params: { id: String(solicitud.id) } })}
                    />
                  </FadeInView>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function StatTile({
  icon,
  label,
  value,
  caption,
  highlight = false,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number | string;
  caption?: string;
  highlight?: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale onPress={onPress} style={[styles.statTile, highlight && styles.statTileHighlight]}>
      <Ionicons name={icon} size={20} color={highlight ? Colors.primaryDark : Colors.textMuted} />
      <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {caption ? <Text style={styles.statCaption}>{caption}</Text> : null}
    </PressableScale>
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
    <PressableScale accessibilityLabel={label} onPress={onPress} style={styles.quickAction}>
      <View style={styles.quickIcon}>
        <Ionicons name={icon} size={22} color={Colors.primaryDark} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </PressableScale>
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
    paddingBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexShrink: 1,
  },
  headerText: {
    flexShrink: 1,
  },
  greeting: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  name: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: 0,
    gap: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  skeletonWrapper: {
    gap: Spacing.lg,
  },
  roleLine: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: -Spacing.sm,
  },
  infoCard: {
    gap: Spacing.sm,
  },
  infoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  infoPercent: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  infoCaption: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  statGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statFlex: {
    flex: 1,
  },
  statTile: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: 2,
    alignItems: 'flex-start',
  },
  statTileHighlight: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primarySoft,
  },
  statValue: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  statValueHighlight: {
    color: Colors.primaryDark,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  statCaption: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
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
  emptyCard: {
    padding: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
});
