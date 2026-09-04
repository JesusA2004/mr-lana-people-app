import { Avatar } from './Avatar';
import { DemoAvatarIllustration } from './DemoAvatarIllustration';

import { SHOW_DEMO_PROFILE_PHOTO } from '@/constants/config';
import { useAuthStore } from '@/store/authStore';

export interface ProfileAvatarProps {
  name?: string;
  /** URL autenticable con el Bearer token de la app (`GET /api/v1/colaborador/foto`, ver docs/MOBILE_BACKEND_REQUIREMENTS.md P0.3). */
  fotoUrlApi?: string | null;
  /** URL heredada protegida por sesión web — casi nunca cargará desde la app, se conserva como segundo intento. */
  fotoUrl?: string | null;
  size?: number;
  ringColor?: string;
}

/**
 * Cadena de prioridad de foto de perfil (AGENTS.md):
 *   1. foto_url_api (autenticada con el Bearer token de la sesión)
 *   2. foto_url (heredada, sesión web — normalmente falla desde la app)
 *   3. avatar ilustrado de desarrollo (`SHOW_DEMO_PROFILE_PHOTO`, nunca en producción)
 *   4. iniciales
 */
export function ProfileAvatar({ name, fotoUrlApi, fotoUrl, size = 56, ringColor }: ProfileAvatarProps) {
  const token = useAuthStore((state) => state.token);

  if (fotoUrlApi) {
    return (
      <Avatar
        name={name}
        uri={fotoUrlApi}
        headers={token ? { Authorization: `Bearer ${token}` } : undefined}
        size={size}
        ringColor={ringColor}
      />
    );
  }

  if (fotoUrl) {
    return <Avatar name={name} uri={fotoUrl} size={size} ringColor={ringColor} />;
  }

  if (SHOW_DEMO_PROFILE_PHOTO) {
    return <DemoAvatarIllustration size={size} />;
  }

  return <Avatar name={name} size={size} ringColor={ringColor} />;
}
