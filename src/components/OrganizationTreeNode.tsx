import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from './PressableScale';

import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import type { OrganizationTreeView } from '@/utils/organizationTree';

export interface OrganizationTreeNodeProps {
  node: OrganizationTreeView;
  /** Profundidad para la indentación — la raíz empieza en 0. */
  depth?: number;
  /** Los primeros dos niveles abren solados por default; el resto arranca colapsado (AGENTS.md de este encargo, sección 69: "lazy expand", nunca 3,000 nodos de golpe). */
  defaultExpanded?: boolean;
  /** Toque en un nodo hoja con `targetId` (ej. abrir el detalle del colaborador). */
  onOpen?: (node: OrganizationTreeView) => void;
}

const INDENT_PER_LEVEL = 18;

/**
 * Nodo recursivo del organigrama (sección 24/69): vertical, indentado, con
 * líneas guía — nunca un organigrama horizontal de 7 columnas en 360px. Solo
 * renderiza los hijos de un nodo cuando ese nodo está expandido, así que un
 * árbol de miles de nodos nunca se monta completo de una vez.
 *
 * Única implementación de organigrama de la app: sirve para PUESTOS
 * (`puestoToTreeView`) y para PERSONAS (`personaToTreeView`).
 */
export function OrganizationTreeNode({ node, depth = 0, defaultExpanded = depth < 1, onOpen }: OrganizationTreeNodeProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const hasChildren = node.children.length > 0;
  const canOpen = !hasChildren && node.targetId !== undefined && !!onOpen;

  return (
    <View>
      <PressableScale
        haptic={false}
        accessibilityRole={hasChildren || canOpen ? 'button' : undefined}
        accessibilityLabel={`${node.title}${hasChildren ? (expanded ? ', contraer' : ', expandir') : ''}`}
        onPress={hasChildren ? () => setExpanded((value) => !value) : canOpen ? () => onOpen?.(node) : undefined}
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
          <Text style={[styles.nombre, node.muted && styles.inactivo]} numberOfLines={1}>
            {node.title}
          </Text>
          {node.subtitle ? (
            <Text style={styles.meta} numberOfLines={1}>
              {node.subtitle}
            </Text>
          ) : null}
        </View>

        {node.count !== undefined && node.count > 0 ? (
          <View style={styles.countBadge}>
            <Ionicons name="person" size={11} color={Colors.primaryDark} />
            <Text style={styles.countText}>{node.count}</Text>
          </View>
        ) : null}
        {node.warning ? (
          <View style={styles.vacanteBadge}>
            <Text style={styles.vacanteText}>{node.warning}</Text>
          </View>
        ) : null}
        {canOpen ? <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} /> : null}
      </PressableScale>

      {expanded && hasChildren
        ? node.children.map((child) => <OrganizationTreeNode key={child.key} node={child} depth={depth + 1} onOpen={onOpen} />)
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 48,
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
