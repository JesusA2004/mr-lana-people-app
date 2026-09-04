import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { FadeInView } from '@/components/FadeInView';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { SkeletonBlock } from '@/components/SkeletonBlock';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { usePerfil } from '@/hooks/queries/usePerfil';
import { formatDateLong } from '@/utils/dates';
import { getErrorMessage } from '@/utils/errors';
import { joinName } from '@/utils/formatters';

export default function PerfilScreen() {
  const router = useRouter();
  const { data: perfil, isLoading, isError, error, refetch, isRefetching } = usePerfil();

  const nombre = joinName(perfil?.nombre, perfil?.apellidos) ?? perfil?.nombre_completo;

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
              </Card>
            </FadeInView>

            <FadeInView index={1}>
              <SectionCard icon="briefcase-outline" title="Información laboral" fields={laboralFilled} />
            </FadeInView>

            {personalFilled.length > 0 ? (
              <FadeInView index={2}>
                <SectionCard icon="person-circle-outline" title="Información personal" fields={personalFilled} />
              </FadeInView>
            ) : null}

            <FadeInView index={3}>
              <Card style={styles.linkCard} onPress={() => router.push('/(app)/(tabs)/expediente')}>
                <View style={styles.linkIcon}>
                  <Ionicons name="folder-open-outline" size={20} color={Colors.primaryDark} />
                </View>
                <View style={styles.linkText}>
                  <Text style={styles.linkTitle}>Mi expediente digital</Text>
                  <Text style={styles.linkCaption}>Consulta y carga tus documentos</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </Card>
            </FadeInView>

            <FadeInView index={4}>
              <Card style={styles.linkCard} onPress={() => router.push('/incorporacion')}>
                <View style={styles.linkIcon}>
                  <Ionicons name="briefcase-outline" size={20} color={Colors.primaryDark} />
                </View>
                <View style={styles.linkText}>
                  <Text style={styles.linkTitle}>Mi incorporación</Text>
                  <Text style={styles.linkCaption}>Sigue el avance de tu proceso de alta</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </Card>
            </FadeInView>

            <FadeInView index={5}>
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
