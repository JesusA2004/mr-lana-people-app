import { maskTokenForLog, parseIncorporacionQr } from '../parseIncorporacionQr';

const VALID_TOKEN = 'a'.repeat(64);

describe('parseIncorporacionQr', () => {
  it('acepta la liga web universal de producción', () => {
    expect(parseIncorporacionQr(`https://people.mr-lana.com/incorporacion/qr/${VALID_TOKEN}`)).toEqual({ token: VALID_TOKEN });
  });

  it('acepta el deep link con el scheme actual de la app', () => {
    expect(parseIncorporacionQr(`mrlanapeopleapp://incorporacion/qr/${VALID_TOKEN}`)).toEqual({ token: VALID_TOKEN });
  });

  it('acepta el deep link con el scheme legado por compatibilidad', () => {
    expect(parseIncorporacionQr(`mrlanapeople://incorporacion/qr/${VALID_TOKEN}`)).toEqual({ token: VALID_TOKEN });
  });

  it('ignora segmentos extra después del token', () => {
    expect(parseIncorporacionQr(`https://people.mr-lana.com/incorporacion/qr/${VALID_TOKEN}/extra`)).toEqual({ token: VALID_TOKEN });
  });

  it('rechaza un host distinto (posible phishing)', () => {
    expect(parseIncorporacionQr(`https://evil.example.com/incorporacion/qr/${VALID_TOKEN}`)).toBeNull();
  });

  it('rechaza un scheme no soportado', () => {
    expect(parseIncorporacionQr(`otraapp://incorporacion/qr/${VALID_TOKEN}`)).toBeNull();
  });

  it('rechaza una ruta que no es de incorporación', () => {
    expect(parseIncorporacionQr(`https://people.mr-lana.com/otra-ruta/${VALID_TOKEN}`)).toBeNull();
  });

  it('rechaza un token con caracteres inválidos', () => {
    expect(parseIncorporacionQr('https://people.mr-lana.com/incorporacion/qr/<script>alert(1)</script>')).toBeNull();
  });

  it('rechaza texto que no es una URL', () => {
    expect(parseIncorporacionQr('esto no es un QR válido')).toBeNull();
  });

  it('rechaza cadena vacía', () => {
    expect(parseIncorporacionQr('')).toBeNull();
  });

  it('rechaza un token demasiado corto', () => {
    expect(parseIncorporacionQr('https://people.mr-lana.com/incorporacion/qr/abc')).toBeNull();
  });
});

describe('maskTokenForLog', () => {
  it('nunca expone el token completo', () => {
    const masked = maskTokenForLog(VALID_TOKEN);
    expect(masked).not.toContain(VALID_TOKEN);
    expect(masked).toBe('aaaa…aaaa');
  });

  it('enmascara por completo tokens cortos', () => {
    expect(maskTokenForLog('short')).toBe('***');
  });
});
