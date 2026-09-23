import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { ExperienceSwitchCard } from '@/components/ExperienceSwitchCard';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { FadeInView } from '@/components/FadeInView';
import { PressableScale } from '@/components/PressableScale';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { SecurityWatermark } from '@/components/SecurityWatermark';
import { SkeletonBlock } from '@/components/SkeletonBlock';
import { Colors, FontSize, Layout, Radius, Spacing } from '@/constants/colors';
import { useIncorporacion } from '@/hooks/queries/useIncorporacion';
import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';
import { usePerfil } from '@/hooks/queries/usePerfil';
import { useEquipo } from '@/hooks/queries/useTrabajo';
import { isSelfServiceModuleEnabled } from '@/utils/modules';
import { formatDateLong } from '@/utils/dates';
import { getErrorMessage } from '@/utils/errors';
import { joinName } from '@/utils/formatters';
import { toExpedienteProgress } from '@/utils/expedienteProgress';
import { canSwitchExperience, experienceAvailability } from '@/utils/experience';

export default function PerfilScreen() {
  const router = useRouter();
  const { data: perfil, isLoading, isError, error, refetch, isRefetching } = usePerfil();
  const incorporacion = useIncorporacion();
  const bootstrap = useMobileBootstrap(true);
  const equipo = useEquipo(isSelfServiceModuleEnabled(bootstrap.data?.features, 'equipo'));

  const nombre = joinName(perfil?.nombre, perfil?.apellidos) ?? perfil?.nombre_completo;
  const watermarkLabel = [nombre, perfil?.numero_empleado ? `EMP-${perfil.numero_empleado}` : null].filter(Boolean).join(' · ');

  const laboralFields: { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string }[] = [
    { icon: 'id-card-outline', label: 'Número de empleado', value: perfil?.numero_empleado },
    { icon: 'storefront-outline', label: 'Empresa', value: perfil?.empresa ?? undefined },
    { icon: 'business-outline', label: 'Sucursal', value: perfil?.sucursal ?? undefined },
    { icon: 'layers-outline', label: 'Departamento', value: perfil?.departamento ?? undefined },
    { icon: 'briefcase-outline', label: 'Puesto', value: perfil?.puesto ?? undefined },
    { icon: 'person-outline', label: 'Jefe directo', value: perfil?.jefe_directo ?? undefined },
    {
      icon: 'calendar-outline',
      label: 'Fecha de ingreso',
      value: perfil?.fecha_ingreso ? formatDateLong(perfil.fecha_ingreso) : undefined,
    },
    {
      icon: 'time-outline',
      label: 'Antigüedad',
      value:
        typeof perfil?.antiguedad_anios === 'number'
          ? `${perfil.antiguedad_anios} ${perfil.antiguedad_anios === 1 ? 'año' : 'años'}`
          : undefined,
    },
  ];
  const laboralFilled = laboralFields.filter((field) => Boolean(field.value));

  const personalFields: { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string }[] = [
    { icon: 'mail-outline', label: 'Correo', value: perfil?.correo },
  ];
  const personalFilled = personalFields.filter((field) => Boolean(field.value));

  const features = bootstrap.data?.features;
  const puedeCambiarExperiencia = canSwitchExperience(experienceAvailability(bootstrap.data?.capabilities, features));
  const esJefe = (equipo.data?.length ?? 0) > 0;
  type PerfilLink = { route: string; icon: keyof typeof Ionicons.glyphMap; title: string; caption: string };
  const links = ([
    { route: '/(app)/(tabs)/expediente', icon: 'folder-open-outline', title: 'Mi expediente', caption: 'Consulta y carga tus documentos' },
    { route: '/incorporacion', icon: 'briefcase-outline', title: 'Mi incorporación', caption: 'Avance de tu proceso de alta' },
    isSelfServiceModuleEnabled(features, 'jerarquia') && { route: '/jerarquia', icon: 'git-network-outline', title: 'Mi jerarquía', caption: 'Jefe inmediato, gerente y estructura' },
    isSelfServiceModuleEnabled(features, 'documentos_laborales') && {
      route: '/documentos-laborales',
      icon: 'folder-outline',
      title: 'Documentos laborales',
      caption: 'Contratos, comprobantes y firmas',
    },
    isSelfServiceModuleEnabled(features, 'contratos') && { route: '/contratos', icon: 'document-text-outline', title: 'Mis contratos', caption: 'Vigencia y tipo de contrato' },
    isSelfServiceModuleEnabled(features, 'recibos') && { route: '/recibos', icon: 'receipt-outline', title: 'Mis recibos', caption: 'Recibos internos de nómina (no fiscales)' },
    isSelfServiceModuleEnabled(features, 'prestamos') && { route: '/prestamos', icon: 'cash-outline', title: 'Préstamos', caption: 'Solicita y sigue tus préstamos' },
    isSelfServiceModuleEnabled(features, 'tareas') && { route: '/tareas', icon: 'checkbox-outline', title: 'Tareas', caption: 'Pendientes por atender' },
    esJefe && isSelfServiceModuleEnabled(features, 'equipo') && { route: '/equipo', icon: 'people-outline', title: 'Mi equipo', caption: 'Vistos buenos y evaluaciones' },
    { route: '/ayuda', icon: 'help-buoy-outline', title: 'Ayuda', caption: 'Preguntas frecuentes y contacto' },
  ] as (PerfilLink | false)[]).filter((link): link is PerfilLink => link !== false);

  return (
    <View style={styles.container}>
      <AppHeader
        title="Mi perfil"
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

      {!isLoading && !isError && watermarkLabel ? <SecurityWatermark label={watermarkLabel} /> : null}

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={Colors.primary} />}>
        {isLoading ? (
          <View style={{ gap: Spacing.lg }}>
            <SkeletonBlock height={160} radius={Radius.lg} />
            <SkeletonBlock height={220} radius={Radius.lg} />
          </View>
        ) : isError ? (
          <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
        ) : (
          <>
            <FadeInView index={0}>
              <Card style={styles.headerCard}>
                <ProfileAvatar name={nombre} fotoUrlApi={perfil?.foto_url_api} fotoUrl={perfil?.foto_url} size={96} ringColor={Colors.primary} />
                <Text style={styles.name}>{nombre ?? 'Colaborador'}</Text>
                {perfil?.puesto ? <Text style={styles.role}>{perfil.puesto}</Text> : null}
                {perfil?.empresa || perfil?.sucursal ? (
                  <Text style={styles.company}>{[perfil?.empresa, perfil?.sucursal].filter(Boolean).join(' · ')}</Text>
                ) : null}
                {perfil?.numero_empleado ? <Text style={styles.employeeNumber}>N.º {perfil.numero_empleado}</Text> : null}
                {incorporacion.data ? (
                  <PressableScale haptic={false} onPress={() => router.push('/(app)/(tabs)/expediente')} style={styles.statusPill}>
                    <Ionicons
                      name={incorporacion.data.estado === 'aprobado' ? 'checkmark-circle' : 'folder-open-outline'}
                      size={13}
                      color={Colors.primaryDark}
                    />
                    <Text style={styles.statusPillText}>Expediente {toExpedienteProgress(incorporacion.data.progreso).porcentaje}%</Text>
                  </PressableScale>
                ) : null}
              </Card>
            </FadeInView>

            {puedeCambiarExperiencia ? (
              <FadeInView index={1}>
                <ExperienceSwitchCard />
              </FadeInView>
            ) : null}

            <FadeInView index={1}>
              <SectionCard icon="briefcase-outline" title="Información laboral" fields={laboralFilled} />
            </FadeInView>

            {personalFilled.length > 0 ? (
              <FadeInView index={2}>
                <SectionCard icon="person-circle-outline" title="Información personal" fields={personalFilled} />
              </FadeInView>
            ) : null}

            {/* Ciclo laboral (backend 2026-09-22): accesos sin convertir cada módulo en tab. */}
            <FadeInView index={5}>
              <Card padded={false}>
                {links.map((link, index) => (
                  <PressableScale
                    key={link.route}
                    haptic={false}
                    accessibilityRole="button"
                    accessibilityLabel={link.title}
                    onPress={() => router.push(link.route as never)}
                    style={[styles.menuRow, index === links.length - 1 && styles.menuRowLast] as object}>
                    <View style={styles.linkIcon}>
                      <Ionicons name={link.icon} size={20} color={Colors.primaryDark} />
                    </View>
                    <View style={styles.linkText}>
                      <Text style={styles.linkTitle}>{link.title}</Text>
                      <Text style={styles.linkCaption}>{link.caption}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                  </PressableScale>
                ))}
              </Card>
            </FadeInView>

            <FadeInView index={6}>
              <Button
                title="Solicitar actualización de datos"
                variant="outline"
                onPress={() => router.push({ pathname: '/solicitud/nueva', params: { tipo: 'actualizacion_datos' } })}
              />
            </FadeInView>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SectionCard({
  icon,
  title,
  fields,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  fields: { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string }[];
}) {
  return (
    <Card>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={18} color={Colors.primaryDark} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {fields.length === 0 ? (
        <Text style={styles.emptyText}>No hay información disponible por el momento.</Text>
      ) : (
        fields.map((field, index) => (
          <View key={field.label} style={[styles.row, index === fields.length - 1 && styles.rowLast]}>
            <View style={styles.rowIcon}>
              <Ionicons name={field.icon} size={18} color={Colors.primaryDark} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{field.label}</Text>
              <Text style={styles.rowValue}>{field.value}</Text>
            </View>
          </View>
        ))
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    alignSelf: 'center',
    padding: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: Spacing.xxxl,
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
  role: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  company: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  employeeNumber: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
    marginTop: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  statusPillText: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 56,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  menuRowLast: {
    borderBottomWidth: 0,
  },
  rowLast: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 0,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  rowValue: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: '600',
    marginTop: 2,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
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
