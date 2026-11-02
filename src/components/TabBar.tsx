import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '@/lib/i18n';
import { useUI } from '@/store/ui';
import { dur, ease, spring } from '@/theme/motion';
import { font, layout, usePalette } from '@/theme';
import { Icon, type IconName } from './Icon';
import { haptic, Press } from './ui';

const ICONS: Record<string, IconName> = {
  index: 'home',
  plan: 'plan',
  finance: 'finance',
  health: 'dumbbell',
  goals: 'goals',
};
const LABELS: Record<string, string> = {
  index: 'tab.home',
  plan: 'tab.plan',
  finance: 'tab.finance',
  health: 'tab.health',
  goals: 'tab.goals',
};

function TabItem({ name, active, onPress, label }: { name: string; active: boolean; onPress: () => void; label: string }) {
  const p = usePalette();
  const reduce = useReducedMotion();
  const t = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    t.value = reduce ? (active ? 1 : 0) : withSpring(active ? 1 : 0, spring.snap);
  }, [active, reduce, t]);

  const grow = useAnimatedStyle(() => ({ flexGrow: 1 + 1.35 * t.value }));
  const pill = useAnimatedStyle(() => ({ opacity: t.value, transform: [{ scale: 0.9 + 0.1 * t.value }] }));
  const text = useAnimatedStyle(() => ({
    opacity: withTiming(active ? 1 : 0, { duration: active ? 200 : 90, easing: ease.out }),
    maxWidth: 120 * t.value,
  }));

  const pillBg = p.name === 'dark' ? p.text : p.ground;
  const activeInk = p.name === 'dark' ? p.ground : p.text;
  const idleInk = p.name === 'dark' ? p.muted : '#C9C6BC';

  return (
    <Animated.View style={[{ flexBasis: 0, height: 48 }, grow]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        accessibilityLabel={label}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      >
        <Animated.View
          style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: 24, backgroundColor: pillBg }, pill]}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 8 }}>
          <Icon name={ICONS[name]} size={20} color={active ? activeInk : idleInk} />
          <Animated.Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
            style={[{ fontFamily: font.semibold, fontSize: 13, color: activeInk }, text]}
          >
            {label}
          </Animated.Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** Floating navigation pill with the Quick Add button beside it (from the user's reference). */
export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const open = useUI((s) => s.quickAdd.open);
  const openQuickAdd = useUI((s) => s.openQuickAdd);
  const rot = useSharedValue(0);
  useEffect(() => {
    rot.value = withTiming(open ? 1 : 0, { duration: dur.base, easing: ease.out });
  }, [open, rot]);
  const plus = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value * 45}deg` }] }));

  const barBg = p.name === 'dark' ? p.panelStrong : p.primary;
  const fabBg = p.name === 'dark' ? p.text : p.primary;
  const fabInk = p.name === 'dark' ? p.ground : p.onPrimary;
  const shadow =
    p.name === 'dark'
      ? '0px 12px 28px rgba(0,0,0,0.55), -2px -2px 8px rgba(255,255,255,0.03)'
      : '0px 12px 26px rgba(55,58,53,0.28), -4px -4px 12px rgba(255,255,255,0.9)';

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: Math.max(insets.bottom, 8) + layout.tabBarBottom - 4,
        alignItems: 'center',
        paddingHorizontal: 16,
      }}
    >
      <View
        pointerEvents="box-none"
        style={{ width: '100%', maxWidth: layout.maxWidth - 32, flexDirection: 'row', alignItems: 'center', gap: 12 }}
      >
        <View
          accessibilityRole="tablist"
          style={{
            flex: 1,
            height: layout.tabBarHeight,
            borderRadius: 32,
            backgroundColor: barBg,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 8,
            boxShadow: shadow,
          }}
        >
          {state.routes.map((route, i) => {
            const active = state.index === i;
            return (
              <TabItem
                key={route.key}
                name={route.name}
                label={t(LABELS[route.name] ?? route.name)}
                active={active}
                onPress={() => {
                  if (!active) {
                    haptic('select');
                    navigateToTab(route.key);
                  }
                }}
              />
            );
          })}
        </View>
        <Press
          onPress={() => {
            haptic('light');
            openQuickAdd();
          }}
          scaleTo={0.94}
          accessibilityLabel={t('a11y.quickAdd')}
          style={{
            width: layout.tabBarHeight,
            height: layout.tabBarHeight,
            borderRadius: layout.tabBarHeight / 2,
            backgroundColor: fabBg,
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: shadow,
          }}
        >
          <Animated.View style={plus}>
            <Icon name="plus" size={24} color={fabInk} stroke={1.8} />
          </Animated.View>
        </Press>
      </View>
    </View>
  );
}

export function useBottomSpace() {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, 8) + layout.tabBarBottom + layout.tabBarHeight + 28;
}
