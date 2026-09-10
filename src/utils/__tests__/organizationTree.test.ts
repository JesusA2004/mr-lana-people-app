import { buildOrganizationTree, countUsuariosEnRama } from '../organizationTree';

import type { OrganizationPosition } from '@/types/organization';

function position(overrides: Partial<OrganizationPosition>): OrganizationPosition {
  return {
    id: 1,
    nombre: 'Puesto',
    departamento: null,
    nivel_jerarquico: 1,
    puesto_superior_id: null,
    puesto_superior: null,
    tipo_puesto: null,
    activo: true,
    usuarios_count: 0,
    vacantes_abiertas_count: 0,
    ...overrides,
  };
}

describe('buildOrganizationTree', () => {
  it('arma un árbol de varios niveles a partir de la lista plana', () => {
    const flat: OrganizationPosition[] = [
      position({ id: 1, nombre: 'Dirección General', puesto_superior_id: null }),
      position({ id: 2, nombre: 'Gerente Comercial', puesto_superior_id: 1 }),
      position({ id: 3, nombre: 'Gerente Operaciones', puesto_superior_id: 1 }),
      position({ id: 4, nombre: 'Supervisor Sucursal', puesto_superior_id: 3 }),
    ];

    const tree = buildOrganizationTree(flat);

    expect(tree).toHaveLength(1);
    expect(tree[0].nombre).toBe('Dirección General');
    expect(tree[0].children).toHaveLength(2);
    const operaciones = tree[0].children.find((node) => node.id === 3);
    expect(operaciones?.children).toHaveLength(1);
    expect(operaciones?.children[0].nombre).toBe('Supervisor Sucursal');
  });

  it('un puesto cuyo superior no viene en la lista (fuera de alcance) se trata como raíz, nunca se descarta', () => {
    const flat: OrganizationPosition[] = [position({ id: 5, nombre: 'Huérfano', puesto_superior_id: 999 })];

    const tree = buildOrganizationTree(flat);

    expect(tree).toHaveLength(1);
    expect(tree[0].nombre).toBe('Huérfano');
  });

  it('lista vacía da árbol vacío', () => {
    expect(buildOrganizationTree([])).toEqual([]);
  });
});

describe('countUsuariosEnRama', () => {
  it('suma el propio nodo más todos sus descendientes', () => {
    const tree = buildOrganizationTree([
      position({ id: 1, nombre: 'A', puesto_superior_id: null, usuarios_count: 1 }),
      position({ id: 2, nombre: 'B', puesto_superior_id: 1, usuarios_count: 3 }),
      position({ id: 3, nombre: 'C', puesto_superior_id: 1, usuarios_count: 2 }),
    ]);

    expect(countUsuariosEnRama(tree[0])).toBe(6);
  });

  it('un nodo sin hijos solo cuenta lo propio', () => {
    const tree = buildOrganizationTree([position({ id: 1, usuarios_count: 4 })]);
    expect(countUsuariosEnRama(tree[0])).toBe(4);
  });
});
