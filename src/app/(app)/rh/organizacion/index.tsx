import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ErrorState';
import { MascotAssistant } from '@/components/mascot/MascotAssistant';
import { OrganizationTreeNode } from '@/components/OrganizationTreeNode';
import { SkeletonBlock } from '@/components/SkeletonBlock';
import { Colors, Radius, Spacing } from '@/constants/colors';
import { useRhOrganizacion } from '@/hooks/queries/useRhOrganizacion';
import { buildOrganizationTree } from '@/utils/organizationTree';
import { getErrorMessage } from '@/utils/errors';

/**
 * Organigrama de puestos, solo lectura (AGENTS.md de este encargo, sección
 * 24/56): árbol vertical expandible, no un organigrama horizontal ni edición
 * de jerarquía desde móvil. Backend real: `GET /rh/jerarquia-puestos`
 * (confirmado contra el código fuente, lista plana con `puesto_superior_id`).
 */
export default function RhOrganizacionScreen() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useRhOrganizacion(true);
  const tree = useMemo(() => (data ? buildOrganizationTree(data) : []), [data]);

  return (
    <View style={styles.container}>
      <AppHeader title="Organización" subtitle="Solo lectura" showBack onBackPress={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <View style={{ gap: Spacing.sm }}>
            <SkeletonBlock height={40} radius={Radius.md} />
            <SkeletonBlock height={40} radius={Radius.md} />
            <SkeletonBlock height={40} radius={Radius.md} />
          </View>
        ) : isError ? (
          <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
        ) : tree.length === 0 ? (
          <MascotAssistant message="Todavía no hay puestos configurados." type="tip" dismissible={false} />
        ) : (
          <View style={styles.treeCard}>
            {tree.map((node) => (
              <OrganizationTreeNode key={node.id} node={node} depth={0} />
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
