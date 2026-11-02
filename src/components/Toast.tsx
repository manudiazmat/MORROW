import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';

import { useUI } from '@/store/ui';
import { usePalette } from '@/theme';
import { useBottomSpace } from './TabBar';
import { Txt } from './ui';

/** Transient feedback with an optional action (Undo). Enters from below, leaves faster than it came. */
export function Toast() {
  const toast = useUI((s) => s.toast);
  const hide = useUI((s) => s.hideToast);
  const p = usePalette();
  const bottom = useBottomSpace();
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(hide, toast.action ? 5000 : 3000);
    return () => clearTimeout(id);
  }, [toast, hide]);
  if (!toast) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 20, right: 20, bottom: bottom - 16 }}>
      <Animated.View
        key={toast.id}
        entering={FadeInDown.springify().damping(22).stiffness(260).mass(0.8)}
        exiting={FadeOut.duration(160)}
        accessibilityLiveRegion="polite"
        style={{
          backgroundColor: p.name === 'dark' ? p.text : p.primary,
          borderRadius: 20,
          paddingHorizontal: 18,
          minHeight: 52,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          boxShadow: '0px 10px 24px rgba(0,0,0,0.22)',
        }}
      >
        <Animated.View entering={FadeIn.duration(180)} style={{ flex: 1 }}>
          <Txt v="label" color={p.name === 'dark' ? p.ground : p.onPrimary}>
            {toast.text}
          </Txt>
        </Animated.View>
        {toast.action && (
          <Pressable
            hitSlop={12}
            accessibilityRole="button"
            onPress={() => {
              toast.action?.run();
              hide();
            }}
          >
            <Txt v="label" weight="bold" color={p.name === 'dark' ? p.ground : p.onPrimary}>
              {toast.action.label}
            </Txt>
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
}
