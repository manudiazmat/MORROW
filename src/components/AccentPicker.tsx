import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { useT } from '@/lib/i18n';
import { useStore } from '@/store';
import { spring } from '@/theme/motion';
import { ACCENT_ORDER, ACCENTS, usePalette } from '@/theme';
import type { AccentName } from '@/types/models';
import { Icon } from './Icon';
import { haptic, Txt } from './ui';

function Swatch({ name, selected, onPress }: { name: AccentName; selected: boolean; onPress: () => void }) {
  const p = usePalette();
  const { t } = useT();
  const reduce = useReducedMotion();
  const color = ACCENTS[name][p.name].accent;
  const ring = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    ring.set(reduce ? (selected ? 1 : 0) : withSpring(selected ? 1 : 0, spring.lift));
  }, [selected, reduce, ring]);
  const ringStyle = useAnimatedStyle(() => ({ opacity: ring.get(), transform: [{ scale: 0.86 + 0.14 * ring.get() }] }));
  const checkStyle = useAnimatedStyle(() => ({ opacity: ring.get(), transform: [{ scale: 0.6 + 0.4 * ring.get() }] }));
  return (
    <Pressable
      onPress={() => {
        haptic('select');
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={t(`accent.${name}`)}
      style={{ width: '25%', alignItems: 'center', gap: 6, paddingVertical: 6 }}
    >
      <View style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          style={[{ position: 'absolute', width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: color }, ringStyle]}
        />
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={checkStyle}>
            <Icon name="check" size={18} color={p.name === 'dark' ? p.ground : '#FBFAF7'} stroke={2} />
          </Animated.View>
        </View>
      </View>
      <Txt v="meta" color={selected ? p.text : p.muted} weight={selected ? 'semibold' : 'regular'} numberOfLines={1}>
        {t(`accent.${name}`)}
      </Txt>
    </Pressable>
  );
}

/** Accent colour picker: grounds and text stay; only the accent family changes, live. */
export function AccentPicker() {
  const accent = useStore((s) => s.prefs.accent ?? 'sage');
  const setPrefs = useStore((s) => s.setPrefs);
  const { t } = useT();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t('pf.accent')}
      style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}
    >
      {ACCENT_ORDER.map((n) => (
        <Swatch key={n} name={n} selected={accent === n} onPress={() => setPrefs({ accent: n })} />
      ))}
    </View>
  );
}
