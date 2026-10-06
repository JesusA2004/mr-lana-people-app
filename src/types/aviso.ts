/**
 * Aviso de RH (mensaje + imagen opcional, a toda la empresa o a un
 * colaborador) — `App\Models\Aviso` / `App\Services\Avisos\AvisoService`.
 */
export interface AvisoItem {
  id: number;
  titulo: string;
  mensaje: string;
  alcance: 'todos' | 'colaborador';
  /** Ruta relativa a la API (requiere Bearer token) — nunca pública. */
  imagen_path: string | null;
  creado_por?: { id: number; name: string; apellidos: string | null } | null;
  enviado_en: string | null;
  leido?: boolean;
}
