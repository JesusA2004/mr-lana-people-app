import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { AniversarioHeroCard } from '@/components/AniversarioHeroCard';
import { BirthdayHeroCard } from '@/components/BirthdayHeroCard';
import { BirthdayWallBanner } from '@/components/BirthdayWallBanner';
import { CartaCompromisoBanner } from '@/components/CartaCompromisoBanner';
import { LoQueNecesitasHacer } from '@/components/ciclo/LoQueNecesitasHacer';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { FadeInView } from '@/components/FadeInView';
import { NotificationBellButton } from '@/components/NotificationBellButton';
import { RequestCard } from '@/components/RequestCard';
import { SkeletonBlock, SkeletonCardList } from '@/components/SkeletonBlock';
import {
  AccesoRapido,
  EncabezadoSaludo,
  FilaLista,
  GrupoLista,
  RejillaAccesos,
  SeccionTitulo,
  TarjetaAviso,
  TarjetaResumen,
  textoConteo,
} from '@/components/ui';
import { Layout, Radius, Spacing } from '@/constants/colors';
import { useBirthdayGreeting } from '@/hooks/queries/useBirthday';
import { useCelebracionesActivas } from '@/hooks/queries/useCelebraciones';
import { useDatosFaltantes, useMiProceso, useMisPrestamos, useMisRecibos } from '@/hooks/queries/useCicloLaboral';
import { useDashboard } from '@/hooks/queries/useDashboard';
import { useMiDescriptivoPuesto } from '@/hooks/queries/useDescriptivoPuesto';
import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';
import { useAprobacionesConteo, useEsAutorizadorRh } from '@/hooks/queries/useAprobaciones';
import { useEquipo, useEquipoPendientes, useTareasConteos } from '@/hooks/queries/useTrabajo';
import { usePermisos } from '@/hooks/usePermisos';
import { useAuthStore } from '@/store/authStore';
import { useColores } from '@/theme/ThemeProvider';
import type { Solicitud } from '@/types/request';
import { formatDateShort, getGreeting } from '@/utils/dates';
import { descriptivoPendiente } from '@/utils/descriptivoPuesto';
import { getErrorMessage } from '@/utils/errors';
import { isFeatureEnabled } from '@/utils/featureFlags';
import { formatCurrencyMXN, joinName, pluralize } from '@/utils/formatters';
import { textoProgreso } from '@/utils/induccion';
import { prestamoEstadoLabel, prestamoVigente } from '@/utils/loan';
import { isSelfServiceModuleEnabled } from '@/utils/modules';
import { openCrossExperienceRoute } from '@/utils/crossNavigation';
import { reciboPeriodoLabel } from '@/utils/payroll';

/**
 * Inicio de Mi espacio. Jerarquía (de arriba abajo):
 * 1. Saludo + campana (identidad, avisos).
 * 2. Celebraciones del día.
 * 3. LO QUE REQUIERE ACCIÓN: datos faltantes, mi proceso, descriptivo,
 *    inducción, solicitud por corregir (avisos de alto contraste).
 * 4. Indicadores (vacaciones, solicitudes en proceso).
 * 5. «Para ti»: tareas, equipo, último recibo, préstamo (lista agrupada).
 * 6. Accesos rápidos (rejilla de 3) y solicitudes recientes.
 * Todo dato y regla viene del backend: aquí solo se ordena y se pinta.
 */
export default function DashboardScreen() {
  const Colors = useColores();
  const router = useRouter();
  const refrescarUsuario = useAuthStore((state) => state.refrescarUsuario);

  const { data, isLoading, isError, error, refetch, isRefetching } = useDashboard();
  // Mismo queryKey/staleTime que `(app)/_layout.tsx` — lectura de caché.
  // AGENTS.md sección 16: la card de cumpleaños y el acceso rápido a
  // Vacaciones no deben mostrarse cuando el backend apaga esos features.
  const bootstrap = useMobileBootstrap(true);
  const cumpleanosEnabled = isFeatureEnabled(bootstrap.data?.features, 'cumpleanos');
  const vacacionesEnabled = isFeatureEnabled(bootstrap.data?.features, 'vacaciones');
  // Ciclo laboral (backend 2026-09-22) — API estable, ver `utils/modules.ts`.
  const features = bootstrap.data?.features;
  const documentosLaboralesEnabled = isSelfServiceModuleEnabled(features, 'documentos_laborales');
  const recibosEnabled = isSelfServiceModuleEnabled(features, 'recibos');
  const prestamosEnabled = isSelfServiceModuleEnabled(features, 'prestamos');
  const tareasEnabled = isSelfServiceModuleEnabled(features, 'tareas');
  const equipoEnabled = isSelfServiceModuleEnabled(features, 'equipo');
  const birthday = useBirthdayGreeting(cumpleanosEnabled);
  // Aniversario laboral: sistema aparte de cumpleaños (sin feature flag —
  // `GET /celebraciones/activas` ya filtra por policy). Se prioriza el
  // propio; si no, el primer compañero visible hoy.
  const celebracionesActivas = useCelebracionesActivas();
  const aniversarioHoy = useMemo(() => {
    const aniversarios = celebracionesActivas.data?.filter((c) => c.tipo === 'aniversario_laboral') ?? [];
    return aniversarios.find((c) => c.es_mia) ?? aniversarios[0];
  }, [celebracionesActivas.data]);

  // FUENTE ÚNICA del estado del ciclo: el backend dice qué toca hacer
  // (documentos, firmas, lecciones…). La app no recalcula etapas.
  const miProceso = useMiProceso();
  const induccion = miProceso.data?.induccion ?? null;
  // Descriptivo de puesto que RH envió tras aprobar la inducción: pendiente de «OK, enterado».
  const descriptivo = useMiDescriptivoPuesto();
  const descriptivoPorLeer = descriptivoPendiente(descriptivo.data);
  // «Completa tu información»: datos personales que faltan (RH los autoriza).
  const datosFaltantes = useDatosFaltantes();
  const recibos = useMisRecibos(recibosEnabled);
  const prestamos = useMisPrestamos(prestamosEnabled);
  const tareasConteos = useTareasConteos(tareasEnabled);
  // Modo colaborador y modo operativo NUNCA se mezclan (docs/ROLES_Y_NAVEGACION.md):
  // si la cuenta tiene Gestión RH, aprobar, «Mi equipo» y evaluaciones viven
  // allá; aquí solo queda un aviso para cambiar cuando algo le espera. Sin
  // Gestión RH (p. ej. un supervisor), Mi espacio es su único lugar.
  const permisos = usePermisos();
  const operacionAqui = !permisos.operacionEnGestionRh;
  // "Mi equipo" se decide con la jerarquía REAL que devuelve el backend
  // (subordinados o pendientes), no con el nombre del rol.
  const equipo = useEquipo(equipoEnabled && operacionAqui);
  const equipoPendientes = useEquipoPendientes(equipoEnabled && operacionAqui);

  const tareasAbiertas = tareasConteos.data?.abiertas ?? 0;
  const reciboReciente = recibos.data?.pages[0]?.data[0] ?? null;
  const prestamoActivo = prestamoVigente(prestamos.data);
  const equipoCount = equipo.data?.length ?? 0;
  const equipoPendientesCount =
    (equipoPendientes.data?.aprobar.length ?? 0) +
    (equipoPendientes.data?.evaluaciones.length ?? 0);
  const esJefe = equipoCount > 0 || equipoPendientesCount > 0 || (equipoPendientes.data?.en_espera.length ?? 0) > 0;
  // Badge único del motor de aprobaciones: solo lo que la cuenta puede aprobar AHORA.
  const esAutorizadorRh = useEsAutorizadorRh();
  const aprobacionesConteo = useAprobacionesConteo(!operacionAqui || (equipoEnabled && esJefe) || esAutorizadorRh);
  const aprobacionesPendientes = aprobacionesConteo.data?.total ?? 0;
  const muestraAprobaciones = operacionAqui && ((equipoEnabled && esJefe) || esAutorizadorRh || aprobacionesPendientes > 0);
  // Con Gestión RH: solo el aviso «te esperan N en Gestión RH» (nunca botones operativos aquí).
  const aprobacionesEnGestionRh = !operacionAqui && aprobacionesPendientes > 0;
  // Correcciones que esperan algo de la persona (responder a RH / volver a subir).
  const correccionesPendientes = bootstrap.data?.counts.correcciones_pendientes ?? 0;

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
  const porCorregir = solicitudesRecientes.find((item) => item.estado === 'requiere_correccion');

  const datos = datosFaltantes.data;
  const muestraDatos = Boolean(datos && !datos.completo);
  const tienePendientesParaTi =
    (tareasEnabled && tareasAbiertas > 0) || (equipoEnabled && esJefe) || muestraAprobaciones || (recibosEnabled && reciboReciente) || (prestamosEnabled && prestamoActivo);

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <EncabezadoSaludo
        saludo={getGreeting()}
        nombre={primerNombre ?? 'Colaborador'}
        nombreCompleto={nombre}
        detalle={[puesto, empresa].filter(Boolean).join(' · ') || null}
        foto={{ fotoUrlApi: perfil?.foto_url_api, fotoUrl: perfil?.foto_url }}
        onPressAvatar={() => router.push('/(app)/(tabs)/perfil')}
        derecha={<NotificationBellButton unreadCount={noLeidas} />}
      />

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
              if (equipoEnabled && operacionAqui) void equipoPendientes.refetch();
              if (aprobacionesConteo.isEnabled) void aprobacionesConteo.refetch();
              // Carta compromiso / documentos pendientes vienen en `/me`.
              void refrescarUsuario();
            }}
            tintColor={Colors.primary}
          />
        }>
        {isLoading ? (
          <View style={styles.skeletonWrapper}>
            <SkeletonBlock height={96} radius={Radius.lg} />
            <View style={styles.statGrid}>
              <View style={styles.statFlex}>
                <SkeletonBlock height={128} radius={Radius.lg} />
              </View>
              <View style={styles.statFlex}>
                <SkeletonBlock height={128} radius={Radius.lg} />
              </View>
            </View>
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

            {/* ── Lo que requiere tu acción ─────────────────────────────── */}
            {/* Carta compromiso vigente: documentos por subir antes de la fecha límite. */}
            <CartaCompromisoBanner />
            {muestraDatos && datos ? (
              <FadeInView index={0}>
                <TarjetaAviso
                  icono={datos.solicitud_en_revision ? 'hourglass-outline' : 'id-card-outline'}
                  tono={datos.solicitud_en_revision ? 'info' : 'aviso'}
                  titulo={datos.solicitud_en_revision ? 'Tus datos están en revisión' : 'Completa tu información'}
                  mensaje={
                    datos.solicitud_en_revision
                      ? 'Recursos Humanos está revisando los datos que enviaste.'
                      : `Falta: ${datos.faltan.map((d) => d.etiqueta).join(', ')}`
                  }
                  accion={datos.solicitud_en_revision ? undefined : 'Completar ahora'}
                  onPress={() => router.push('/completar-datos' as never)}
                />
              </FadeInView>
            ) : null}

            {correccionesPendientes > 0 ? (
              <FadeInView index={0}>
                <TarjetaAviso
                  icono="chatbubble-ellipses-outline"
                  tono="aviso"
                  titulo={correccionesPendientes === 1 ? 'Una corrección necesita tu respuesta' : `${correccionesPendientes} correcciones necesitan tu respuesta`}
                  mensaje="Recursos Humanos te pidió información o corregir un documento."
                  accion="Ver mis correcciones"
                  onPress={() => router.push('/correcciones')}
                />
              </FadeInView>
            ) : null}

            {porCorregir && correccionesPendientes === 0 ? (
              <FadeInView index={0}>
                <TarjetaAviso
                  icono="create-outline"
                  tono="peligro"
                  titulo="Una solicitud necesita corrección"
                  mensaje={`${porCorregir.tipo_etiqueta ?? 'Tu solicitud'}${porCorregir.folio ? ` · ${porCorregir.folio}` : ''}. Revisa lo que pidió Recursos Humanos y corrígela.`}
                  accion="Ver solicitud"
                  onPress={() => router.push({ pathname: '/solicitud/[id]', params: { id: String(porCorregir.id) } })}
                />
              </FadeInView>
            ) : null}

            {miProceso.isLoading || miProceso.isError || (miProceso.data?.pendientes.length ?? 0) > 0 ? (
              <FadeInView index={0}>
                <LoQueNecesitasHacer
                  data={miProceso.data}
                  isLoading={miProceso.isLoading}
                  isError={miProceso.isError}
                  onRetry={() => void miProceso.refetch()}
                />
              </FadeInView>
            ) : null}

            {descriptivoPorLeer && descriptivo.data ? (
              <FadeInView index={1}>
                <TarjetaAviso
                  icono="briefcase-outline"
                  tono="primario"
                  titulo="Lee tu descriptivo de puesto"
                  mensaje={`${descriptivo.data.descriptivo.nombrePuesto} · Tus actividades y responsabilidades.`}
                  accion="Leer y confirmar"
                  onPress={() => router.push('/descriptivo-puesto')}
                />
              </FadeInView>
            ) : null}

            {/* Inducción Mr. Lana: progreso guardado en el servidor (mi-proceso). */}
            {induccion ? (
              <FadeInView index={1}>
                <GrupoLista>
                  <FilaLista
                    icono="book-outline"
                    tono={induccion.completado ? 'exito' : 'primario'}
                    titulo={induccion.titulo}
                    subtitulo={`${textoProgreso(induccion)} · ${
                      miProceso.data?.evaluacionInduccion?.puedePresentar
                        ? 'Tu evaluación está lista'
                        : induccion.completado
                          ? 'Contenido completado'
                          : 'Continúa donde te quedaste'
                    }`}
                    valor={`${induccion.porcentaje} %`}
                    onPress={() => router.push('/induccion')}
                  />
                </GrupoLista>
              </FadeInView>
            ) : null}

            {aprobacionesEnGestionRh ? (
              <FadeInView index={1}>
                <TarjetaAviso
                  icono="checkmark-done-outline"
                  tono="aviso"
                  titulo={aprobacionesPendientes === 1 ? 'Una aprobación te espera' : `${aprobacionesPendientes} aprobaciones te esperan`}
                  mensaje="Se deciden en Gestión RH, junto con tu equipo y sus evaluaciones."
                  accion="Ir a Gestión RH"
                  onPress={() => openCrossExperienceRoute('/aprobaciones', 'rh')}
                />
              </FadeInView>
            ) : null}

            {/* ── Indicadores ──────────────────────────────────────────── */}
            <View style={styles.statGrid}>
              {vacacionesEnabled ? (
                <FadeInView index={1} style={styles.statFlex}>
                  <TarjetaResumen
                    icono="airplane-outline"
                    etiqueta="Días de vacaciones"
                    valor={typeof diasDisponibles === 'number' ? diasDisponibles : '—'}
                    nota={diasEnSolicitud > 0 ? `${diasEnSolicitud} en solicitud` : 'Disponibles'}
                    destacada
                    onPress={() => router.push('/(app)/(tabs)/vacaciones')}
                  />
                </FadeInView>
              ) : null}
              <FadeInView index={2} style={styles.statFlex}>
                <TarjetaResumen
                  icono="document-text-outline"
                  etiqueta="Solicitudes en proceso"
                  valor={enProceso}
                  nota="Toca para verlas"
                  tono="info"
                  onPress={() => router.push('/(app)/(tabs)/solicitudes')}
                />
              </FadeInView>
            </View>

            {/* ── Para ti: tareas (acciones), equipo, nómina, préstamo ─── */}
            {tienePendientesParaTi ? (
              <FadeInView index={2}>
                <GrupoLista titulo="Para ti">
                  {tareasEnabled && tareasAbiertas > 0 ? (
                    <FilaLista
                      icono="checkbox-outline"
                      tono={tareasConteos.data?.vencidas ? 'peligro' : 'aviso'}
                      titulo="Pendientes por atender"
                      subtitulo={
                        tareasConteos.data?.vencidas
                          ? `${tareasConteos.data.vencidas} ${pluralize(tareasConteos.data.vencidas, 'vencida', 'vencidas')} · Toca para ver tu bandeja`
                          : 'Toca para ver tu bandeja'
                      }
                      badge={tareasAbiertas}
                      onPress={() => router.push('/tareas')}
                    />
                  ) : null}
                  {muestraAprobaciones ? (
                    <FilaLista
                      icono="checkmark-done-outline"
                      tono={aprobacionesPendientes > 0 ? 'aviso' : 'primario'}
                      titulo="Aprobaciones"
                      subtitulo={aprobacionesPendientes > 0 ? 'Solicitudes que esperan tu decisión' : 'Estás al día · toca para ver las que vienen'}
                      badge={aprobacionesPendientes}
                      onPress={() => router.push('/aprobaciones')}
                    />
                  ) : null}
                  {equipoEnabled && esJefe ? (
                    <FilaLista
                      icono="people-outline"
                      titulo="Mi equipo"
                      subtitulo={`${equipoCount} ${pluralize(equipoCount, 'colaborador directo', 'colaboradores directos')} · vistos buenos y evaluaciones`}
                      pill={
                        equipoPendientesCount > 0
                          ? { texto: textoConteo(equipoPendientesCount, 'pendiente', 'pendientes') ?? '', tono: 'aviso' }
                          : undefined
                      }
                      onPress={() => router.push('/equipo')}
                    />
                  ) : null}
                  {recibosEnabled && reciboReciente ? (
                    <FilaLista
                      icono="receipt-outline"
                      tono="exito"
                      titulo="Último recibo"
                      subtitulo={`${reciboPeriodoLabel(reciboReciente)}${reciboReciente.fecha_pago ? ` · pago ${formatDateShort(reciboReciente.fecha_pago)}` : ''}`}
                      valor={formatCurrencyMXN(reciboReciente.neto)}
                      onPress={() => router.push({ pathname: '/recibos/[id]', params: { id: String(reciboReciente.id) } })}
                    />
                  ) : null}
                  {prestamosEnabled && prestamoActivo ? (
                    <FilaLista
                      icono="cash-outline"
                      titulo={`Préstamo · ${prestamoEstadoLabel(prestamoActivo.estado)}`}
                      subtitulo={`Autorizado ${formatCurrencyMXN(prestamoActivo.monto_autorizado)}${
                        prestamoActivo.saldo_informativo !== null ? ` · saldo administrativo ${formatCurrencyMXN(prestamoActivo.saldo_informativo)}` : ''
                      }`}
                      onPress={() => router.push({ pathname: '/prestamos/[id]', params: { id: String(prestamoActivo.id) } })}
                    />
                  ) : null}
                </GrupoLista>
              </FadeInView>
            ) : null}

            {/* ── Accesos rápidos ─────────────────────────────────────── */}
            <SeccionTitulo titulo="Accesos rápidos" />
            <RejillaAccesos>
              <AccesoRapido icono="add-circle-outline" etiqueta="Nueva solicitud" onPress={() => router.push('/solicitud/nueva')} />
              {documentosLaboralesEnabled ? (
                <AccesoRapido icono="folder-outline" etiqueta="Documentos laborales" onPress={() => router.push('/documentos-laborales')} />
              ) : null}
              {recibosEnabled ? <AccesoRapido icono="receipt-outline" etiqueta="Mis recibos" onPress={() => router.push('/recibos')} /> : null}
              {prestamosEnabled ? <AccesoRapido icono="cash-outline" etiqueta="Préstamos" onPress={() => router.push('/prestamos')} /> : null}
              {(miProceso.data?.lecciones.length ?? 0) > 0 ? (
                <AccesoRapido icono="school-outline" etiqueta="Mis lecciones" onPress={() => router.push('/lecciones')} />
              ) : null}
              <AccesoRapido icono="people-circle-outline" etiqueta="Directorio" onPress={() => router.push('/directorio')} />
              <AccesoRapido icono="book-outline" etiqueta="Inducción" onPress={() => router.push(induccion ? '/induccion' : '/induccion/presentacion')} />
            </RejillaAccesos>

            {/* ── Solicitudes recientes ───────────────────────────────── */}
            <SeccionTitulo
              titulo="Solicitudes recientes"
              accion={solicitudesRecientes.length > 0 ? { etiqueta: 'Ver todas', onPress: () => router.push('/(app)/(tabs)/solicitudes') } : undefined}
            />
            {solicitudesRecientes.length === 0 ? (
              <View>
                <EmptyState
                  icon="document-text-outline"
                  title="Sin solicitudes por ahora"
                  message="Cuando pidas vacaciones, un permiso o un préstamo, aquí verás en qué va."
                  actionLabel="Crear solicitud"
                  onAction={() => router.push('/solicitud/nueva')}
                />
              </View>
            ) : (
              <View style={styles.list}>
                {solicitudesRecientes.slice(0, 5).map((solicitud, index) => (
                  <FadeInView key={String(solicitud.id)} index={index + 3}>
                    <RequestCard solicitud={solicitud} onPress={() => router.push({ pathname: '/solicitud/[id]', params: { id: String(solicitud.id) } })} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  statGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statFlex: {
    flex: 1,
  },
  list: {
    gap: Spacing.md,
  },
});
