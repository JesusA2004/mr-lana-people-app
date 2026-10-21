import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Card } from '@/components/Card';
import { EditableProfileAvatar } from '@/components/EditableProfileAvatar';
import { ErrorState } from '@/components/ErrorState';
import { ExperienceSwitchCard } from '@/components/ExperienceSwitchCard';
import { FadeInView } from '@/components/FadeInView';
import { PressableScale } from '@/components/PressableScale';
import { SecurityWatermark } from '@/components/SecurityWatermark';
import { SkeletonBlock } from '@/components/SkeletonBlock';
import { FilaLista, GrupoLista, Pill, TarjetaAviso, type NombreIcono } from '@/components/ui';
import { FontSize, Layout, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useMiProceso } from '@/hooks/queries/useCicloLaboral';
import { useIncorporacion } from '@/hooks/queries/useIncorporacion';
import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';
import { usePerfil } from '@/hooks/queries/usePerfil';
import { useEsAutorizadorRh } from '@/hooks/queries/useAprobaciones';
import { useEquipo } from '@/hooks/queries/useTrabajo';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import { formatDateLong } from '@/utils/dates';
import { getErrorMessage } from '@/utils/errors';
import { toExpedienteProgress } from '@/utils/expedienteProgress';
import { canSwitchExperience, experienceAvailability } from '@/utils/experience';
import { joinName } from '@/utils/formatters';
import { isSelfServiceModuleEnabled } from '@/utils/modules';

type Campo = { icon: NombreIcono; label: string; value?: string };
type PerfilLink = { route: string; icon: NombreIcono; title: string; caption: string; badge?: number };

/**
 * Mi perfil: identidad (foto, puesto, avance del expediente), información
 * laboral y de contacto en listas agrupadas (solo lectura: nadie edita su
 * propio expediente), accesos a sus módulos agrupados por intención y, al
 * final, cómo PROPONER cambios a sus datos (RH los autoriza).
 */
export default function PerfilScreen() {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const { data: perfil, isLoading, isError, error, refetch, isRefetching } = usePerfil();
  const incorporacion = useIncorporacion();
  const miProceso = useMiProceso();
  const bootstrap = useMobileBootstrap(true);
  const equipo = useEquipo(isSelfServiceModuleEnabled(bootstrap.data?.features, 'equipo'));

  const nombre = joinName(perfil?.nombre, perfil?.apellidos) ?? perfil?.nombre_completo;
  const watermarkLabel = [nombre, perfil?.numero_empleado ? `EMP-${perfil.numero_empleado}` : null].filter(Boolean).join(' · ');

  const laboralFields: Campo[] = [
    { icon: 'id-card-outline', label: 'Número de empleado', value: perfil?.numero_empleado },
    { icon: 'storefront-outline', label: 'Empresa', value: perfil?.empresa ?? undefined },
    { icon: 'business-outline', label: 'Sucursal', value: perfil?.sucursal ?? undefined },
    { icon: 'layers-outline', label: 'Departamento', value: perfil?.departamento ?? undefined },
    { icon: 'briefcase-outline', label: 'Puesto', value: perfil?.puesto ?? undefined },
    { icon: 'person-outline', label: 'Jefe directo', value: perfil?.jefe_directo ?? undefined },
    { icon: 'calendar-outline', label: 'Fecha de ingreso', value: perfil?.fecha_ingreso ? formatDateLong(perfil.fecha_ingreso) : undefined },
    {
      icon: 'time-outline',
      label: 'Antigüedad',
      value: typeof perfil?.antiguedad_anios === 'number' ? `${perfil.antiguedad_anios} ${perfil.antiguedad_anios === 1 ? 'año' : 'años'}` : undefined,
    },
  ];
  const laboralFilled = laboralFields.filter((field) => Boolean(field.value));

  const personalFields: Campo[] = [
    { icon: 'mail-outline', label: 'Correo de acceso', value: perfil?.correo },
    // Contacto corporativo capturado por RH: si no lo tiene, la fila no se
    // muestra (nunca se usa el correo de acceso como corporativo).
    { icon: 'briefcase-outline', label: 'Correo corporativo', value: perfil?.correo_corporativo ?? undefined },
    { icon: 'call-outline', label: 'Teléfono corporativo', value: perfil?.telefono_corporativo ?? undefined },
  ];
  const personalFilled = personalFields.filter((field) => Boolean(field.value));

  const features = bootstrap.data?.features;
  const puedeCambiarExperiencia = canSwitchExperience(experienceAvailability(bootstrap.data?.capabilities, features));
  const esJefe = (equipo.data?.length ?? 0) > 0;
  const esAutorizadorRh = useEsAutorizadorRh();
  const correccionesPendientes = bootstrap.data?.counts.correcciones_pendientes ?? 0;
  const soloLinks = (lista: (PerfilLink | false)[]) => lista.filter((link): link is PerfilLink => link !== false);

  // Agrupados por intención (no una lista larga de 13 renglones).
  const linksDocumentos = soloLinks([
    { route: '/(app)/(tabs)/expediente', icon: 'folder-open-outline', title: 'Mi expediente', caption: 'Consulta y carga tus documentos' },
    {
      route: '/correcciones',
      icon: 'create-outline',
      title: 'Mis correcciones',
      caption: correccionesPendientes > 0 ? 'Recursos Humanos espera tu respuesta' : 'Estado de los cambios que pediste',
      badge: correccionesPendientes,
    },
    { route: '/incorporacion', icon: 'briefcase-outline', title: 'Mi incorporación', caption: 'Avance de tu proceso de alta' },
    isSelfServiceModuleEnabled(features, 'documentos_laborales') && {
      route: '/documentos-laborales',
      icon: 'folder-outline',
      title: 'Documentos laborales',
      caption: 'Contratos, comprobantes y firmas',
    },
    isSelfServiceModuleEnabled(features, 'contratos') && { route: '/contratos', icon: 'document-text-outline', title: 'Mis contratos', caption: 'Vigencia y tipo de contrato' },
    isSelfServiceModuleEnabled(features, 'recibos') && { route: '/recibos', icon: 'receipt-outline', title: 'Mis recibos', caption: 'Tus recibos de nómina' },
    isSelfServiceModuleEnabled(features, 'prestamos') && { route: '/prestamos', icon: 'cash-outline', title: 'Préstamos', caption: 'Solicita y sigue tus préstamos' },
  ]);
  const linksTrabajo = soloLinks([
    isSelfServiceModuleEnabled(features, 'jerarquia') && { route: '/jerarquia', icon: 'git-network-outline', title: 'Mi jerarquía', caption: 'Jefe inmediato, gerente y estructura' },
    isSelfServiceModuleEnabled(features, 'tareas') && { route: '/tareas', icon: 'checkbox-outline', title: 'Tareas', caption: 'Pendientes por atender' },
    (esAutorizadorRh || (esJefe && isSelfServiceModuleEnabled(features, 'equipo'))) && {
      route: '/aprobaciones',
      icon: 'checkmark-done-outline',
      title: 'Aprobaciones',
      caption: 'Solicitudes que esperan tu decisión',
    },
    esJefe && isSelfServiceModuleEnabled(features, 'equipo') && { route: '/equipo', icon: 'people-outline', title: 'Mi equipo', caption: 'Vistos buenos y evaluaciones' },
    { route: '/directorio', icon: 'people-circle-outline', title: 'Directorio', caption: 'Contacto corporativo de tus compañeros' },
    { route: miProceso.data?.induccion ? '/induccion' : '/induccion/presentacion', icon: 'book-outline', title: 'Inducción Mr. Lana', caption: 'El documento oficial y tu evaluación' },
  ]);
  const linksAyuda = soloLinks([
    { route: '/notificaciones', icon: 'notifications-outline', title: 'Notificaciones', caption: 'Avisos de RH, tus solicitudes y celebraciones' },
    { route: '/ayuda', icon: 'help-buoy-outline', title: 'Ayuda', caption: 'Preguntas frecuentes y contacto' },
    { route: '/configuracion', icon: 'settings-outline', title: 'Configuración', caption: 'Seguridad, experiencia y cerrar sesión' },
  ]);

  const progreso = incorporacion.data ? toExpedienteProgress(incorporacion.data.progreso) : null;
  const completitud = perfil?.completitud_datos;

  const renderLinks = (titulo: string, links: PerfilLink[]) =>
    links.length > 0 ? (
      <GrupoLista titulo={titulo}>
        {links.map((link) => (
          <FilaLista key={link.route} icono={link.icon} titulo={link.title} subtitulo={link.caption} badge={link.badge} onPress={() => router.push(link.route as never)} />
        ))}
      </GrupoLista>
    ) : null;

  return (
    <View style={styles.container}>
      <AppHeader
        title="Mi perfil"
        right={
          <Pressable accessibilityRole="button" accessibilityLabel="Configuración" onPress={() => router.push('/configuracion')} style={styles.settingsButton}>
            <Ionicons name="settings-outline" size={20} color={Colors.text} />
          </Pressable>
        }
      />

      {!isLoading && !isError && watermarkLabel ? <SecurityWatermark label={watermarkLabel} /> : null}

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={Colors.primary} />}>
        {isLoading ? (
          <View style={{ gap: Spacing.lg }}>
            <SkeletonBlock height={220} radius={Radius.xl} />
            <SkeletonBlock height={240} radius={Radius.lg} />
          </View>
        ) : isError ? (
          <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
        ) : (
          <>
            <FadeInView index={0}>
              <Card style={styles.headerCard}>
                <EditableProfileAvatar
                  name={nombre}
                  fotoUrlApi={perfil?.foto_url_api}
                  fotoUrl={perfil?.foto_url}
                  estado={perfil?.foto}
                  size={104}
                  ringColor={Colors.primary}
                  mostrarEstado
                />
                <Text style={styles.name} accessibilityRole="header">
                  {nombre ?? 'Colaborador'}
                </Text>
                {perfil?.puesto ? <Text style={styles.role}>{perfil.puesto}</Text> : null}
                {perfil?.empresa || perfil?.sucursal ? (
                  <Text style={styles.company}>{[perfil?.empresa, perfil?.sucursal].filter(Boolean).join(' · ')}</Text>
                ) : null}
                <View style={styles.pills}>
                  {perfil?.numero_empleado ? <Pill texto={`N.º ${perfil.numero_empleado}`} tono="neutral" icono="id-card-outline" /> : null}
                  {progreso ? (
                    <PressableScale haptic={false} accessibilityLabel={`Expediente ${progreso.porcentaje} por ciento. Ver mi expediente`} onPress={() => router.push('/(app)/(tabs)/expediente')}>
                      <Pill
                        texto={`Expediente ${progreso.porcentaje}%`}
                        tono={incorporacion.data?.estado === 'aprobado' || progreso.completo ? 'exito' : 'primario'}
                        icono={incorporacion.data?.estado === 'aprobado' ? 'checkmark-circle' : 'folder-open-outline'}
                      />
                    </PressableScale>
                  ) : null}
                </View>
              </Card>
            </FadeInView>

            {completitud?.aplica && completitud.porcentaje < 100 ? (
              <FadeInView index={1}>
                <TarjetaAviso
                  icono="id-card-outline"
                  tono="aviso"
                  titulo={`Te ${completitud.faltantes.length === 1 ? 'falta' : 'faltan'} ${completitud.faltantes.length} ${completitud.faltantes.length === 1 ? 'dato' : 'datos'}`}
                  mensaje={`Los necesitamos para generarte tus documentos de contratación: ${completitud.faltantes.map((f) => f.etiqueta).join(', ')}.`}
                  accion="Completar mi información"
                  onPress={() => router.push('/completar-datos' as never)}
                />
              </FadeInView>
            ) : null}

            {puedeCambiarExperiencia ? (
              <FadeInView index={1}>
                <ExperienceSwitchCard />
              </FadeInView>
            ) : null}

            <FadeInView index={2}>
              <GrupoLista titulo="Información laboral">
                {laboralFilled.length === 0 ? (
                  <FilaLista icono="information-circle-outline" tono="neutral" titulo="Sin información por el momento" subtitulo="Recursos Humanos la captura al darte de alta." />
                ) : (
                  laboralFilled.map((field) => <FilaLista key={field.label} icono={field.icon} etiqueta={field.label} titulo={field.value ?? ''} />)
                )}
              </GrupoLista>
            </FadeInView>

            {personalFilled.length > 0 ? (
              <FadeInView index={3}>
                <GrupoLista titulo="Contacto">
                  {personalFilled.map((field) => (
                    <FilaLista key={field.label} icono={field.icon} etiqueta={field.label} titulo={field.value ?? ''} />
                  ))}
                </GrupoLista>
              </FadeInView>
            ) : null}

            {/* Nadie edita su propio expediente: se PROPONE y RH lo autoriza. */}
            <FadeInView index={4}>
              <GrupoLista titulo="Mis datos" descripcion="Propón un cambio y Recursos Humanos lo revisa antes de aplicarlo.">
                {/* Domicilio campo por campo (calle, número, colonia, C.P., municipio, estado). */}
                <FilaLista icono="home-outline" titulo="Cambiar mi domicilio" subtitulo="Calle, número, colonia y C.P." onPress={() => router.push('/cambiar-domicilio' as never)} />
                <FilaLista
                  icono="create-outline"
                  titulo="Solicitar actualización de datos"
                  subtitulo="Corrige un dato personal de tu expediente"
                  onPress={() => router.push({ pathname: '/solicitud/nueva', params: { tipo: 'actualizacion_datos' } })}
                />
              </GrupoLista>
            </FadeInView>

            <FadeInView index={5}>{renderLinks('Documentos y nómina', linksDocumentos)}</FadeInView>
            <FadeInView index={6}>{renderLinks('Mi trabajo', linksTrabajo)}</FadeInView>
            <FadeInView index={7}>{renderLinks('Ayuda y cuenta', linksAyuda)}</FadeInView>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    content: {
      width: '100%',
      maxWidth: Layout.maxContentWidth,
      alignSelf: 'center',
      padding: Spacing.lg,
      gap: Spacing.xl,
      paddingBottom: Spacing.xxxl,
    },
    settingsButton: {
      width: Layout.minTouchTarget,
      height: Layout.minTouchTarget,
      borderRadius: Radius.full,
      backgroundColor: Colors.surface,
      borderWidth: 1,
      borderColor: Colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerCard: {
      alignItems: 'center',
      gap: 4,
      paddingVertical: Spacing.xl,
      borderRadius: Radius.xl,
    },
    name: {
      fontSize: FontSize.xl,
      fontWeight: '800',
      color: Colors.text,
      textAlign: 'center',
      marginTop: Spacing.md,
    },
    role: {
      fontSize: FontSize.md,
      fontWeight: '700',
      color: Colors.primaryDark,
      textAlign: 'center',
    },
    company: {
      fontSize: FontSize.sm,
      color: Colors.textMuted,
      textAlign: 'center',
    },
    pills: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: Spacing.sm,
      marginTop: Spacing.sm,
    },
  });
