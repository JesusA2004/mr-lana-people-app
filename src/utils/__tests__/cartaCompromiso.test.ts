import {
  cartaRecienGenerada,
  debeMostrarBannerCarta,
  encabezadoPendientes,
  maxDocumentosCarta,
  puedeSubirPendiente,
  textoDiasRestantes,
  textoExcedeMaximoCarta,
  textoSubirParaCarta,
  tituloBannerCarta,
} from '../cartaCompromiso';

import type { BloqueoDocumentos, CartaCompromiso, CartaCompromisoResumen } from '@/types/cartaCompromiso';

const CARTA: CartaCompromisoResumen = { folio: 'CC-0001', fecha_limite: '2026-10-28', dias_restantes: 5, estado: 'vigente' };
const SIN_BLOQUEO: BloqueoDocumentos = { activo: false, motivo: null, fecha_limite: '2026-10-28', pendientes: 2 };

describe('carta compromiso: banner de Inicio', () => {
  test('solo con carta vigente, algo pendiente y sin bloqueo', () => {
    expect(debeMostrarBannerCarta(CARTA, SIN_BLOQUEO)).toBe(true);
    expect(debeMostrarBannerCarta(null, SIN_BLOQUEO)).toBe(false);
    expect(debeMostrarBannerCarta({ ...CARTA, estado: 'cumplida' }, SIN_BLOQUEO)).toBe(false);
    expect(debeMostrarBannerCarta(CARTA, { ...SIN_BLOQUEO, pendientes: 0 })).toBe(false);
    expect(debeMostrarBannerCarta(CARTA, { ...SIN_BLOQUEO, activo: true, motivo: 'carta_vencida' })).toBe(false);
    // Backend sin `bloqueo_documentos`: la carta vigente basta.
    expect(debeMostrarBannerCarta(CARTA, undefined)).toBe(true);
  });

  test('títulos en singular/plural y días restantes', () => {
    expect(tituloBannerCarta(2, 5)).toBe('Tienes 2 documentos pendientes — te quedan 5 días');
    expect(tituloBannerCarta(1, 1)).toBe('Tienes 1 documento pendiente — te queda 1 día');
    expect(tituloBannerCarta(undefined, 0)).toBe('Tienes documentos pendientes — hoy es tu último día');
    expect(textoDiasRestantes(3)).toBe('te quedan 3 días');
  });
});

describe('carta compromiso: encabezado de documentos pendientes', () => {
  test('carta vencida muestra la fecha en que venció', () => {
    const e = encabezadoPendientes({ activo: true, motivo: 'carta_vencida', fecha_limite: '2026-10-14', pendientes: 1 }, null);
    expect(e.titulo).toBe('Tu carta compromiso venció el 14 de octubre de 2026');
    expect(e.tono).toBe('peligro');
  });

  test('bloqueo sin carta y recordatorio con carta vigente', () => {
    expect(encabezadoPendientes({ activo: true, motivo: 'sin_carta', fecha_limite: null, pendientes: 2 }, null).titulo).toMatch(/Te faltan documentos/);
    const vigente = encabezadoPendientes(SIN_BLOQUEO, { folio: 'CC-0001', fecha_limite: '2026-10-28', dias_restantes: 5 });
    expect(vigente.titulo).toBe('Sube tus documentos: te quedan 5 días');
    expect(vigente.mensaje).toMatch(/CC-0001/);
  });

  test('solo se ofrece «Subir» si no está ya entregado', () => {
    expect(puedeSubirPendiente('pendiente')).toBe(true);
    expect(puedeSubirPendiente('rechazado')).toBe(true);
    expect(puedeSubirPendiente('en_revision')).toBe(false);
  });
});

describe('carta compromiso: máximo de documentos por carta', () => {
  const EXCEDE: BloqueoDocumentos = { activo: true, motivo: 'excede_maximo_carta', fecha_limite: null, pendientes: 4, max_documentos_carta: 2 };
  const NUEVA: CartaCompromiso = {
    id: 9,
    folio: 'CC-2026-000009',
    estado: 'vigente',
    estado_etiqueta: 'Vigente',
    fecha_limite: '2026-10-28',
    dias_restantes: 7,
    documentos: [
      { document_type_id: 2, nombre: 'Acta de nacimiento' },
      { document_type_id: 3, nombre: 'Comprobante de domicilio' },
    ],
    generada_en: '2026-10-21T10:00:00-06:00',
  };

  test('máximo del backend o 2 por defecto', () => {
    expect(maxDocumentosCarta(undefined)).toBe(2);
    expect(maxDocumentosCarta(null)).toBe(2);
    expect(maxDocumentosCarta(0)).toBe(2);
    expect(maxDocumentosCarta(3)).toBe(3);
  });

  test('aviso del registro al marcar más que el máximo', () => {
    expect(textoExcedeMaximoCarta(2)).toBe(
      'Solo puedes dejar hasta 2 documentos pendientes con carta compromiso. Puedes terminar tu registro, pero la app quedará bloqueada (solo podrás subir documentos) hasta que te falten 2 o menos; en ese momento se generará tu carta compromiso automáticamente.',
    );
  });

  test('cuántos documentos subir para generar la carta', () => {
    expect(textoSubirParaCarta(4, 2)).toBe('Te faltan 4 documentos; sube al menos 2 documentos para generar tu carta compromiso y entrar a la app.');
    expect(textoSubirParaCarta(3, 2)).toBe('Te faltan 3 documentos; sube al menos 1 documento para generar tu carta compromiso y entrar a la app.');
  });

  test('encabezado del bloqueo por exceder el máximo (sin max del backend usa 2)', () => {
    const e = encabezadoPendientes(EXCEDE, null);
    expect(e.titulo).toBe('Te faltan 4 documentos de tu expediente');
    expect(e.mensaje).toMatch(/^Te faltan 4 documentos; sube al menos 2 documentos/);
    expect(e.tono).toBe('aviso');
    const { max_documentos_carta: _omitido, ...sinMax } = EXCEDE;
    expect(encabezadoPendientes({ ...sinMax, pendientes: 3 }, null).mensaje).toMatch(/sube al menos 1 documento /);
  });

  test('detecta la carta recién generada solo al pasar de «excede» a liberado con carta', () => {
    const liberado = { bloqueo: { ...EXCEDE, activo: false, motivo: null, pendientes: 2 }, carta: NUEVA };
    expect(cartaRecienGenerada({ bloqueo: EXCEDE, carta: null }, liberado)).toBe(NUEVA);
    // Sigue bloqueado (aún faltan más que el máximo).
    expect(cartaRecienGenerada({ bloqueo: EXCEDE, carta: null }, { bloqueo: { ...EXCEDE, pendientes: 3 }, carta: null })).toBeNull();
    // Ya tenía carta, o el bloqueo era por otro motivo.
    expect(cartaRecienGenerada({ bloqueo: EXCEDE, carta: NUEVA }, liberado)).toBeNull();
    expect(cartaRecienGenerada({ bloqueo: { ...EXCEDE, motivo: 'sin_carta' }, carta: null }, liberado)).toBeNull();
    expect(cartaRecienGenerada(null, liberado)).toBeNull();
  });
});
