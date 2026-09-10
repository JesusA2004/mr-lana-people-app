/**
 * Parser del QR de incorporación (AGENTS.md secciones 25-26). Acepta
 * ÚNICAMENTE las ligas que RH genera de verdad
 * (`App\Services\Incorporacion\IncorporacionInvitacionService`, ver
 * capacitaciones/docs/API_MOVIL.md, "Registro por QR temporal"):
 *
 *  - `https://people.mr-lana.com/incorporacion/qr/{token}` (liga web universal, la que codifica el QR real hoy)
 *  - `mrlanapeopleapp://incorporacion/qr/{token}` (scheme actual de la app, ver app.json)
 *  - `mrlanapeople://incorporacion/qr/{token}` (scheme legado — compatibilidad temporal, ver AGENTS.md sección 25)
 *
 * Nunca ejecuta la URL, nunca sigue redirecciones, nunca abre un enlace
 * externo — solo la interpreta como texto y devuelve el token si es válido.
 * Cualquier otro host/scheme/formato se rechaza devolviendo `null`.
 */

const QR_HOST = 'people.mr-lana.com';
const QR_PATH_PREFIX = '/incorporacion/qr/';
const SUPPORTED_CUSTOM_SCHEMES = ['mrlanapeopleapp', 'mrlanapeople'];
/** `Str::random(64)` del backend es alfanumérico — margen razonable para no romper si cambia la longitud exacta. */
const TOKEN_PATTERN = /^[A-Za-z0-9]{16,128}$/;

export interface ParsedIncorporacionQr {
  token: string;
}

export function parseIncorporacionQr(raw: string): ParsedIncorporacionQr | null {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!value) return null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const scheme = url.protocol.replace(':', '');
  let path: string;

  if (scheme === 'https' && url.hostname.toLowerCase() === QR_HOST) {
    path = url.pathname;
  } else if (SUPPORTED_CUSTOM_SCHEMES.includes(scheme)) {
    // Los deep links de scheme propio no siempre traen el mismo layout de
    // host/pathname que una URL http(s): `mrlanapeopleapp://incorporacion/qr/xyz`
    // parsea como host="incorporacion", pathname="/qr/xyz" — se reconstruye
    // el path completo a mano antes de compararlo contra el prefijo esperado.
    const host = url.hostname.replace(/^\/+|\/+$/g, '');
    const rest = url.pathname.replace(/^\/+/, '');
    path = `/${[host, rest].filter(Boolean).join('/')}`;
  } else {
    return null;
  }

  if (!path.startsWith(QR_PATH_PREFIX)) return null;

  const remainder = path.slice(QR_PATH_PREFIX.length);
  const token = remainder.split('/')[0]?.split('?')[0]?.split('#')[0] ?? '';

  if (!TOKEN_PATTERN.test(token)) return null;

  return { token };
}

/** Trunca el token para logging seguro — nunca escribir el token completo (AGENTS.md sección 25). */
export function maskTokenForLog(token: string): string {
  if (token.length <= 8) return '***';
  return `${token.slice(0, 4)}…${token.slice(-4)}`;
}
