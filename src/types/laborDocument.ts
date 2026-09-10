/**
 * Documentos laborales del colaborador (lo que la EMPRESA le entrega/genera
 * — contrato, recibos de nómina, constancias — a diferencia del expediente,
 * que es lo que el colaborador ENTREGA a RH). Contrato AÚN NO IMPLEMENTADO
 * en capacitaciones (confirmado: no existe `routes/api.php` ni controlador
 * para esto). Se implementa completo contra el contrato acordado — ver
 * `docs/BACKEND_GAPS_FINAL.md`.
 */

export type LaborDocumentType = 'contrato' | 'recibo_nomina' | 'carta' | 'constancia' | 'otro';

export interface LaborDocument {
  id: number;
  tipo: LaborDocumentType;
  titulo: string;
  descripcion?: string | null;
  /** Solo aplica a `recibo_nomina` — ej. "01 - 15 septiembre 2026". */
  periodo?: string | null;
  fecha: string;
  mime_type?: string | null;
  size?: number | null;
  estado?: string | null;
  puede_ver: boolean;
  puede_descargar: boolean;
}
