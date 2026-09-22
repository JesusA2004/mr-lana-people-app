import type { PersonaOrganigrama } from '@/types/cicloLaboral';
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
export function countColaboradoresEnRama(node: OrganizationNode): number {
  return node.children.reduce((total, child) => total + countColaboradoresEnRama(child), node.colaboradores_count);
}

/**
 * Vista genérica de un nodo del organigrama — la MISMA forma para el árbol
 * de puestos (`/rh/jerarquia-puestos`) y el de personas (`/rh/organigrama`,
 * backend 2026-09-22), para que `OrganizationTreeNode` sea la única
 * implementación de organigrama de la app.
 */
export interface OrganizationTreeView {
  key: string;
  title: string;
  subtitle?: string | null;
  /** Conteo de personas (badge verde) — solo si el backend lo manda. */
  count?: number;
  /** Aviso secundario (badge ámbar), ej. vacantes abiertas. */
  warning?: string | null;
  muted?: boolean;
  /** Navegación opcional al tocar un nodo hoja (ej. detalle del colaborador). */
  targetId?: number;
  children: OrganizationTreeView[];
}

export function puestoToTreeView(node: OrganizationNode): OrganizationTreeView {
  return {
    key: `puesto-${node.id}`,
    title: node.nombre,
    subtitle: node.departamento ?? null,
    count: node.colaboradores_count,
    warning: node.vacantes_abiertas_count > 0 ? `${node.vacantes_abiertas_count} vac.` : null,
    muted: !node.activo,
    children: node.children.map(puestoToTreeView),
  };
}

export function personaToTreeView(node: PersonaOrganigrama): OrganizationTreeView {
  return {
    key: `persona-${node.id}`,
    title: node.nombre,
    subtitle: [node.puesto, node.sucursal].filter(Boolean).join(' · ') || null,
    count: node.subordinados.length > 0 ? node.subordinados.length : undefined,
    targetId: node.id,
    children: node.subordinados.map(personaToTreeView),
  };
}
