import type { OrganizationNode, OrganizationPosition } from '@/types/organization';

/**
 * Arma el árbol de puestos a partir de la lista plana que regresa
 * `GET /rh/jerarquia-puestos` (`puesto_superior_id`, AGENTS.md de este
 * encargo, sección 24). Un puesto sin `puesto_superior_id` — o cuyo
 * superior no viene en la lista (fuera de alcance) — se trata como raíz,
 * nunca se descarta silenciosamente. Estable y O(n): un solo recorrido para
 * indexar, uno para enlazar.
 */
export function buildOrganizationTree(positions: OrganizationPosition[]): OrganizationNode[] {
  const nodesById = new Map<number, OrganizationNode>();
  for (const position of positions) {
    nodesById.set(position.id, { ...position, children: [] });
  }

  const roots: OrganizationNode[] = [];
  for (const position of positions) {
    const node = nodesById.get(position.id);
    if (!node) continue;

    const parent = position.puesto_superior_id !== null ? nodesById.get(position.puesto_superior_id) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/** Total de colaboradores en un puesto + todos sus subordinados — usado para el badge del nodo sin tener que sumarlo en cada render. */
export function countUsuariosEnRama(node: OrganizationNode): number {
  return node.children.reduce((total, child) => total + countUsuariosEnRama(child), node.usuarios_count);
}
