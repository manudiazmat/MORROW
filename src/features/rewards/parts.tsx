import { useState } from 'react';
import { View } from 'react-native';
import Animated, { Keyframe } from 'react-native-reanimated';

import { Check, Txt } from '@/components/ui';
import { habitValue } from '@/lib/domain/rewards';
import { dayAbbr } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { useStore } from '@/store';
import { font, space, usePalette } from '@/theme';
import type { Habit, Language, RewardEntry } from '@/types/models';

/** The earned amount drifts up and dissolves, like a coin dropping into the jar (ease-out, under a second). */
const rise = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: 6 }, { scale: 0.92 }] },
  18: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
  100: { opacity: 0, transform: [{ translateY: -22 }, { scale: 1 }] },
}).duration(900);

function Burst({ text }: { text: string }) {
  const p = usePalette();
  return (
    <Animated.Text
      entering={rise}
      pointerEvents="none"
      style={{
        position: 'absolute',
        right: 0,
        top: -2,
        minWidth: 88,
        textAlign: 'right',
        // resting state is invisible: only the keyframes show it, whatever the platform does after they end
        opacity: 0,
        fontFamily: font.semibold,
        fontSize: 13,
        color: p.accent,
        fontVariant: ['tabular-nums'],
      }}
    >
      {text}
    </Animated.Text>
  );
}

/** A daily task as a checkable row with what it is worth. */
export function EarnRow({
  habit,
  day,
  fmt,
  onDone,
}: {
  habit: Habit;
  day: string;
  fmt: (c: number, sign?: boolean) => string;
  onDone?: () => void;
}) {
  const p = usePalette();
  const toggle = useStore((s) => s.toggleHabit);
  const settings = useStore((s) => s.prefs.rewards);
  const done = habit.log.includes(day);
  const value = habitValue(habit, settings);
  const [burst, setBurst] = useState<number | null>(null);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m, paddingVertical: 10, paddingHorizontal: space.s }}>
      <Check
        done={done}
        label={habit.title}
        onPress={() => {
          if (!done && value > 0) {
            const k = Date.now();
            setBurst(k);
            setTimeout(() => setBurst((b) => (b === k ? null : b)), 950);
          }
          if (!done) onDone?.();
          toggle(habit.id, day);
        }}
      />
      <Txt style={{ flex: 1 }} color={done ? p.muted : p.text}>
        {habit.title}
      </Txt>
      {value > 0 && (
        <View>
          <Txt v="meta" num weight={done ? 'semibold' : 'regular'} color={done ? p.accent : p.muted}>
            {fmt(value, true)}
          </Txt>
          {burst != null && <Burst key={burst} text={fmt(value, true)} />}
        </View>
      )}
    </View>
  );
}

export function daysSummary(days: number[], lang: Language, t: (k: string) => string): string {
  const s = [...days].sort((a, b) => a - b);
  if (s.length === 7) return t('rw.everyDay');
  if (s.join() === '1,2,3,4,5') return t('rw.weekdays');
  const mondayFirst = [...s.filter((d) => d !== 0), ...s.filter((d) => d === 0)];
  return mondayFirst.map((d) => dayAbbr(lang, d)).join(', ');
}

export function useEntryLabel() {
  const { t } = useT();
  return (e: RewardEntry) => {
    switch (e.source) {
      case 'workout':
        return t('rw.src.workout', { label: e.label });
      case 'meal':
        return t('rw.src.meal');
      case 'review':
        return t('rw.src.review');
      case 'bonus':
        return t('rw.src.bonus');
      case 'redeem':
        return t('rw.src.redeem', { label: e.label });
      default:
        return e.label;
    }
  };
}
