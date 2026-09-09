import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';

import { Colors, FontSize, Spacing } from '@/constants/colors';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

/** Barra "Sin conexión" (V4 sección 65) — visible en toda la app, incluido login, mientras el dispositivo no tenga internet. */
export function OfflineBanner() {
  const { isOffline } = useNetworkStatus();
  const insets = useSafeAreaInsets();

  if (!isOffline) return null;

  return (
    <Animated.View entering={FadeInDown.duration(200)} exiting={FadeOutUp.duration(150)} style={[styles.banner, { paddingTop: insets.top + 6 }]}>
      <Ionicons name="cloud-offline-outline" size={14} color={Colors.white} />
      <Text style={styles.text}>Sin conexión</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1100,
    elevation: 1100,
    backgroundColor: Colors.text,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingBottom: 6,
  },
  text: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
});
