import { Avatar } from './Avatar';
import { DemoAvatarIllustration } from './DemoAvatarIllustration';

import { SHOW_DEMO_PROFILE_PHOTO } from '@/constants/config';
import { useAuthStore } from '@/store/authStore';

export interface ProfileAvatarProps {
  name?: string;
  /** URL autenticable con el Bearer token de la app — el backend todavía no la expone, ver src/types/collaborator.ts. */
  fotoUrlApi?: string | null;
  /** URL heredada protegida por sesión web — casi nunca cargará desde la app, se conserva como segundo intento. */
  fotoUrl?: string | null;
  size?: number;
  ringColor?: string;
}

/**
 * Cadena de prioridad de foto de perfil (AGENTS.md sección 43):
 *   1. foto_url_api / foto_url — el backend real (`GET /colaborador/foto`,
 *      streaming) manda la URL autenticada bajo el campo `foto_url` mismo
 *      (`Api\V1\ColaboradorController`, backend móvil v5) — ambos campos se
 *      tratan igual, siempre con el Bearer token de la sesión, porque
 *      cualquiera de los dos puede apuntar a esa ruta protegida.
 *   2. avatar ilustrado de desarrollo (`SHOW_DEMO_PROFILE_PHOTO`, nunca en producción)
 *   3. iniciales
 */
export function ProfileAvatar({ name, fotoUrlApi, fotoUrl, size = 56, ringColor }: ProfileAvatarProps) {
  const token = useAuthStore((state) => state.token);
  const uri = fotoUrlApi ?? fotoUrl;

  if (uri) {
    return <Avatar name={name} uri={uri} headers={token ? { Authorization: `Bearer ${token}` } : undefined} size={size} ringColor={ringColor} />;
  }

  if (SHOW_DEMO_PROFILE_PHOTO) {
    return <DemoAvatarIllustration size={size} />;
  }

  return <Avatar name={name} size={size} ringColor={ringColor} />;
}
