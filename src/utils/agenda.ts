import type { AgendaEvento, EstadoAgendaEvento } from '@/types/agenda';

/** `StatusBadge` para el estado de una cita. */
export function agendaBadge(estado: EstadoAgendaEvento | string): string {
  const porEstado: Record<EstadoAgendaEvento, string> = {
    programado: 'en_revision',
    realizado: 'aprobada',
    no_asistio: 'rechazada',
    reprogramado: 'pendiente',
    cancelado: 'cancelada',
  };
  return porEstado[estado as EstadoAgendaEvento] ?? 'pendiente';
}

/** Hora de reloj del backend (`H:i`), que es hora de México y no se convierte de zona. */
export function horaParaApi(fecha: Date): string {
  return `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;
}

/** Clave para que un reintento del mismo formulario devuelva la misma cita (máx. 64). */
export function nuevaClaveIdempotencia(): string {
  const aleatorio = () => Math.random().toString(36).slice(2, 12);
  return `app-${Date.now().toString(36)}-${aleatorio()}-${aleatorio()}`.slice(0, 64);
}

/** El comentario es obligatorio solo cuando el resultado es negativo (mismo criterio que el backend). */
export function faltaEnResultado(evento: Pick<AgendaEvento, 'tipo'>, datos: { resultado: string | null; motivo: string | null; comentario: string; evidencias: number }): string | null {
  if (!datos.resultado) return 'Elige el resultado.';
  if (evento.tipo === 'entrevista' && datos.resultado === 'no_viable') {
    if (!datos.motivo) return 'Elige el motivo.';
    if (!datos.comentario.trim()) return 'Escribe un comentario breve.';
  }
  if (evento.tipo === 'socioeconomico') {
    if (datos.evidencias === 0) return 'Adjunta el formato o las fotografías del estudio.';
    if (datos.resultado === 'no_favorable' && !datos.comentario.trim()) return 'Escribe un comentario breve.';
  }
  return null;
}

/** Busca en Maps un domicilio solo cuando la persona toca «Ruta». */
export function urlRuta(domicilio: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(domicilio)}`;
}
