import type { AllowedAction, RhSolicitud } from '@/types/rh';

/**
 * Único punto de verdad para leer `acciones_permitidas` (AGENTS.md sección
 * 8): la app NUNCA decide qué botón mostrar por su cuenta, solo pregunta si
 * la acción está en el arreglo que mandó el backend. Si `acciones_permitidas`
 * no trae `"aprobar"`, el botón Aprobar no existe — no se deshabilita, no
 * se muestra "próximamente".
 */
export function hasAction(actions: AllowedAction[] | undefined, action: AllowedAction): boolean {
  return Array.isArray(actions) && actions.includes(action);
}

export function canApprove(actions?: AllowedAction[]): boolean {
  return hasAction(actions, 'aprobar');
}

export function canReject(actions?: AllowedAction[]): boolean {
  return hasAction(actions, 'rechazar');
}

export function canRequestCorrection(actions?: AllowedAction[]): boolean {
  return hasAction(actions, 'solicitar_correccion');
}

export function canAuthorizeChange(actions?: AllowedAction[]): boolean {
  return hasAction(actions, 'autorizar_cambio');
}

/**
 * Seguridad para las dos solicitudes "complejas" (préstamo y baja de
 * colaborador): ¿se ofrece el botón GENÉRICO "Aprobar"
 * (`POST .../rh/solicitudes/{id}/aprobar`)?
 *
 * - Préstamo: NUNCA. Autorizar un préstamo es otra operación
 *   (`POST .../prestamo/autorizar`, con monto y plazo AUTORIZADOS, contrato y
 *   pagaré) y vive exclusivamente en `PrestamoDecision`. El "Aprobar"
 *   genérico no debe crear ni autorizar un préstamo por accidente.
 * - Baja de colaborador: solo cuando el backend mande colaborador, fecha
 *   efectiva y tipo de baja (hoy todavía no — se revisa en Portal RH).
 * - Cualquier otro tipo: sí (sigue dependiendo de `acciones_permitidas`).
 */
export function puedeAprobarSolicitudComplejaMovil(
  solicitud: Pick<RhSolicitud, 'tipo' | 'colaborador_objetivo' | 'fecha_efectiva' | 'tipo_baja'>,
): boolean {
  if (solicitud.tipo === 'prestamo') return false;

  if (solicitud.tipo === 'baja_colaborador') {
    return Boolean(solicitud.colaborador_objetivo) && Boolean(solicitud.fecha_efectiva) && Boolean(solicitud.tipo_baja);
  }

  return true;
}

/**
 * ¿Se ofrece el "Rechazar" GENÉRICO? Para un préstamo con bloque
 * `prestamo`, no: el rechazo va por `POST .../prestamo/rechazar` dentro de
 * `PrestamoDecision` — nunca dos botones "Rechazar" que hacen operaciones
 * distintas. Si un backend viejo no manda `prestamo`, se conserva el
 * genérico (única vía disponible).
 */
export function usaRechazoGenerico(solicitud: Pick<RhSolicitud, 'tipo' | 'prestamo' | 'acciones_permitidas'>): boolean {
  if (solicitud.tipo === 'prestamo' && solicitud.prestamo) return false;
  return canReject(solicitud.acciones_permitidas);
}

/**
 * La solicitud necesita revisión en Portal RH porque la app no tiene los
 * datos para decidirla: préstamo sin bloque `prestamo` (backend viejo) o
 * baja sin sus campos.
 */
export function requiereRevisionPortal(solicitud: Pick<RhSolicitud, 'tipo' | 'prestamo' | 'colaborador_objetivo' | 'fecha_efectiva' | 'tipo_baja'>): boolean {
  if (solicitud.tipo === 'prestamo') return !solicitud.prestamo;
  if (solicitud.tipo === 'baja_colaborador') return !puedeAprobarSolicitudComplejaMovil(solicitud);
  return false;
}

/** true si el tipo de la solicitud es uno de los que requieren la revisión completa de arriba. */
export function esSolicitudCompleja(tipo: string | undefined): boolean {
  return tipo === 'prestamo' || tipo === 'baja_colaborador';
}

export type VistoBuenoTono = 'success' | 'warning' | 'danger' | 'neutral';

/** Texto + tono del visto bueno del jefe (nunca solo color: siempre texto). */
export function describirVistoBueno(vb: { requerido: boolean; estado: string } | null | undefined): { label: string; tone: VistoBuenoTono } {
  if (!vb || !vb.requerido || vb.estado === 'no_aplica') return { label: 'No requiere visto bueno', tone: 'neutral' };
  switch (vb.estado) {
    case 'aprobado':
      return { label: 'Visto bueno aprobado', tone: 'success' };
    case 'rechazado':
      return { label: 'Visto bueno rechazado', tone: 'danger' };
    case 'pendiente':
      return { label: 'Pendiente de visto bueno', tone: 'warning' };
    default:
      return { label: `Visto bueno: ${vb.estado.replace(/_/g, ' ')}`, tone: 'neutral' };
  }
}

/**
 * Motivo útil cuando `puede_autorizar === false` en una solicitud aún
 * abierta. Solo describe lo que el backend dijo; no decide nada.
 */
export function motivoNoAutorizable(
  prestamo: { puede_autorizar: boolean; monto_solicitado: number | null; visto_bueno: { requerido: boolean; estado: string } },
): string | null {
  if (prestamo.puede_autorizar) return null;
  const vb = prestamo.visto_bueno;
  if (vb.requerido && vb.estado === 'pendiente') return 'Pendiente de visto bueno del jefe inmediato.';
  if (vb.requerido && vb.estado === 'rechazado') return 'El jefe inmediato no dio su visto bueno.';
  if (prestamo.monto_solicitado == null) return 'La solicitud no indica un monto; revísala en Portal RH.';
  return 'Tu cuenta no puede autorizar este préstamo.';
}
