import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { FilterChips } from '@/components/ciclo/FilterChips';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { OrganizationTreeNode } from '@/components/OrganizationTreeNode';
import { SkeletonBlock } from '@/components/SkeletonBlock';
import { Colors, Layout, Radius, Spacing } from '@/constants/colors';
import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';
import { useRhOrganigramaPersonas } from '@/hooks/queries/useRhCicloLaboral';
import { useRhOrganizacion } from '@/hooks/queries/useRhOrganizacion';
import { getErrorMessage } from '@/utils/errors';
import { isOrganigramaEnabled } from '@/utils/featureFlags';
import { isRhModuleEnabled } from '@/utils/modules';
import { buildOrganizationTree, personaToTreeView, puestoToTreeView } from '@/utils/organizationTree';

type Vista = 'personas' | 'puestos';

/**
 * Organigrama, solo lectura: árbol vertical expandible (una sola
 * implementación, `OrganizationTreeNode`) con dos fuentes reales:
 *  - Personas: `GET /rh/organigrama` (`JerarquiaColaboradorService`,
 *    permiso `organigrama.ver`, alcance por sucursal) — jefe → subordinados.
 *  - Puestos: `GET /rh/jerarquia-puestos` (permiso `puestos.administrar`).
 * Cada vista aparece solo con su permiso real.
 */
export default function RhOrganizacionScreen() {
  const router = useRouter();
  const bootstrap = useMobileBootstrap(true);
  const personasEnabled = isRhModuleEnabled(bootstrap.data?.features, bootstrap.data?.user.permissions, 'organigrama_personas');
  const puestosEnabled = isOrganigramaEnabled(bootstrap.data?.features, bootstrap.data?.user.permissions);
  const [vista, setVista] = useState<Vista>(personasEnabled ? 'personas' : 'puestos');

  const personas = useRhOrganigramaPersonas({}, personasEnabled && vista === 'personas');
  const puestos = useRhOrganizacion(puestosEnabled && vista === 'puestos');
  const query = vista === 'personas' ? personas : puestos;

  const tree = useMemo(
    () => (vista === 'personas' ? (personas.data ?? []).map(personaToTreeView) : buildOrganizationTree(puestos.data ?? []).map(puestoToTreeView)),
    [vista, personas.data, puestos.data],
  );

  const opciones = [
    ...(personasEnabled ? [{ value: 'personas' as Vista, label: 'Personas' }] : []),
    ...(puestosEnabled ? [{ value: 'puestos' as Vista, label: 'Puestos' }] : []),
  ];

  return (
    <View style={styles.container}>
      <AppHeader title="Organización" subtitle="Solo lectura" showBack onBackPress={() => router.back()} />
      {opciones.length > 1 ? <FilterChips options={opciones} value={vista} onChange={setVista} /> : null}

      <ScrollView contentContainerStyle={styles.content}>
        {query.isLoading ? (
          <View style={{ gap: Spacing.sm }}>
            <SkeletonBlock height={40} radius={Radius.md} />
            <SkeletonBlock height={40} radius={Radius.md} />
            <SkeletonBlock height={40} radius={Radius.md} />
          </View>
        ) : query.isError ? (
          <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />
        ) : tree.length === 0 ? (
          <EmptyState icon="people-outline" message={vista === 'personas' ? 'No hay colaboradores en tu alcance.' : 'Todavía no hay puestos configurados.'} />
        ) : (
          <View style={styles.treeCard}>
            {tree.map((node) => (
              <OrganizationTreeNode
                key={node.key}
                node={node}
                depth={0}
                onOpen={vista === 'personas' ? (n) => router.push(`/(app)/rh/colaboradores/${n.targetId}` as never) : undefined}
              />
            ))}
          </View>
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
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    alignSelf: 'center',
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  treeCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
  },
});
