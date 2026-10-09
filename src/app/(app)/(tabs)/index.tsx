import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AniversarioHeroCard } from '@/components/AniversarioHeroCard';
import { BirthdayHeroCard } from '@/components/BirthdayHeroCard';
import { BirthdayWallBanner } from '@/components/BirthdayWallBanner';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { FadeInView } from '@/components/FadeInView';
import { MascotAssistant } from '@/components/mascot/MascotAssistant';
import { NotificationBellButton } from '@/components/NotificationBellButton';
import { PressableScale } from '@/components/PressableScale';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { RequestCard } from '@/components/RequestCard';
import { SkeletonBlock, SkeletonCardList } from '@/components/SkeletonBlock';
import { FontSize, Layout, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import { MascotMessages } from '@/constants/mascotMessages';
import { useBirthdayGreeting } from '@/hooks/queries/useBirthday';
import { useCelebracionesActivas } from '@/hooks/queries/useCelebraciones';
import { LoQueNecesitasHacer } from '@/components/ciclo/LoQueNecesitasHacer';
import { useDatosFaltantes, useMiProceso, useMisPrestamos, useMisRecibos } from '@/hooks/queries/useCicloLaboral';
import { useDashboard } from '@/hooks/queries/useDashboard';
import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';
import { useEquipo, useEquipoPendientes, useTareasConteos } from '@/hooks/queries/useTrabajo';
import type { Solicitud } from '@/types/request';
import { getErrorMessage } from '@/utils/errors';
import { formatDateShort, getGreeting } from '@/utils/dates';
import { isFeatureEnabled } from '@/utils/featureFlags';
import { formatCurrencyMXN, joinName, pluralize } from '@/utils/formatters';
import { prestamoEstadoLabel, prestamoVigente } from '@/utils/loan';
import { hasAnyPermission, isSelfServiceModuleEnabled } from '@/utils/modules';
import { reciboPeriodoLabel } from '@/utils/payroll';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HEADER_TOP_EXTRA = 20;
const HEADER_BOTTOM = 22;
const HEADER_HORIZONTAL = 20;

export default function DashboardScreen() {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data, isLoading, isError, error, refetch, isRefetching } = useDashboard();
  // Mismo queryKey/staleTime que `(app)/_layout.tsx` — lectura de caché.
  // AGENTS.md sección 16: la card de cumpleaños y el acceso rápido a
  // Vacaciones no deben mostrarse cuando el backend apaga esos features.
  const bootstrap = useMobileBootstrap(true);
  const cumpleanosEnabled = isFeatureEnabled(bootstrap.data?.features, 'cumpleanos');
  const vacacionesEnabled = isFeatureEnabled(bootstrap.data?.features, 'vacaciones');
  // Ciclo laboral (backend 2026-09-22) — API estable, ver `utils/modules.ts`.
  const features = bootstrap.data?.features;
  const permissions = bootstrap.data?.user.permissions;
  const documentosLaboralesEnabled = isSelfServiceModuleEnabled(features, 'documentos_laborales');
  const recibosEnabled = isSelfServiceModuleEnabled(features, 'recibos');
  const prestamosEnabled = isSelfServiceModuleEnabled(features, 'prestamos');
  const contratosEnabled = isSelfServiceModuleEnabled(features, 'contratos');
  const tareasEnabled = isSelfServiceModuleEnabled(features, 'tareas');
  const equipoEnabled = isSelfServiceModuleEnabled(features, 'equipo');
  const evaluacionesEnabled = isSelfServiceModuleEnabled(features, 'evaluaciones');
  const birthday = useBirthdayGreeting(cumpleanosEnabled);
  // Aniversario laboral: sistema aparte de cumpleaños (sin feature flag —
  // `GET /celebraciones/activas` ya filtra por policy). Se prioriza el
  // propio; si no, el primer compañero visible hoy. Cumpleaños ya tiene su
  // propia tarjeta arriba, así que aquí solo se busca `aniversario_laboral`.
  const celebracionesActivas = useCelebracionesActivas();
  const aniversarioHoy = useMemo(() => {
    const aniversarios = celebracionesActivas.data?.filter((c) => c.tipo === 'aniversario_laboral') ?? [];
    return aniversarios.find((c) => c.es_mia) ?? aniversarios[0];
  }, [celebracionesActivas.data]);

  // FUENTE ÚNICA del estado del ciclo: el backend dice qué toca hacer
  // (documentos, firmas, lecciones…). La app no recalcula etapas.
  const miProceso = useMiProceso();
  // «Completa tu información»: datos personales que faltan (RH los autoriza).
  const datosFaltantes = useDatosFaltantes();
  const recibos = useMisRecibos(recibosEnabled);
  const prestamos = useMisPrestamos(prestamosEnabled);
  const tareasConteos = useTareasConteos(tareasEnabled);
  // "Mi equipo" se decide con la jerarquía REAL que devuelve el backend
  // (subordinados o pendientes), no con el nombre del rol.
  const equipo = useEquipo(equipoEnabled);
  const equipoPendientes = useEquipoPendientes(equipoEnabled);

  const tareasAbiertas = tareasConteos.data?.abiertas ?? 0;
  const reciboReciente = recibos.data?.pages[0]?.data[0] ?? null;
  const prestamoActivo = prestamoVigente(prestamos.data);
  const equipoCount = equipo.data?.length ?? 0;
  const equipoPendientesCount =
    (equipoPendientes.data?.solicitudes.filter((s) => s.requiere_visto_bueno && !s.visto_bueno).length ?? 0) +
    (equipoPendientes.data?.evaluaciones.length ?? 0);
  const esJefe = equipoCount > 0 || equipoPendientesCount > 0;
  const puedeVerEvaluaciones = evaluacionesEnabled && (esJefe || hasAnyPermission(permissions, ['evaluaciones.ver', 'evaluaciones.autorizar']));

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

  // Avisos que NO son del ciclo laboral (ese lo pinta "Lo que necesitas
  // hacer" con mi-proceso): solicitud por corregir, vacaciones en espera,
  // notificaciones.
  const priorityMascot = useMemo(() => {
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
    if (diasEnSolicitud > 0) {
      return {
        type: 'tip' as const,
        priority: 'normal' as const,
        message: `Tienes ${diasEnSolicitud} ${diasEnSolicitud === 1 ? 'día' : 'días'} de vacaciones en espera de aprobación.`,
        actionLabel: 'Ver vacaciones',
        onAction: () => router.push('/(app)/(tabs)/vacaciones'),
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
  }, [solicitudesRecientes, diasEnSolicitud, noLeidas, router]);

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
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              void refetch();
              void miProceso.refetch();
              void datosFaltantes.refetch();
              if (tareasEnabled) void tareasConteos.refetch();
              if (equipoEnabled) void equipoPendientes.refetch();
            }}
            tintColor={Colors.primary}
          />
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
            {birthday.data ? (
              <FadeInView index={0}>
                <BirthdayHeroCard greeting={birthday.data} primerNombre={primerNombre} />
              </FadeInView>
            ) : null}

            {aniversarioHoy ? (
              <FadeInView index={birthday.data ? 1 : 0}>
                <AniversarioHeroCard celebracion={aniversarioHoy} />
              </FadeInView>
            ) : null}

            <BirthdayWallBanner enabled={cumpleanosEnabled} />

            {priorityMascot ? (
              <MascotAssistant
                message={priorityMascot.message}
                type={priorityMascot.type}
                priority={priorityMascot.priority}
                actionLabel={priorityMascot.actionLabel}
                onAction={priorityMascot.onAction}
              />
            ) : null}

            {datosFaltantes.data && !datosFaltantes.data.completo ? (
              <FadeInView index={0}>
                <PressableScale
                  accessibilityLabel="Completar mi información"
                  onPress={() => router.push('/completar-datos' as never)}
                  style={styles.datosCard}>
                  <View style={styles.datosIcon}>
                    <Ionicons name={datosFaltantes.data.solicitud_en_revision ? 'hourglass-outline' : 'id-card-outline'} size={22} color={Colors.white} />
                  </View>
                  <View style={styles.datosText}>
                    <Text style={styles.datosTitle}>
                      {datosFaltantes.data.solicitud_en_revision ? 'Tus datos están en revisión' : 'Completa tu información'}
                    </Text>
                    <Text style={styles.datosSubtitle} numberOfLines={2}>
                      {datosFaltantes.data.solicitud_en_revision
                        ? 'Recursos Humanos está revisando los datos que enviaste.'
                        : `Falta: ${datosFaltantes.data.faltan.map((d) => d.etiqueta).join(', ')}`}
                    </Text>
                  </View>
                  {datosFaltantes.data.solicitud_en_revision ? null : <Text style={styles.datosAction}>Completar</Text>}
                </PressableScale>
              </FadeInView>
            ) : null}

            <FadeInView index={0}>
              <LoQueNecesitasHacer
                data={miProceso.data}
                isLoading={miProceso.isLoading}
                isError={miProceso.isError}
                onRetry={() => void miProceso.refetch()}
              />
            </FadeInView>

            <View style={styles.statGrid}>
              {vacacionesEnabled ? (
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
              ) : null}
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

            {/* Pendientes por atender: tareas (acciones) — separadas de las
                notificaciones (avisos), que viven en la campana. */}
            {tareasEnabled && tareasAbiertas > 0 ? (
              <FadeInView index={2}>
                <Card style={styles.laborDocsCard} onPress={() => router.push('/tareas')}>
                  <View style={styles.laborDocsHeaderRow}>
                    <Text style={styles.laborDocsTitle}>Pendientes por atender</Text>
                    <View style={styles.laborDocsBadge}>
                      <Text style={styles.laborDocsBadgeText}>
                        {tareasAbiertas} {pluralize(tareasAbiertas, 'tarea', 'tareas')}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.laborDocsItem}>
                    {tareasConteos.data?.vencidas ? `${tareasConteos.data.vencidas} vencida(s). ` : ''}Toca para ver tu bandeja.
                  </Text>
                </Card>
              </FadeInView>
            ) : null}

            {equipoEnabled && esJefe ? (
              <FadeInView index={2}>
                <Card style={styles.laborDocsCard} onPress={() => router.push('/equipo')}>
                  <View style={styles.laborDocsHeaderRow}>
                    <Text style={styles.laborDocsTitle}>Mi equipo</Text>
                    {equipoPendientesCount > 0 ? (
                      <View style={styles.laborDocsBadge}>
                        <Text style={styles.laborDocsBadgeText}>
                          {equipoPendientesCount} {pluralize(equipoPendientesCount, 'pendiente', 'pendientes')}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.laborDocsItem}>
                    {equipoCount} {pluralize(equipoCount, 'colaborador directo', 'colaboradores directos')} · vistos buenos y evaluaciones
                  </Text>
                </Card>
              </FadeInView>
            ) : null}

            {recibosEnabled && reciboReciente ? (
              <FadeInView index={3}>
                <Card
                  style={styles.laborDocsCard}
                  onPress={() => router.push({ pathname: '/recibos/[id]', params: { id: String(reciboReciente.id) } })}>
                  <View style={styles.laborDocsHeaderRow}>
                    <Text style={styles.laborDocsTitle}>Último recibo</Text>
                    <Text style={styles.expedientePercent}>{formatCurrencyMXN(reciboReciente.neto)}</Text>
                  </View>
                  <Text style={styles.laborDocsItem}>
                    {reciboPeriodoLabel(reciboReciente)}
                    {reciboReciente.fecha_pago ? ` · pago ${formatDateShort(reciboReciente.fecha_pago)}` : ''}
                  </Text>
                  <Text style={styles.expedienteCaption}>Tus recibos de nómina</Text>
                </Card>
              </FadeInView>
            ) : null}

            {prestamosEnabled && prestamoActivo ? (
              <FadeInView index={3}>
                <Card
                  style={styles.laborDocsCard}
                  onPress={() => router.push({ pathname: '/prestamos/[id]', params: { id: String(prestamoActivo.id) } })}>
                  <View style={styles.laborDocsHeaderRow}>
                    <Text style={styles.laborDocsTitle}>Préstamo</Text>
                    <Text style={styles.laborDocsItem}>{prestamoEstadoLabel(prestamoActivo.estado)}</Text>
                  </View>
                  <Text style={styles.laborDocsItem}>
                    Autorizado {formatCurrencyMXN(prestamoActivo.monto_autorizado)}
                    {prestamoActivo.saldo_informativo !== null ? ` · saldo administrativo ${formatCurrencyMXN(prestamoActivo.saldo_informativo)}` : ''}
                  </Text>
                </Card>
              </FadeInView>
            ) : null}

            <Text style={styles.sectionTitle}>Accesos rápidos</Text>
            <View style={styles.quickGrid}>
              <QuickAction icon="add-circle-outline" label="Nueva solicitud" onPress={() => router.push('/solicitud/nueva')} />
              {documentosLaboralesEnabled ? (
                <QuickAction
                  icon="folder-outline"
                  label="Documentos laborales"
                  onPress={() => router.push('/documentos-laborales')}
                />
              ) : null}
              {recibosEnabled ? <QuickAction icon="receipt-outline" label="Mis recibos" onPress={() => router.push('/recibos')} /> : null}
              {contratosEnabled ? <QuickAction icon="document-text-outline" label="Mis contratos" onPress={() => router.push('/contratos')} /> : null}
              {prestamosEnabled ? <QuickAction icon="cash-outline" label="Préstamos" onPress={() => router.push('/prestamos')} /> : null}
              {puedeVerEvaluaciones ? (
                <QuickAction icon="clipboard-outline" label="Evaluaciones" onPress={() => router.push('/evaluaciones')} />
              ) : tareasEnabled ? (
                <QuickAction icon="checkbox-outline" label="Tareas" onPress={() => router.push('/tareas')} />
              ) : null}
              {(miProceso.data?.lecciones.length ?? 0) > 0 ? (
                <QuickAction icon="school-outline" label="Mis lecciones" onPress={() => router.push('/lecciones')} />
              ) : null}
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
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
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
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  return (
    <PressableScale accessibilityLabel={label} onPress={onPress} style={styles.quickAction}>
      <View style={styles.quickIcon}>
        <Ionicons name={icon} size={22} color={Colors.primaryDark} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </PressableScale>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
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
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    alignSelf: 'center',
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
  expedienteTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  expedienteIcon: {
    width: 26,
    height: 26,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
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
  expedienteCaptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  expedienteCaption: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  expedienteCta: {
    marginTop: Spacing.xs,
    alignSelf: 'flex-start',
    minHeight: 40,
    paddingHorizontal: Spacing.md,
  },
  datosCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.warningSoft,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  datosIcon: { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: Colors.warning, alignItems: 'center', justifyContent: 'center' },
  datosText: { flex: 1 },
  datosTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  datosSubtitle: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  datosAction: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.primaryDark },
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
  laborDocsCard: {
    gap: Spacing.xs,
  },
  laborDocsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  laborDocsTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  laborDocsBadge: {
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  laborDocsBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  laborDocsItem: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontWeight: '600',
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
