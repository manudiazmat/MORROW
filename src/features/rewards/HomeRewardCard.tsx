import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { Icon } from '@/components/Icon';
import { PanelLink, Progress, Row, Txt } from '@/components/ui';
import { parseDate } from '@/lib/dates';
import { percent } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { space, usePalette } from '@/theme';
import { Thumb } from '../health/images';
import { EarnRow } from './parts';
import { useRewards } from './useRewards';

const open = () => router.push('/goals?view=rewards');
const layout = LinearTransition.springify().damping(20).stiffness(220);

/** Home: the reward being earned, how far it is, and the next daily tasks to tick off right here. */
export function HomeRewardCard() {
  const p = usePalette();
  const { t, lang } = useT();
  const rw = useRewards();
  // a ticked row lingers for a beat so the check and the earned amount can be seen before it makes room
  const [recent, setRecent] = useState<string[]>([]);
  const linger = (id: string) => {
    setRecent((x) => [...x, id]);
    setTimeout(() => setRecent((x) => x.filter((y) => y !== id)), 1400);
  };

  if (!rw.first || !rw.firstAlloc) {
    if (rw.redeemed.length) return null;
    return (
      <PanelLink onPress={open} label={t('home.rewardHint')} style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
        <Icon name="gift" size={22} color={p.text} />
        <Txt style={{ flex: 1 }}>{t('home.rewardHint')}</Txt>
        <Icon name="right" size={18} color={p.faint} />
      </PanelLink>
    );
  }

  const r = rw.first;
  const a = rw.firstAlloc;
  const wd = parseDate(rw.today).getDay();
  const planned = rw.todayHabits.filter((h) => h.days.includes(wd));
  const doneN = planned.filter((h) => h.log.includes(rw.today)).length;
  const pending = rw.todayHabits.filter((h) => !h.log.includes(rw.today) || recent.includes(h.id)).slice(0, 3);

  return (
    <PanelLink onPress={open} label={`${t('home.reward')}: ${r.name}`} style={{ gap: space.l }}>
      <Row gap={space.m}>
        <Thumb uri={r.image} size={52} icon="gift" />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt v="meta" muted>
            {t('home.reward')}
          </Txt>
          <Txt v="section" numberOfLines={1}>
            {r.name}
          </Txt>
        </View>
        <Icon name="right" size={18} color={p.faint} />
      </Row>
      <View style={{ gap: space.s }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Animated.View key={a.remaining} entering={FadeIn.duration(240)}>
            <Txt v="label" num color={a.funded ? p.accent : p.text}>
              {a.funded ? t('rw.funded') : t('rw.left', { amount: rw.fmt(a.remaining) })}
            </Txt>
          </Animated.View>
          <Txt v="meta" muted num>
            {percent(a.progress, lang)}
          </Txt>
        </Row>
        <Progress value={a.progress} height={10} />
        <Txt v="meta" muted num>
          {planned.length
            ? t('home.rewardToday', { amount: rw.fmt(rw.todayEarned), done: doneN, n: planned.length })
            : t('home.rewardTodayNone', { amount: rw.fmt(rw.todayEarned) })}
        </Txt>
      </View>
      {pending.length > 0 && (
        <Animated.View layout={layout} style={{ marginHorizontal: -space.s, marginBottom: -space.s }}>
          {pending.map((h) => (
            <Animated.View key={h.id} layout={layout} entering={FadeIn.duration(220)} exiting={FadeOut.duration(180)}>
              <EarnRow habit={h} day={rw.today} fmt={rw.fmt} onDone={() => linger(h.id)} />
            </Animated.View>
          ))}
        </Animated.View>
      )}
    </PanelLink>
  );
}
