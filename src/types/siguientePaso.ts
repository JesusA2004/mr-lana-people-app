/**
 * Panel «qué sigue» — `App\Services\Flujos\Dto\SiguientePaso` (docs/SIGUIENTE_PASO.md).
 * La app solo lo pinta: nunca calcula el paso ni ejecuta un `href` de la web.
 */
export interface SiguientePasoAccion {
  clave: string;
  etiqueta: string;
  solo_web: boolean;
  /** Ruta web relativa; solo sirve para abrir el portal. */
  href: string | null;
}

export interface SiguientePaso {
  tipo: 'accion' | 'espera' | 'terminado';
  estado: string | null;
  mensaje: string;
  responsable: string | null;
  accion: SiguientePasoAccion | null;
  bloqueos: string[];
}

/** Entrada de `reaperturas`: lo que ESTA cuenta puede reabrir (`ReaperturaService::disponibles`). */
export interface ReaperturaDisponible {
  tipo: string;
  id: number;
  etiqueta: string;
}
