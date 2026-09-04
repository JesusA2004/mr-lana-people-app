/** Fábrica central de query keys — evita strings mágicos repetidos al invalidar. */
export const queryKeys = {
  dashboard: ['dashboard'] as const,
  perfil: ['perfil'] as const,
  expediente: ['expediente'] as const,
  incorporacion: ['incorporacion'] as const,
  solicitudes: ['solicitudes'] as const,
  solicitud: (id: string | number) => ['solicitudes', String(id)] as const,
  vacacionesSaldo: ['vacaciones', 'saldo'] as const,
  vacacionesSolicitudes: ['vacaciones', 'solicitudes'] as const,
  notificaciones: ['notificaciones'] as const,
};
