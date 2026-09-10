import {
  confidenceLabelForLevel,
  extractedFieldLabel,
  extractionStatusLabel,
  isApplicableField,
  isExtractionInProgress,
  normalizeDocumentExtractionResponse,
  normalizeFechaNacimientoParaAplicar,
} from '../documentExtraction';

describe('extractionStatusLabel', () => {
  it('traduce cada estado a texto humano, nunca el slug crudo', () => {
    expect(extractionStatusLabel('pending')).toBe('Pendiente de análisis');
    expect(extractionStatusLabel('processing')).toBe('Analizando documento…');
    expect(extractionStatusLabel('processed')).toBe('Datos detectados');
    expect(extractionStatusLabel('failed')).toBe('No se pudo leer');
    expect(extractionStatusLabel('reviewed')).toBe('Revisado por RH');
  });

  it('estado desconocido/ausente cae en un texto neutral', () => {
    expect(extractionStatusLabel(undefined)).toBe('Sin analizar');
    expect(extractionStatusLabel('algo_nuevo')).toBe('Sin analizar');
  });
});

describe('isExtractionInProgress', () => {
  it('pending/processing siguen en progreso (habilita el polling)', () => {
    expect(isExtractionInProgress('pending')).toBe(true);
    expect(isExtractionInProgress('processing')).toBe(true);
  });

  it('processed/failed/reviewed ya terminaron (detiene el polling)', () => {
    expect(isExtractionInProgress('processed')).toBe(false);
    expect(isExtractionInProgress('failed')).toBe(false);
    expect(isExtractionInProgress('reviewed')).toBe(false);
  });
});

describe('confidenceLabelForLevel', () => {
  it('el backend real solo manda "alta"/"media" como string, nunca un decimal', () => {
    expect(confidenceLabelForLevel('alta')).toBe('Confianza alta');
    expect(confidenceLabelForLevel('media')).toBe('Confianza media');
  });

  it('sin nivel (campo sin entrada en confidence) se trata como confianza baja', () => {
    expect(confidenceLabelForLevel(undefined)).toBe('Confianza baja');
  });
});

describe('extractedFieldLabel', () => {
  it('traduce los campos conocidos', () => {
    expect(extractedFieldLabel('curp')).toBe('CURP');
    expect(extractedFieldLabel('fecha_nacimiento')).toBe('Fecha de nacimiento');
  });

  it('un campo desconocido se muestra tal cual, nunca revienta', () => {
    expect(extractedFieldLabel('campo_nuevo')).toBe('campo_nuevo');
  });
});

describe('isApplicableField', () => {
  it('curp/rfc/nss/fecha_nacimiento sí aceptan la acción aplicar', () => {
    expect(isApplicableField('curp')).toBe(true);
    expect(isApplicableField('rfc')).toBe(true);
    expect(isApplicableField('nss')).toBe(true);
    expect(isApplicableField('fecha_nacimiento')).toBe(true);
  });

  it('codigo_postal/sexo NO tienen columna propia en users — nunca ofrecer aplicar', () => {
    expect(isApplicableField('codigo_postal')).toBe(false);
    expect(isApplicableField('sexo')).toBe(false);
  });
});

describe('normalizeFechaNacimientoParaAplicar', () => {
  it('convierte separadores - y . a / (backend valida date_format:d/m/Y estricto)', () => {
    expect(normalizeFechaNacimientoParaAplicar('20-04-1995')).toBe('20/04/1995');
    expect(normalizeFechaNacimientoParaAplicar('20.04.1995')).toBe('20/04/1995');
  });

  it('una fecha ya con / se deja igual', () => {
    expect(normalizeFechaNacimientoParaAplicar('20/04/1995')).toBe('20/04/1995');
  });
});

describe('normalizeDocumentExtractionResponse', () => {
  it('bug corregido: la respuesta real es {elegible, extraccion}, no una DocumentExtraction plana', () => {
    const result = normalizeDocumentExtractionResponse({
      elegible: true,
      extraccion: {
        id: 88,
        employee_document_id: 431,
        user_id: 52,
        status: 'processed',
        extracted_data: { curp: 'ABCD920101HDFXXX01' },
        confidence: { curp: 'alta' },
        differences: { curp: { detectado: 'ABCD920101HDFXXX01', actual: null, coincide: false } },
        error_message: null,
        reviewed_by_id: null,
        reviewed_at: null,
      },
    });

    expect(result.elegible).toBe(true);
    expect(result.extraccion?.id).toBe(88);
    expect(result.extraccion?.differences?.curp?.coincide).toBe(false);
  });

  it('elegible=true con extraccion=null (job en cola todavía no corrió) no se descarta', () => {
    const result = normalizeDocumentExtractionResponse({ elegible: true, extraccion: null });
    expect(result).toEqual({ elegible: true, extraccion: null });
  });

  it('elegible=false nunca inventa una extracción', () => {
    const result = normalizeDocumentExtractionResponse({ elegible: false, extraccion: null });
    expect(result.elegible).toBe(false);
    expect(result.extraccion).toBeNull();
  });

  it('una forma inesperada (no objeto, sin id/status válidos) nunca truena — cae en no elegible', () => {
    expect(normalizeDocumentExtractionResponse(null)).toEqual({ elegible: false, extraccion: null });
    expect(normalizeDocumentExtractionResponse('texto')).toEqual({ elegible: false, extraccion: null });
    expect(normalizeDocumentExtractionResponse({ elegible: true, extraccion: { status: 'processed' } })).toEqual({
      elegible: true,
      extraccion: null,
    });
  });

  it('nunca copia extracted_text al objeto normalizado (sección 71: nunca renderizar el texto crudo)', () => {
    const result = normalizeDocumentExtractionResponse({
      elegible: true,
      extraccion: {
        id: 1,
        employee_document_id: 1,
        user_id: 1,
        status: 'processed',
        extracted_text: 'CONTENIDO SENSIBLE DEL PDF COMPLETO...',
        extracted_data: {},
        confidence: {},
        differences: {},
        error_message: null,
        reviewed_by_id: null,
        reviewed_at: null,
      },
    });

    expect(result.extraccion).not.toHaveProperty('extracted_text');
  });
});
