import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, FadeInDown, FadeOutUp } from 'react-native-reanimated';

import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/colors';
import { useToastStore, type ToastItem, type ToastType } from '@/store/toastStore';

const TOAST_DURATION_MS = 3200;

const TOAST_STYLES: Record<ToastType, { icon: keyof typeof Ionicons.glyphMap; color: string; background: string }> = {
  success: { icon: 'checkmark-circle', color: Colors.success, background: Colors.successSoft },
  error: { icon: 'close-circle', color: Colors.danger, background: Colors.dangerSoft },
  warning: { icon: 'alert-circle', color: Colors.warning, background: Colors.warningSoft },
  info: { icon: 'information-circle', color: Colors.info, background: Colors.infoSoft },
};

/** Móntalo una sola vez, cerca de la raíz de la app (ver src/app/_layout.tsx). */
export function ToastHost() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={[styles.container, { top: insets.top + Spacing.sm }]}>
      {toasts.map((item) => (
        <ToastRow key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
      ))}
    </View>
  );
}

function ToastRow({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const style = TOAST_STYLES[item.type];

  useEffect(() => {
    if (Platform.OS !== 'web') {
      const feedback =
        item.type === 'success'
          ? Haptics.NotificationFeedbackType.Success
          : item.type === 'error'
            ? Haptics.NotificationFeedbackType.Error
            : Haptics.NotificationFeedbackType.Warning;
      Haptics.notificationAsync(feedback).catch(() => {});
    }
    const timer = setTimeout(onDismiss, TOAST_DURATION_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe correr una vez por toast montado.
  }, []);

  return (
    <Animated.View
      entering={FadeInDown.duration(220).easing(Easing.out(Easing.cubic))}
      exiting={FadeOutUp.duration(180)}
      style={[styles.toast, { backgroundColor: style.background }]}>
      <Ionicons name={style.icon} size={20} color={style.color} />
      <Text style={[styles.message, { color: Colors.text }]} numberOfLines={3}>
        {item.message}
      </Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Cerrar aviso" hitSlop={10} onPress={onDismiss}>
        <Ionicons name="close" size={16} color={Colors.textMuted} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    gap: Spacing.sm,
    zIndex: 1000,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    ...Shadow.raised,
  },
  message: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
