/**
 * Formatos automáticos RH (contratos, cartas, constancias, recibos) —
 * contrato AÚN NO IMPLEMENTADO en capacitaciones (confirmado: no existe
 * `routes/api.php` ni controlador de "formatos" al momento de escribir este
 * cliente). Se implementa completo contra el contrato acordado — ver
 * `docs/BACKEND_GAPS_FINAL.md`.
 */

export type FormatoTipo = 'contrato' | 'solicitud' | 'recibo_nomina' | 'carta' | 'constancia' | 'otro';
export type FormatoOutput = 'pdf' | 'docx';
export type FormatoAction = 'ver' | 'generar' | 'preview' | (string & {});

export interface RhFormato {
  id: number;
  clave: string;
  nombre: string;
  descripcion?: string | null;
  tipo: FormatoTipo;
  formatos_salida: FormatoOutput[];
  variables_requeridas: string[];
  acciones_permitidas: FormatoAction[];
}

export interface FormatoMissingField {
  field: string;
  label: string;
}

/** `GET /rh/formatos/{formato}/preparar?colaborador_id=` — valores prellenados desde el expediente, nunca editables permanentemente aquí (sección 44: los overrides nunca tocan el perfil). */
export interface FormatoPreparation {
  formato: RhFormato;
  colaborador: {
    id: number;
    nombre: string;
    numero_empleado?: string | null;
  };
  valores: Record<string, string | null>;
  faltantes: FormatoMissingField[];
  puede_generar: boolean;
}

export type GeneratedDocumentAction = 'preview' | 'download' | (string & {});

export interface GeneratedDocument {
  documento_generado_id: number;
  nombre: string;
  filename: string;
  mime_type: string;
  created_at: string;
  preview_url?: string | null;
  download_url?: string | null;
  acciones_permitidas: GeneratedDocumentAction[];
}
