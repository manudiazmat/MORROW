import { router } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { Icon } from '@/components/Icon';
import { StackScreen } from '@/components/Screen';
import { Button, Panel, Press, Row, SectionHead, Txt, haptic } from '@/components/ui';
import { daysSummary } from '@/features/rewards/parts';
import { useRewards } from '@/features/rewards/useRewards';
import { addDays, dateKey, startOfWeek } from '@/lib/dates';
import { dayPotential, habitValue, PRESET_GROUPS, PRESETS, type Preset } from '@/lib/domain/rewards';
import { CURRENCY_SYMBOL, parseAmount } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { live, useStore } from '@/store';
import { useUI } from '@/store/ui';
import { font, insetShadow, radius, size, space, usePalette } from '@/theme';
import type { RewardValueKey } from '@/types/models';

const VALUE_KEYS: RewardValueKey[] = ['habit', 'task', 'taskHigh', 'workout', 'meal', 'review', 'bonus'];
const spring = LinearTransition.springify().damping(20).stiffness(220);

/** Choose the everyday tasks that earn credit, and what each kind of thing is worth. */
export default function RewardTasks() {
  const p = usePalette();
  const { t, lang } = useT();
  const rw = useRewards();
  const habitsAll = useStore((s) => s.habits);
  const habits = live(habitsAll);
  const toast = useUI((s) => s.showToast);

  const week = Array.from({ length: 7 }, (_, i) => dateKey(addDays(startOfWeek(new Date(), 1), i)));
  const bestDay = Math.max(0, ...week.map((d) => dayPotential(habitsAll, d, rw.settings)));

  const add = (pr: Preset) => {
    const st = useStore.getState();
    const title = t(`rw.p.${pr.key}`);
    st.create('habits', {
      title,
      slot: pr.slot,
      dimension: pr.dimension,
      days: pr.days,
      log: [],
      value: pr.value,
      presetKey: pr.key,
    });
    st.startRewards();
    haptic('success');
    toast(t('rw.added', { name: title }));
  };

  return (
    <StackScreen title={t('rw.set.title')}>
      {/* Your daily tasks */}
      <View style={{ gap: space.m }}>
        <View style={{ gap: 2 }}>
          <SectionHead title={t('rw.set.yours')} />
          <Txt v="meta" muted>
            {t('rw.set.yoursSub')}
          </Txt>
        </View>
        <Panel style={{ padding: space.s }}>
          {habits.length ? (
            <Animated.View layout={spring}>
              {habits.map((h) => (
                <Animated.View key={h.id} entering={FadeIn.duration(220)} layout={spring}>
                  <Press
                    onPress={() => router.push(`/edit/habit?id=${h.id}`)}
                    scaleTo={0.985}
                    accessibilityLabel={h.title}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.m, borderRadius: radius.row }}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Txt numberOfLines={1}>{h.title}</Txt>
                      <Txt v="meta" muted>
                        {daysSummary(h.days, lang, t)}
                      </Txt>
                    </View>
                    <Txt v="label" num color={habitValue(h, rw.settings) > 0 ? p.text : p.muted}>
                      {rw.fmt(habitValue(h, rw.settings), true)}
                    </Txt>
                    <Icon name="right" size={16} color={p.faint} />
                  </Press>
                </Animated.View>
              ))}
            </Animated.View>
          ) : (
            <Txt muted style={{ padding: space.m }}>
              {t('rw.set.none')}
            </Txt>
          )}
        </Panel>
        {bestDay > 0 && (
          <Txt v="meta" muted num>
            {t('rw.set.perDay', { amount: rw.fmt(bestDay) })}
          </Txt>
        )}
        <Button
          label={t('rw.set.custom')}
          kind="raised"
          icon="plus"
          compact
          onPress={() => {
            useStore.getState().startRewards();
            router.push('/edit/habit');
          }}
          style={{ alignSelf: 'flex-start' }}
        />
      </View>

      {/* Catalogue */}
      <View style={{ gap: space.m }}>
        <View style={{ gap: 2 }}>
          <SectionHead title={t('rw.set.catalog')} />
          <Txt v="meta" muted>
            {t('rw.set.catalogSub')}
          </Txt>
        </View>
        {PRESET_GROUPS.map((g) => (
          <View key={g} style={{ gap: space.s }}>
            <Txt v="label" muted style={{ paddingHorizontal: 4 }}>
              {t(`rw.g.${g}`)}
            </Txt>
            <Panel style={{ padding: space.s }}>
              {PRESETS.filter((pr) => pr.group === g).map((pr) => {
                const mine = habits.find((h) => h.presetKey === pr.key);
                return (
                  <Press
                    key={pr.key}
                    onPress={() => (mine ? router.push(`/edit/habit?id=${mine.id}`) : add(pr))}
                    scaleTo={0.985}
                    accessibilityLabel={t(`rw.p.${pr.key}`)}
                    accessibilityState={{ selected: !!mine }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.m, borderRadius: radius.row }}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Txt color={mine ? p.muted : p.text}>{t(`rw.p.${pr.key}`)}</Txt>
                      <Txt v="meta" muted num>
                        {rw.fmt(pr.value, true)} · {daysSummary(pr.days, lang, t)}
                      </Txt>
                    </View>
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 15,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: mine ? p.accent : p.raised,
                        boxShadow: mine ? undefined : insetShadow(p),
                      }}
                    >
                      <Icon
                        name={mine ? 'check' : 'plus'}
                        size={16}
                        color={mine ? (p.name === 'dark' ? p.ground : '#FBFAF7') : p.text}
                        stroke={2}
                      />
                    </View>
                  </Press>
                );
              })}
            </Panel>
          </View>
        ))}
      </View>

      {/* Values */}
      <View style={{ gap: space.m }}>
        <View style={{ gap: 2 }}>
          <SectionHead title={t('rw.set.values')} />
          <Txt v="meta" muted>
            {t('rw.set.valuesSub')}
          </Txt>
        </View>
        <Panel style={{ paddingVertical: space.s, paddingHorizontal: space.l }}>
          {VALUE_KEYS.map((k) => (
            <ValueRow key={k} k={k} />
          ))}
        </Panel>
      </View>
    </StackScreen>
  );
}

function ValueRow({ k }: { k: RewardValueKey }) {
  const p = usePalette();
  const { t, lang } = useT();
  const value = useStore((s) => s.prefs.rewards.values[k]);
  const setPrefs = useStore((s) => s.setPrefs);
  const rewards = useStore((s) => s.prefs.rewards);
  const currency = useStore((s) => s.prefs.currency);
  const show = (c: number) => (lang === 'es' ? (c / 100).toFixed(2).replace('.', ',') : (c / 100).toFixed(2));
  const [text, setText] = useState(show(value));
  const [last, setLast] = useState(value);
  if (value !== last) {
    setLast(value);
    setText(show(value));
  }
  const commit = () => {
    const c = text.trim() === '' ? 0 : parseAmount(text);
    if (c == null || c < 0) {
      setText(show(value));
      return;
    }
    if (c !== value) setPrefs({ rewards: { ...rewards, values: { ...rewards.values, [k]: c } } });
    setText(show(c));
  };
  return (
    <Row style={{ justifyContent: 'space-between', paddingVertical: 8 }}>
      <Txt style={{ flex: 1 }}>{t(`rw.v.${k}`)}</Txt>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          width: 104,
          height: 42,
          borderRadius: radius.control,
          backgroundColor: p.well,
          boxShadow: insetShadow(p),
          paddingHorizontal: space.m,
        }}
      >
        <TextInput
          value={text}
          onChangeText={setText}
          onBlur={commit}
          onSubmitEditing={commit}
          keyboardType="decimal-pad"
          returnKeyType="done"
          selectTextOnFocus
          accessibilityLabel={t(`rw.v.${k}`)}
          maxFontSizeMultiplier={1.4}
          style={
            {
              flex: 1,
              minWidth: 0,
              width: '100%',
              textAlign: 'right',
              color: p.text,
              fontFamily: font.medium,
              fontSize: size.body,
              fontVariant: ['tabular-nums'],
              outlineStyle: 'none',
            } as never
          }
        />
        <Txt v="meta" muted style={{ marginLeft: 4 }}>
          {CURRENCY_SYMBOL[currency]}
        </Txt>
      </View>
    </Row>
  );
}
