import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ContratoCard } from '@/components/ciclo/ContratoCard';
import { ItemCard } from '@/components/ciclo/ItemCard';
import { InfoRow } from '@/components/ciclo/InfoRow';
import { JerarquiaCard } from '@/components/ciclo/JerarquiaCard';
import { LazySection } from '@/components/ciclo/LazySection';
import { Notice } from '@/components/ciclo/Screen';
import { ErrorState } from '@/components/ErrorState';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { SkeletonBlock } from '@/components/SkeletonBlock';
import { StatusBadge } from '@/components/StatusBadge';
import { Stepper } from '@/components/Stepper';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';
import { useRhColaborador } from '@/hooks/queries/useRhColaboradores';
import {
  useRhActivarColaborador,
  useRhAlta,
  useRhColaboradorContratos,
  useRhColaboradorJerarquia,
  useRhDocumentosLaborales,
} from '@/hooks/queries/useRhCicloLaboral';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { toast } from '@/store/toastStore';
import { ALTA_STEPS, altaBloqueos, altaStepIndex, canActivarAlta } from '@/utils/alta';
import { hasPermission } from '@/utils/capabilities';
import { formatDateLong } from '@/utils/dates';
import { getActionErrorMessage, getErrorMessage, logError } from '@/utils/errors';
import { formatCurrencyMXN } from '@/utils/formatters';
import { haptics } from '@/utils/haptics';
import { laborDocumentBadgeStatus, laborDocumentKicker } from '@/utils/laborDocuments';
import { visibleColaboradorSections } from '@/utils/modules';

/**
 * Detalle RH del colaborador: resumen (siempre) + secciones del ciclo
 * laboral que se muestran SOLO con el permiso real de su endpoint y que
 * cargan SOLO al expandirse (lazy) — nunca todo al abrir.
 */
export default function RhColaboradorDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: colaborador, isLoading, isError, error, refetch, isRefetching } = useRhColaborador(id);
  const bootstrap = useMobileBootstrap(true);
  const permissions = bootstrap.data?.user.permissions;
  const sections = new Set(visibleColaboradorSections(permissions));
  const nombre = colaborador?.nombre ?? '';

  const goWith = (pathname: string, extra: Record<string, string> = {}) =>
    router.push({ pathname, params: { colaboradorId: String(id), nombre, ...extra } } as never);

  return (
    <View style={styles.container}>
      <AppHeader title={colaborador?.nombre ?? 'Colaborador'} showBack onBackPress={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={Colors.primary} />}>
        {isLoading ? (
          <View style={{ gap: Spacing.lg }}>
            <SkeletonBlock height={160} radius={Radius.lg} />
          </View>
        ) : isError ? (
          <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
        ) : !colaborador ? null : (
          <>
            <Card style={styles.headerCard}>
              <ProfileAvatar name={colaborador.nombre} size={80} />
              <Text style={styles.name}>{colaborador.nombre}</Text>
              {colaborador.puesto ? <Text style={styles.role}>{colaborador.puesto}</Text> : null}
              {colaborador.sucursal || colaborador.departamento ? (
                <Text style={styles.meta}>{[colaborador.sucursal, colaborador.departamento].filter(Boolean).join(' · ')}</Text>
              ) : null}
              {colaborador.numero_empleado ? <Text style={styles.meta}>N.º {colaborador.numero_empleado}</Text> : null}
              {colaborador.estatus ? <StatusBadge status={colaborador.estatus} /> : null}
            </Card>

            <View style={styles.countRow}>
              <CountTile icon="document-text-outline" label="Solicitudes" value={colaborador.solicitudes_pendientes} />
              <CountTile icon="airplane-outline" label="Vacaciones" value={colaborador.vacaciones_pendientes} />
              <CountTile icon="folder-open-outline" label="Documentos" value={colaborador.documentos_pendientes} />
            </View>

            {sections.has('alta') ? (
              <LazySection icon="rocket-outline" title="Alta" caption="Documentos → contrato → firma → activación">
                {() => <AltaSection colaboradorId={id} permissions={permissions} />}
              </LazySection>
            ) : null}

            {sections.has('expediente') ? (
              <Button title="Ver expediente" leftIcon="folder-open-outline" variant="outline" onPress={() => router.push(`/(app)/rh/expedientes/${id}` as never)} />
            ) : null}

            {sections.has('contratos') ? (
              <LazySection icon="document-text-outline" title="Contratos">
                {() => <ContratosSection colaboradorId={id} />}
              </LazySection>
            ) : null}

            {sections.has('documentos_laborales') ? (
              <LazySection icon="folder-outline" title="Documentos laborales">
                {() => <DocumentosSection colaboradorId={id} />}
              </LazySection>
            ) : null}

            {sections.has('jerarquia') ? (
              <LazySection icon="git-network-outline" title="Jerarquía">
                {() => <JerarquiaSection colaboradorId={id} />}
              </LazySection>
            ) : null}

            {sections.has('recibos') || sections.has('prestamos') || sections.has('actas') || sections.has('cierre') ? (
              <Card style={styles.gap}>
                <Text style={styles.sectionTitle}>Más</Text>
                {sections.has('recibos') ? <LinkRow icon="receipt-outline" label="Recibos internos" onPress={() => goWith('/(app)/rh/recibos')} /> : null}
                {hasPermission(permissions, 'nomina.recibos.crear') ? (
                  <LinkRow icon="add-circle-outline" label="Nuevo recibo interno" onPress={() => goWith('/(app)/rh/recibos/nuevo')} />
                ) : null}
                {sections.has('prestamos') ? <LinkRow icon="cash-outline" label="Préstamos" onPress={() => goWith('/(app)/rh/prestamos')} /> : null}
                {sections.has('actas') ? <LinkRow icon="reader-outline" label="Actas" onPress={() => goWith('/(app)/rh/actas')} /> : null}
                {sections.has('cierre') && hasPermission(permissions, 'cierres.gestionar') ? (
                  <LinkRow icon="exit-outline" label="Iniciar cierre laboral" danger onPress={() => goWith('/(app)/rh/cierres/nuevo')} />
                ) : null}
                {sections.has('cierre') ? <LinkRow icon="list-outline" label="Cierres laborales" onPress={() => router.push('/(app)/rh/cierres' as never)} /> : null}
              </Card>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function AltaSection({ colaboradorId, permissions }: { colaboradorId: string; permissions: string[] | undefined }) {
  const router = useRouter();
  const query = useRhAlta(colaboradorId);
  const activar = useRhActivarColaborador(colaboradorId);
  const { isOffline } = useNetworkStatus();
  const alta = query.data;

  if (query.isLoading) return <SkeletonBlock height={120} radius={Radius.md} />;
  if (query.error) return <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />;
  if (!alta) return null;

  const bloqueos = altaBloqueos(alta);
  const puedeActivar = canActivarAlta(alta, permissions);

  const confirmarActivacion = () =>
    Alert.alert('Activar colaborador', 'El colaborador quedará activo con acceso completo al portal.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Activar',
        onPress: () =>
          activar.mutate(undefined, {
            onSuccess: () => {
              haptics.success();
              toast.success('Colaborador activado.');
            },
            onError: (err) => {
              logError('rhAlta.activar', err);
              haptics.error();
              toast.error(getActionErrorMessage(err));
            },
          }),
      },
    ]);

  return (
    <>
      <StatusBadge status={alta.estado_alta === 'activo' ? 'aprobado' : 'en_revision'} label={alta.estado_alta_etiqueta ?? alta.estado_alta ?? 'Sin estado'} />
      {alta.estado_alta !== 'baja' ? <Stepper steps={[...ALTA_STEPS]} currentIndex={altaStepIndex(alta.estado_alta)} /> : null}
      <InfoRow label="Expediente" value={`${alta.expediente.aprobados}/${alta.expediente.requeridos} aprobados (${alta.expediente.porcentaje}%)`} />
      <InfoRow label="Rechazados" value={alta.expediente.rechazados > 0 ? alta.expediente.rechazados : null} />
      <InfoRow label="Tipo de contratación" value={alta.contrato?.tipo_etiqueta ?? alta.estructura.tipo_contratacion} />
      <InfoRow label="Fecha de ingreso" value={formatDateLong(alta.estructura.fecha_ingreso)} />
      <InfoRow label="Jefe inmediato" value={alta.estructura.jefe_inmediato} />
      <InfoRow label="Sueldo mensual" value={alta.estructura.sueldo_mensual !== null ? formatCurrencyMXN(alta.estructura.sueldo_mensual) : null} />
      {alta.documentos_contractuales.map((doc) => (
        <ItemCard
          key={doc.id}
          icon="create-outline"
          title={doc.titulo ?? doc.clave ?? 'Documento contractual'}
          status={doc.firmado ? 'aprobado' : 'requiere_correccion'}
          statusLabel={doc.firmado ? 'Firmado' : 'Pendiente de firma'}
          onPress={() => router.push(`/(app)/rh/documentos-laborales/${doc.id}` as never)}
        />
      ))}
      {bloqueos.length > 0 && alta.estado_alta !== 'activo' ? (
        <Notice tone="warning">{bloqueos.map((b) => `• ${b}`).join('\n')}</Notice>
      ) : null}
      {alta.documentos_contractuales_sin_plantilla.length > 0 ? (
        <Notice tone="danger">Faltan plantillas para generar documentos contractuales. Solicita a RH o Jurídico que cargue el formato correspondiente.</Notice>
      ) : null}
      {puedeActivar ? <Button title="Activar colaborador" leftIcon="checkmark-done" disabled={isOffline} loading={activar.isPending} onPress={confirmarActivacion} /> : null}
    </>
  );
}

function ContratosSection({ colaboradorId }: { colaboradorId: string }) {
  const router = useRouter();
  const query = useRhColaboradorContratos(colaboradorId);
  if (query.isLoading) return <SkeletonBlock height={80} radius={Radius.md} />;
  if (query.error) return <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />;
  if ((query.data ?? []).length === 0) return <Text style={styles.meta}>Sin contratos registrados.</Text>;
  return (
    <>
      {(query.data ?? []).map((contrato) => (
        <View key={contrato.id} style={styles.gap}>
          <ContratoCard
            contrato={contrato}
            onOpenDocumento={contrato.documento_id ? () => router.push(`/(app)/rh/documentos-laborales/${contrato.documento_id}` as never) : undefined}
          />
          {contrato.evaluacion_id ? (
            <Button
              title="Ver evaluación de periodo de prueba"
              variant="ghost"
              onPress={() => router.push({ pathname: '/evaluaciones/[id]', params: { id: String(contrato.evaluacion_id) } })}
            />
          ) : null}
        </View>
      ))}
    </>
  );
}

function DocumentosSection({ colaboradorId }: { colaboradorId: string }) {
  const router = useRouter();
  const query = useRhDocumentosLaborales({ colaborador_id: colaboradorId, per_page: 20 });
  const documentos = query.data?.pages.flatMap((p) => p.data) ?? [];
  if (query.isLoading) return <SkeletonBlock height={80} radius={Radius.md} />;
  if (query.error) return <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />;
  if (documentos.length === 0) return <Text style={styles.meta}>Sin documentos laborales.</Text>;
  return (
    <>
      {documentos.map((doc) => (
        <ItemCard
          key={doc.id}
          kicker={laborDocumentKicker(doc)}
          title={doc.titulo}
          status={laborDocumentBadgeStatus(doc.estado)}
          statusLabel={doc.estado_etiqueta}
          onPress={() => router.push(`/(app)/rh/documentos-laborales/${doc.id}` as never)}
        />
      ))}
    </>
  );
}

function JerarquiaSection({ colaboradorId }: { colaboradorId: string }) {
  const query = useRhColaboradorJerarquia(colaboradorId);
  if (query.isLoading) return <SkeletonBlock height={80} radius={Radius.md} />;
  if (query.error) return <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />;
  return query.data ? <JerarquiaCard jerarquia={query.data} /> : null;
}

function LinkRow({ icon, label, onPress, danger = false }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Button title={label} variant={danger ? 'danger' : 'ghost'} leftIcon={icon} onPress={onPress} style={styles.linkRow} />
  );
}

function CountTile({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value?: number }) {
  return (
    <View style={styles.countTile} accessible accessibilityLabel={`${label}: ${value ?? 0} pendientes`}>
      <Ionicons name={icon} size={18} color={Colors.primaryDark} />
      <Text style={styles.countValue}>{value ?? 0}</Text>
      <Text style={styles.countLabel}>{label}</Text>
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
  gap: {
    gap: Spacing.sm,
  },
  headerCard: {
    alignItems: 'center',
    gap: 2,
  },
  name: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  role: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  meta: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  linkRow: {
    justifyContent: 'flex-start',
  },
  countRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  countTile: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  countValue: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 4,
  },
  countLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '700',
  },
});
