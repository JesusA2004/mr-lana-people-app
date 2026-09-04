import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AnimatedProgressBar } from '@/components/AnimatedProgressBar';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { FadeInView } from '@/components/FadeInView';
import { MascotAssistant } from '@/components/mascot/MascotAssistant';
import { NotificationBellButton } from '@/components/NotificationBellButton';
import { PressableScale } from '@/components/PressableScale';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { RequestCard } from '@/components/RequestCard';
import { SkeletonBlock, SkeletonCardList } from '@/components/SkeletonBlock';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { MascotMessages } from '@/constants/mascotMessages';
import { useDashboard } from '@/hooks/queries/useDashboard';
import { useExpediente } from '@/hooks/queries/useExpediente';
import type { Solicitud } from '@/types/request';
import { getErrorMessage } from '@/utils/errors';
import { getGreeting } from '@/utils/dates';
import { joinName } from '@/utils/formatters';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HEADER_TOP_EXTRA = 20;
const HEADER_BOTTOM = 22;
const HEADER_HORIZONTAL = 20;

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data, isLoading, isError, error, refetch, isRefetching } = useDashboard();
  const expediente = useExpediente();

  const perfil = data?.perfil;
  const nombre = joinName(perfil?.nombre, perfil?.apellidos);
  const primerNombre = nombre?.split(' ')[0];
  const puesto = perfil?.puesto;
  const empresa = perfil?.empresa;

  const diasDisponibles = data?.vacaciones?.dias_disponibles;
  const diasEnSolicitud = data?.vacaciones?.dias_en_solicitud ?? 0;
  const noLeidas = data?.notificaciones?.no_leidas ?? 0;
  const solicitudesRecientes = useMemo(
    () => (Array.isArray(data?.solicitudes_recientes) ? (data?.solicitudes_recientes as Solicitud[]) : []),
    [data],
  );
  const enProceso = solicitudesRecientes.filter((item) => item.estado === 'enviada' || item.estado === 'en_revision').length;

  const expedienteStats = useMemo(() => {
    const documentos = expediente.data?.documentos ?? [];
    let pendientes = 0;
    let rechazados = 0;
    for (const entry of documentos) {
      const status = entry.documento?.status;
      if (status === 'rechazado' || status === 'requiere_correccion' || status === 'vencido') rechazados++;
      else if (status !== 'aprobado') pendientes++;
    }
    return { pendientes, rechazados };
  }, [expediente.data]);

  // Prioridad del home dinámico (AGENTS.md): 1) documento rechazado, 2) expediente
  // incompleto, 3) aprobación pendiente, 4) solicitud requiere corrección, 5) notificaciones.
  const priorityMascot = useMemo(() => {
    if (expedienteStats.rechazados > 0) {
      return {
        type: 'warning' as const,
        priority: 'high' as const,
        message:
          expedienteStats.rechazados === 1
            ? 'Un documento de tu expediente necesita corrección.'
            : `${expedienteStats.rechazados} documentos de tu expediente necesitan corrección.`,
        actionLabel: 'Ver expediente',
        onAction: () => router.push('/(app)/(tabs)/expediente'),
      };
    }
    if (expedienteStats.pendientes > 0) {
      return {
        type: 'tip' as const,
        priority: 'normal' as const,
        message: MascotMessages.documentosPendientes(expedienteStats.pendientes),
        actionLabel: 'Completar expediente',
        onAction: () => router.push('/(app)/(tabs)/expediente'),
      };
    }
    const requiresCorrection = solicitudesRecientes.find((item) => item.estado === 'requiere_correccion');
    if (requiresCorrection) {
      return {
        type: 'warning' as const,
        priority: 'normal' as const,
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
    return null;
  }, [expedienteStats, solicitudesRecientes, noLeidas, router]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + HEADER_TOP_EXTRA }]}>
        <PressableScale
          accessibilityLabel="Ir a mi perfil"
          onPress={() => router.push('/(app)/(tabs)/perfil')}
          haptic={false}
          style={styles.headerLeft}>
          <ProfileAvatar name={nombre} fotoUrlApi={perfil?.foto_url_api} fotoUrl={perfil?.foto_url} size={48} />
          <View style={styles.headerText}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.name} numberOfLines={1}>
              {primerNombre ?? 'Colaborador'}
            </Text>
            {puesto || empresa ? (
              <Text style={styles.role} numberOfLines={1}>
                {[puesto, empresa].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
          </View>
        </PressableScale>
        <NotificationBellButton unreadCount={noLeidas} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={Colors.primary} />
        }>
        {isLoading ? (
          <View style={styles.skeletonWrapper}>
            <SkeletonBlock height={110} radius={Radius.lg} />
            <SkeletonCardList count={3} />
          </View>
        ) : isError ? (
          <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
        ) : (
          <>
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
              <Card style={styles.expedienteCard} onPress={() => router.push('/(app)/(tabs)/expediente')}>
                <View style={styles.expedienteHeaderRow}>
                  <Text style={styles.expedienteTitle}>Tu expediente</Text>
                  {expediente.data ? <Text style={styles.expedientePercent}>{Math.round(expediente.data.resumen.porcentaje)}%</Text> : null}
                </View>
                {expediente.data ? (
                  <>
                    <AnimatedProgressBar percent={expediente.data.resumen.porcentaje} />
                    <Text style={styles.expedienteCaption}>
                      {expedienteStats.pendientes + expedienteStats.rechazados === 0
                        ? 'Todo en orden.'
                        : `${expedienteStats.pendientes + expedienteStats.rechazados} documentos por atender`}
                    </Text>
                  </>
                ) : expediente.isError ? (
                  <Text style={styles.expedienteCaption}>No pudimos cargar tu expediente. Toca para reintentar.</Text>
                ) : (
                  <SkeletonBlock height={8} radius={Radius.full} />
                )}
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
              <QuickAction icon="briefcase-outline" label="Mi incorporación" onPress={() => router.push('/incorporacion')} />
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: HEADER_HORIZONTAL,
    paddingBottom: HEADER_BOTTOM,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flexShrink: 1,
  },
  headerText: {
    flexShrink: 1,
    gap: 1,
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
  role: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
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
  expedienteCard: {
    gap: Spacing.sm,
  },
  expedienteHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expedienteTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  expedientePercent: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  expedienteCaption: {
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
