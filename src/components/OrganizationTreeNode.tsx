import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from './PressableScale';

import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import type { OrganizationNode } from '@/types/organization';

export interface OrganizationTreeNodeProps {
  node: OrganizationNode;
  /** Profundidad para la indentación — la raíz empieza en 0. */
  depth?: number;
  /** Los primeros dos niveles abren solados por default; el resto arranca colapsado (AGENTS.md de este encargo, sección 69: "lazy expand", nunca 3,000 nodos de golpe). */
  defaultExpanded?: boolean;
}

const INDENT_PER_LEVEL = 18;

/**
 * Nodo recursivo del organigrama (sección 24/69): vertical, indentado, con
 * líneas guía — nunca un organigrama horizontal de 7 columnas en 360px. Solo
 * renderiza los hijos de un nodo cuando ese nodo está expandido, así que un
 * árbol de miles de puestos nunca se monta completo de una vez.
 */
export function OrganizationTreeNode({ node, depth = 0, defaultExpanded = depth < 1 }: OrganizationTreeNodeProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const hasChildren = node.children.length > 0;

  return (
    <View>
      <PressableScale
        haptic={false}
        accessibilityRole={hasChildren ? 'button' : undefined}
        accessibilityLabel={`${node.nombre}${hasChildren ? (expanded ? ', contraer' : ', expandir') : ''}`}
        onPress={hasChildren ? () => setExpanded((value) => !value) : undefined}
        style={[styles.row, { paddingLeft: Spacing.lg + depth * INDENT_PER_LEVEL }]}>
        {depth > 0 ? <View style={styles.guideLine} /> : null}

        <View style={styles.expandIconWrapper}>
          {hasChildren ? (
            <Ionicons name={expanded ? 'chevron-down' : 'chevron-forward'} size={16} color={Colors.textMuted} />
          ) : (
            <View style={styles.leafDot} />
          )}
        </View>

        <View style={styles.textColumn}>
          <Text style={[styles.nombre, !node.activo && styles.inactivo]} numberOfLines={1}>
            {node.nombre}
          </Text>
          {node.departamento ? (
            <Text style={styles.meta} numberOfLines={1}>
              {node.departamento}
            </Text>
          ) : null}
        </View>

        {node.usuarios_count > 0 ? (
          <View style={styles.countBadge}>
            <Ionicons name="person" size={11} color={Colors.primaryDark} />
            <Text style={styles.countText}>{node.usuarios_count}</Text>
          </View>
        ) : null}
        {node.vacantes_abiertas_count > 0 ? (
          <View style={styles.vacanteBadge}>
            <Text style={styles.vacanteText}>{node.vacantes_abiertas_count} vac.</Text>
          </View>
        ) : null}
      </PressableScale>

      {expanded && hasChildren
        ? node.children.map((child) => <OrganizationTreeNode key={child.id} node={child} depth={depth + 1} />)
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm + 2,
    paddingRight: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  guideLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: Colors.border,
  },
  expandIconWrapper: {
    width: 18,
    alignItems: 'center',
  },
  leafDot: {
    width: 5,
    height: 5,
    borderRadius: Radius.full,
    backgroundColor: Colors.border,
  },
  textColumn: {
    flex: 1,
    minWidth: 0,
  },
  nombre: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  inactivo: {
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  meta: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  countText: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  vacanteBadge: {
    backgroundColor: Colors.warningSoft,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  vacanteText: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.warning,
  },
});
