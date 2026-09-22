import type { Acta } from '@/types/rhCiclo';

const LABEL: Record<string, string> = {
  borrador: 'Borrador',
  generada: 'Formato generado',
  firmada: 'Firmada',
  cerrada: 'Cerrada',
  cancelada: 'Cancelada',
};

export function actaEstadoLabel(estado: string): string {
  return LABEL[estado] ?? estado;
}

export function actaBadge(estado: string): string {
  if (estado === 'borrador') return 'pendiente';
  if (estado === 'cerrada') return 'cerrada';
  if (estado === 'cancelada') return 'cancelada';
  if (estado === 'firmada') return 'aprobado';
  return 'en_revision';
}

export type ActaOperation = 'editar' | 'anexo' | 'generar_documento' | 'negativa_firma' | 'seguimiento' | 'cerrar';

/**
 * Acciones de un acta según `ActaAdministrativaPolicy::gestionar()`:
 * `actas.gestionar` sobre cualquier acta en alcance, o `actas.crear` solo
 * sobre SU borrador (el backend compara `creado_por`, que la API no
 * expone: si no es suya, responde 403 y la app lo informa).
 * Editar (PATCH) solo tiene sentido en borrador; cerrar/seguimiento cuando
 * no está cerrada/cancelada.
 */
export function availableActaOperations(acta: Pick<Acta, 'estado'>, permissions: string[] | undefined): ActaOperation[] {
  const perms = new Set(permissions ?? []);
  const gestiona = perms.has('actas.gestionar');
  const creaBorrador = perms.has('actas.crear') && acta.estado === 'borrador';
  if (!gestiona && !creaBorrador) return [];
  if (acta.estado === 'cerrada' || acta.estado === 'cancelada') return [];

  const ops: ActaOperation[] = [];
  if (acta.estado === 'borrador') ops.push('editar');
  ops.push('anexo', 'generar_documento');
  if (gestiona) {
    ops.push('negativa_firma', 'seguimiento');
    // `ActaService::cerrar()`: exige que el formato ya se haya generado (no borrador).
    if (acta.estado !== 'borrador') ops.push('cerrar');
  }
  return ops;
}
