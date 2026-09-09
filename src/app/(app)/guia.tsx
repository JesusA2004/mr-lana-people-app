import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GuideTour } from '@/components/GuideTour';
import { GUIDE_SLIDES } from '@/constants/guideSlides';
import { useAuthStore } from '@/store/authStore';
import { pickString } from '@/utils/formatters';

/** Guía de usuario re-visitable en cualquier momento (ver Ayuda → "Ver guía de la app") — mismo contenido que el onboarding de primer ingreso. */
export default function GuiaScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const nombre = pickString(user, ['nombre']);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <GuideTour
        slides={GUIDE_SLIDES}
        greetingName={nombre}
        onFinish={() => router.back()}
        onSkip={() => router.back()}
        finishLabel="Entendido"
        skipLabel="Cerrar"
      />
    </SafeAreaView>
  );
}
