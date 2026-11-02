import { useEffect, useRef, useState } from 'react';
import { PanResponder, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { spring } from '@/theme/motion';
import { insetShadow, raisedShadow, usePalette } from '@/theme';
import { haptic } from './ui';

const MAX = 12;

/**
 * 0–12 scale: a sunken track, a sage fill and a raised thumb. Tap anywhere or drag;
 * each whole step clicks (haptics). Empty (null) shows no thumb until touched.
 */
export function ScoreScale({ value, onChange, label }: { value: number | null; onChange: (v: number) => void; label: string }) {
  const p = usePalette();
  const reduce = useReducedMotion();
  const [w, setW] = useState(0);
  const wRef = useRef(0);
  const last = useRef<number | null>(value);
  const x = useSharedValue(0);
  const THUMB = 30;

  useEffect(() => {
    if (!w) return;
    const target = value == null ? 0 : (value / MAX) * (w - THUMB);
    x.value = reduce ? target : withSpring(target, spring.snap);
    last.current = value;
  }, [value, w, reduce, x]);

  const pick = (px: number) => {
    const usable = wRef.current - THUMB;
    const v = Math.max(0, Math.min(MAX, Math.round(((px - THUMB / 2) / usable) * MAX)));
    if (v !== last.current) {
      last.current = v;
      haptic('select');
      onChange(v);
    }
  };

  const pickRef = useRef(pick);
  useEffect(() => {
    pickRef.current = pick;
  });
  // PanResponder handlers run on touch events, not during render; refs keep them current.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => pickRef.current(e.nativeEvent.locationX),
      onPanResponderMove: (e) => pickRef.current(e.nativeEvent.locationX),
    }),
  );

  const fill = useAnimatedStyle(() => ({ width: x.value + THUMB }));
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: MAX, now: value ?? undefined, text: value == null ? '—' : `${value} / 12` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        const v = value ?? 0;
        if (e.nativeEvent.actionName === 'increment') onChange(Math.min(MAX, v + 1));
        if (e.nativeEvent.actionName === 'decrement') onChange(Math.max(0, v - 1));
      }}
      onLayout={(e) => {
        setW(e.nativeEvent.layout.width);
        wRef.current = e.nativeEvent.layout.width;
      }}
      {...pan.panHandlers}
      style={{ height: 44, justifyContent: 'center' }}
    >
      <View
        style={{
          height: THUMB + 6,
          borderRadius: (THUMB + 6) / 2,
          backgroundColor: p.well,
          boxShadow: insetShadow(p),
          padding: 3,
          justifyContent: 'center',
        }}
      >
        <View
          style={{ position: 'absolute', left: 3 + THUMB / 2, right: 3 + THUMB / 2, flexDirection: 'row', justifyContent: 'space-between' }}
          pointerEvents="none"
        >
          {Array.from({ length: MAX + 1 }, (_, i) => (
            <View key={i} style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: p.faint, opacity: 0.5 }} />
          ))}
        </View>
        {value != null && (
          <>
            <Animated.View
              pointerEvents="none"
              style={[{ position: 'absolute', left: 3, height: THUMB, borderRadius: THUMB / 2, backgroundColor: p.petalFill }, fill]}
            />
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  left: 3,
                  width: THUMB,
                  height: THUMB,
                  borderRadius: THUMB / 2,
                  backgroundColor: p.raised,
                  boxShadow: raisedShadow(p),
                },
                thumb,
              ]}
            />
          </>
        )}
      </View>
    </View>
  );
}
