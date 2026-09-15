import { bajaSinEvidencia422, bajaSinFiniquito422 } from '@/test/fixtures/backend';
import { blockedApprovalReason } from '../rhBlockedActions';

function axios422(data: unknown) {
  return Object.assign(new Error('Unprocessable'), { isAxiosError: true, response: { status: 422, data } });
}

describe('blockedApprovalReason', () => {
  it('muestra el mensaje EXACTO del backend cuando falta el finiquito', () => {
    const blocked = blockedApprovalReason(axios422(bajaSinFiniquito422));

    expect(blocked?.message).toBe('Calcula y revisa el finiquito antes de aprobar esta baja.');
  });

  it('el finiquito ofrece salida al portal web, porque solo existe ahí', () => {
    const blocked = blockedApprovalReason(axios422(bajaSinFiniquito422));

    expect(blocked?.webPath).toBe('rh/finiquitos');
    expect(blocked?.webCtaLabel).toBe('Completar en portal web');
  });

  it('la evidencia NO manda al portal: se adjunta desde la propia app', () => {
    const blocked = blockedApprovalReason(axios422(bajaSinEvidencia422));

    expect(blocked?.message).toBe('Adjunta la evidencia/firma del gerente antes de aprobar esta baja.');
    expect(blocked?.webPath).toBeUndefined();
  });

  it('un 422 cualquiera no se confunde con un bloqueo de baja', () => {
    expect(blockedApprovalReason(axios422({ message: 'x', errors: { motivo: ['El motivo es obligatorio.'] } }))).toBeNull();
  });

  it('ignora errores sin validación (red, 403, 409)', () => {
    expect(blockedApprovalReason(new Error('offline'))).toBeNull();
    expect(
      blockedApprovalReason(Object.assign(new Error('Forbidden'), { isAxiosError: true, response: { status: 403, data: {} } })),
    ).toBeNull();
  });
});
