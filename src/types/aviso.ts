/** Adjunto de un aviso; se abre por `GET /avisos/{id}/archivo` (Bearer). */
export interface AdjuntoAviso {
  tipo: 'imagen' | 'pdf';
  nombre: string | null;
  tamano: number | null;
  mime: string | null;
}

/**
 * Aviso de RH (mensaje + imagen o PDF opcional, a toda la empresa o a un
 * colaborador) — `App\Models\Aviso` / `App\Services\Avisos\AvisoService`.
 */
export interface AvisoItem {
  id: number;
  titulo: string;
  mensaje: string;
  alcance: 'todos' | 'colaborador';
  /** Adjunto (imagen o PDF). Ausente en backends anteriores: se usa `imagen_path`. */
  archivo?: AdjuntoAviso | null;
  /** Compatibilidad: no nulo solo si el adjunto es imagen. */
  imagen_path: string | null;
  creado_por?: { id: number; name: string; apellidos: string | null } | null;
  enviado_en: string | null;
  leido?: boolean;
}
