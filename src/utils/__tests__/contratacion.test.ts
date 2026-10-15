import { normalizeContratacionQr } from '@/api/normalizers/rhCandidato';
import { buildIniciarContratacionPayload, mensajeCompartirQr } from '@/utils/contratacion';

/**
 * Contrato con `POST /api/v1/rh/candidatos/{id}/contratar`
 * (ContratacionCandidatoService::iniciarOReanudar + datosQr): la app recibe
 * la liga de registro y el PNG del QR para mostrarlo y compartirlo.
 */
describe('iniciar contratación desde la app', () => {
  const respuesta = {
    data: { estado_alta: 'pendiente_documentos' },
    colaborador_id: 31,
    reutilizada: true,
    invitacion: {
      invitacion_id: 12,
      codigo: 'AB12CD34',
      estado: 'activo',
      expira_en: '2026-10-16T10:00:00-06:00',
      registro_url: 'https://people.mr-lana.com/incorporacion/qr/tok123',
      qr_png: 'data:image/png;base64,iVBORw0KGgo=',
    },
  };

  it('normaliza la liga, el QR y si es la misma invitación vigente', () => {
    const qr = normalizeContratacionQr(respuesta);

    expect(qr).toEqual({
      colaborador_id: 31,
      invitacion_id: 12,
      codigo: 'AB12CD34',
      expira_en: '2026-10-16T10:00:00-06:00',
      registro_url: 'https://people.mr-lana.com/incorporacion/qr/tok123',
      qr_png: 'data:image/png;base64,iVBORw0KGgo=',
      reutilizada: true,
    });
  });

  it('sin PNG (o con algo que no es un PNG en data URI) se queda solo con la liga', () => {
    expect(normalizeContratacionQr({ ...respuesta, invitacion: { ...respuesta.invitacion, qr_png: null } }).qr_png).toBeNull();
    expect(normalizeContratacionQr({ ...respuesta, invitacion: { ...respuesta.invitacion, qr_png: 'https://otro.example/qr.png' } }).qr_png).toBeNull();
  });

  it('arma el payload laboral y valida el sueldo', () => {
    const fechaIngreso = new Date(2026, 9, 20);

    expect(buildIniciarContratacionPayload({ sueldo: '$12,500.50', fechaIngreso, modalidad: 'capacitacion_inicial', fechaFin: null })).toEqual({
      payload: { sueldo_mensual: 12500.5, fecha_ingreso: '2026-10-20', tipo_contratacion: 'capacitacion_inicial', fecha_fin_contrato: null },
    });
    expect(buildIniciarContratacionPayload({ sueldo: '', fechaIngreso, modalidad: 'capacitacion_inicial', fechaFin: null })).toHaveProperty('error');
    expect(buildIniciarContratacionPayload({ sueldo: 'abc', fechaIngreso, modalidad: 'indeterminado', fechaFin: null })).toHaveProperty('error');
    expect(buildIniciarContratacionPayload({ sueldo: '9000', fechaIngreso, modalidad: 'capacitacion_inicial', fechaFin: new Date(2026, 9, 1) })).toHaveProperty('error');
  });

  it('el mensaje para compartir incluye la liga', () => {
    const qr = normalizeContratacionQr(respuesta);

    expect(mensajeCompartirQr(qr, 'Luis')).toContain('Hola Luis');
    expect(mensajeCompartirQr(qr, null)).toContain(qr.registro_url);
  });
});
