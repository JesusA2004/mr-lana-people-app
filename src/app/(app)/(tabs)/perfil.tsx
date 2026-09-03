import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colaboradorApi } from '@/api/colaborador';
import { AppHeader } from '@/components/AppHeader';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { SkeletonBlock } from '@/components/SkeletonBlock';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import type { CollaboratorProfile } from '@/types/collaborator';
import { formatDateLong } from '@/utils/dates';
import { getErrorMessage, logError } from '@/utils/errors';
import { pickString } from '@/utils/formatters';

type ViewState = 'loading' | 'success' | 'error';

export default function PerfilScreen() {
  const router = useRouter();
  const [perfil, setPerfil] = useState<CollaboratorProfile | null>(null);
  const [state, setState] = useState<ViewState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setState('loading');
    setErrorMessage(null);
    try {
      const result = await colaboradorApi.getPerfil();
      setPerfil(result);
      setState('success');
    } catch (error) {
      logError('perfil.getPerfil', error);
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

  const nombre = pickString(perfil, ['nombre_completo', 'nombre', 'name']);
  const fotoUrl = pickString(perfil, ['foto_url_api', 'foto_url']);

  const allFields: { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string }[] = [
    { icon: 'id-card-outline', label: 'Número de empleado', value: pickString(perfil, ['numero_empleado']) },
    { icon: 'briefcase-outline', label: 'Puesto', value: pickString(perfil, ['puesto']) },
    { icon: 'business-outline', label: 'Sucursal', value: pickString(perfil, ['sucursal']) },
    { icon: 'layers-outline', label: 'Departamento', value: pickString(perfil, ['departamento']) },
    { icon: 'storefront-outline', label: 'Empresa', value: pickString(perfil, ['empresa']) },
    {
      icon: 'calendar-outline',
      label: 'Fecha de ingreso',
      value: perfil?.fecha_ingreso ? formatDateLong(perfil.fecha_ingreso) : undefined,
    },
    { icon: 'time-outline', label: 'Antigüedad', value: pickString(perfil, ['antiguedad']) },
    { icon: 'checkmark-circle-outline', label: 'Estatus laboral', value: pickString(perfil, ['estatus_laboral']) },
    { icon: 'medkit-outline', label: 'IMSS', value: pickString(perfil, ['imss']) },
    {
      icon: 'hourglass-outline',
      label: 'Periodo de prueba',
      value:
        typeof perfil?.periodo_prueba === 'boolean'
          ? perfil.periodo_prueba
            ? 'Sí'
            : 'No'
          : pickString(perfil, ['periodo_prueba']),
    },
  ];
  const fields = allFields.filter((field) => Boolean(field.value));

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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={Colors.primary} />}>
        {state === 'loading' ? (
          <View style={{ gap: Spacing.lg }}>
            <SkeletonBlock height={120} radius={Radius.lg} />
            <SkeletonBlock height={220} radius={Radius.lg} />
          </View>
        ) : state === 'error' ? (
          <ErrorState message={errorMessage ?? undefined} onRetry={() => void load()} />
        ) : (
          <>
            <Card style={styles.headerCard}>
              <Avatar name={nombre} uri={fotoUrl} size={72} />
              <Text style={styles.name}>{nombre ?? 'Colaborador'}</Text>
            </Card>

            <Card>
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
          </>
        )}
      </ScrollView>
    </View>
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
    gap: Spacing.sm,
  },
  name: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
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
});
