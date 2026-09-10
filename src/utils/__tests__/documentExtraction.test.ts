import { confidenceLabel, confidenceLevel, extractionStatusLabel, hasExtractionAction, isExtractionInProgress } from '../documentExtraction';

describe('extractionStatusLabel', () => {
  it('traduce cada estado a texto humano, nunca el slug crudo', () => {
    expect(extractionStatusLabel('pending')).toBe('En cola para analizar');
    expect(extractionStatusLabel('processing')).toBe('Analizando documento…');
    expect(extractionStatusLabel('processed')).toBe('Datos detectados');
    expect(extractionStatusLabel('reviewed')).toBe('Revisado');
    expect(extractionStatusLabel('failed')).toBe('No se pudo analizar');
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

describe('confidenceLevel / confidenceLabel', () => {
  it('0.97 es confianza alta (nunca mostrar el decimal)', () => {
    expect(confidenceLevel(0.97)).toBe('alta');
    expect(confidenceLabel(0.97)).toBe('Confianza alta');
  });

  it('0.7 es confianza media', () => {
    expect(confidenceLevel(0.7)).toBe('media');
  });

  it('0.3 es confianza baja', () => {
    expect(confidenceLevel(0.3)).toBe('baja');
  });

  it('sin valor se trata como confianza baja (nunca sobreestimar)', () => {
    expect(confidenceLevel(null)).toBe('baja');
    expect(confidenceLevel(undefined)).toBe('baja');
  });
});

describe('hasExtractionAction', () => {
  it('respeta exactamente lo que manda el backend', () => {
    expect(hasExtractionAction(['aplicar', 'ignorar'], 'aplicar')).toBe(true);
    expect(hasExtractionAction(['aplicar'], 'reprocesar')).toBe(false);
    expect(hasExtractionAction(undefined, 'aplicar')).toBe(false);
  });
});
