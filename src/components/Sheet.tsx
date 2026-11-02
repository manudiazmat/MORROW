import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '@/lib/i18n';
import { dur, ease, spring } from '@/theme/motion';
import { usePalette } from '@/theme';

/**
 * Bottom sheet. Enters with the iOS drawer curve, leaves faster, follows the finger,
 * and dismisses on a quick flick (velocity) or a long drag (distance), with friction past the top.
 */
export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(open);
  const [h, setH] = useState(0);
  const y = useSharedValue(1000);
  const backdrop = useSharedValue(0);
  const heightRef = useRef(0);
  const { height: winH } = useWindowDimensions();

  if (open && !mounted) setMounted(true);

  useEffect(() => {
    if (!mounted || !h) return;
    if (open) {
      backdrop.value = withTiming(1, { duration: dur.sheetIn, easing: ease.out });
      y.value = reduce ? 0 : withTiming(0, { duration: dur.sheetIn, easing: ease.drawer });
    } else {
      backdrop.value = withTiming(0, { duration: dur.sheetOut, easing: ease.out });
      y.value = withTiming(reduce ? 0 : h + 40, { duration: dur.sheetOut, easing: ease.out }, (fin) => {
        if (fin) runOnJS(setMounted)(false);
      });
    }
  }, [open, mounted, h, reduce, y, backdrop]);

  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  // PanResponder handlers run on touch events, not during render; refs keep them current.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        // friction when dragging up past the resting point
        y.set(g.dy >= 0 ? g.dy : -Math.sqrt(-g.dy) * 2);
      },
      onPanResponderRelease: (_, g) => {
        const velocity = g.vy; // px/ms
        if (g.dy > heightRef.current * 0.35 || velocity > 0.5) closeRef.current();
        else y.set(withSpring(0, spring.sheet));
      },
      onPanResponderTerminate: () => {
        y.set(withSpring(0, spring.sheet));
      },
    }),
  );

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  if (!mounted) return null;
  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: p.scrim }, backdropStyle]}>
          <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel={t('a11y.close')} accessibilityRole="button" />
        </Animated.View>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}
        >
          <Animated.View
            onLayout={(e: LayoutChangeEvent) => {
              heightRef.current = e.nativeEvent.layout.height;
              setH(e.nativeEvent.layout.height);
            }}
            style={[
              {
                backgroundColor: p.ground,
                borderTopLeftRadius: 30,
                borderTopRightRadius: 30,
                paddingBottom: Math.max(insets.bottom, 16) + 8,
                boxShadow: '0px -8px 30px rgba(0,0,0,0.12)',
                maxHeight: winH * 0.9,
              },
              sheetStyle,
            ]}
            accessibilityViewIsModal
          >
            <View {...pan.panHandlers} style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 6 }}>
              <View style={{ width: 38, height: 5, borderRadius: 3, backgroundColor: p.panelStrong }} />
            </View>
            {children}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
