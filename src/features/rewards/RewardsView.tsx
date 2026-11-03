import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { Icon } from '@/components/Icon';
import { Sheet } from '@/components/Sheet';
import { Button, Chip, IconButton, Panel, PanelLink, Press, Progress, Row, SectionHead, Toggle, Txt, haptic } from '@/components/ui';
import { BASICS, BONUS_MIN_HABITS, PRESETS, type Allocation } from '@/lib/domain/rewards';
import { dateKey, parseDate } from '@/lib/dates';
import { percent, shortDate } from '@/lib/format';
import { confirmDestructive } from '@/lib/confirm';
import { useT } from '@/lib/i18n';
import { live, useStore } from '@/store';
import { useUI } from '@/store/ui';
import { layout, radius, raisedShadow, space, usePalette } from '@/theme';
import type { Reward } from '@/types/models';
import { Thumb } from '../health/images';
import { EarnRow, useEntryLabel } from './parts';
import { etaKey, useRewards } from './useRewards';

const spring = LinearTransition.springify().damping(20).stiffness(220);

/** Adds the starter set of everyday tasks (skipping any already there) and starts counting. */
export function addBasics(t: (k: string) => string): number {
  const st = useStore.getState();
  const have = new Set(live(st.habits).map((h) => h.presetKey));
  let n = 0;
  for (const key of BASICS) {
    const pr = PRESETS.find((x) => x.key === key);
    if (!pr || have.has(key)) continue;
    st.create('habits', {
      title: t(`rw.p.${key}`),
      slot: pr.slot,
      dimension: pr.dimension,
      days: pr.days,
      log: [],
      value: pr.value,
      presetKey: key,
    });
    n++;
  }
  st.startRewards();
  return n;
}

export function RewardsView() {
  const rw = useRewards();
  const { t } = useT();
  const [redeeming, setRedeeming] = useState<Reward | null>(null);
  const hasAny = rw.queue.length > 0 || rw.redeemed.length > 0;

  return (
    <View style={{ gap: space.xxl }}>
      {rw.first && rw.firstAlloc ? (
        <Hero reward={rw.first} a={rw.firstAlloc} eta={rw.eta} fmt={rw.fmt} onRedeem={() => setRedeeming(rw.first ?? null)} />
      ) : (
        <EmptyHero again={hasAny} />
      )}

      {(rw.settings.since || rw.todayHabits.length > 0) && <TodayPanel />}

      {rw.queue.length > 1 && <Queue />}

      <Row gap={space.m} style={{ flexWrap: 'wrap' }}>
        {rw.first && <Button label={t('rw.add')} kind="raised" icon="plus" compact onPress={() => router.push('/edit/reward')} />}
        <Button label={t('rw.manage')} kind="ghost" icon="sliders" compact onPress={() => router.push('/rewards/tasks')} />
      </Row>

      {rw.ledger.length > 0 && <Movements />}
      {rw.redeemed.length > 0 && <Redeemed />}

      {rw.settings.since && (
        <Txt v="meta" muted>
          {t('rw.notMoney')}
        </Txt>
      )}

      <RedeemSheet reward={redeeming} onClose={() => setRedeeming(null)} />
    </View>
  );
}

/* ------------------------------------------------------------------ Hero */

function Hero({
  reward,
  a,
  eta,
  fmt,
  onRedeem,
}: {
  reward: Reward;
  a: Allocation;
  eta: number | null;
  fmt: (c: number, sign?: boolean) => string;
  onRedeem: () => void;
}) {
  const p = usePalette();
  const { t, lang } = useT();
  const e = etaKey(eta);
  return (
    <PanelLink onPress={() => router.push(`/edit/reward?id=${reward.id}`)} label={reward.name} style={{ padding: 0, overflow: 'hidden' }}>
      {reward.image ? <Thumb uri={reward.image} icon="gift" style={{ width: '100%', aspectRatio: 16 / 10, borderRadius: 0 }} /> : null}
      <View style={{ padding: space.xl, gap: space.l }}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt v="meta" muted>
              {t('home.reward')}
            </Txt>
            <Txt v="title" numberOfLines={2}>
              {reward.name}
            </Txt>
          </View>
          <Txt v="section" num>
            {fmt(reward.price)}
          </Txt>
        </Row>

        {a.funded ? (
          <Animated.View entering={FadeIn.duration(300)} style={{ gap: space.m }}>
            <Row gap={space.s}>
              <Icon name="gift" size={22} color={p.accent} />
              <Txt v="title">{t('rw.funded')}</Txt>
            </Row>
            <Progress value={1} height={12} />
            <Txt muted>{t('rw.fundedBody')}</Txt>
            <Button label={t('rw.redeem')} icon="check" onPress={onRedeem} />
          </Animated.View>
        ) : (
          <View style={{ gap: space.s }}>
            <Animated.View key={a.remaining} entering={FadeIn.duration(260)}>
              <Txt v="title" num>
                {t('rw.left', { amount: fmt(a.remaining) })}
              </Txt>
            </Animated.View>
            <Progress value={a.progress} height={12} />
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt v="meta" muted num>
                {t('rw.ofPrice', { saved: fmt(a.saved), price: fmt(reward.price) })}
              </Txt>
              <Txt v="meta" muted num>
                {percent(a.progress, lang)}
              </Txt>
            </Row>
            <Txt muted>{t(e.k, e.n != null ? { n: e.n } : undefined)}</Txt>
          </View>
        )}

        {reward.url ? (
          <View style={{ alignSelf: 'flex-start' }}>
            <Chip label={t('rw.link')} icon="link" onPress={() => void Linking.openURL(reward.url!)} />
          </View>
        ) : null}
      </View>
    </PanelLink>
  );
}

function EmptyHero({ again }: { again: boolean }) {
  const p = usePalette();
  const { t } = useT();
  return (
    <Panel style={{ gap: space.l, alignItems: 'flex-start' }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 18,
          borderCurve: 'continuous',
          backgroundColor: p.raised,
          boxShadow: raisedShadow(p),
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="gift" size={26} color={p.text} />
      </View>
      <View style={{ gap: space.s }}>
        <Txt v="title">{t('rw.emptyTitle')}</Txt>
        <Txt muted>{t('rw.emptyBody')}</Txt>
      </View>
      <Button label={again ? t('rw.add') : t('rw.choose')} icon="plus" onPress={() => router.push('/edit/reward')} />
    </Panel>
  );
}

/* ----------------------------------------------------------------- Today */

function TodayPanel() {
  const p = usePalette();
  const { t } = useT();
  const rw = useRewards();
  const toast = useUI((s) => s.showToast);
  const settings = rw.settings;
  const wd = parseDate(rw.today).getDay();
  const planned = rw.todayHabits.filter((h) => h.days.includes(wd));
  const bonusOn = settings.values.bonus > 0 && planned.length >= BONUS_MIN_HABITS;
  const bonusDone = rw.ledger.some((e) => e.key === `bonus:${rw.today}`);

  return (
    <View style={{ gap: space.m }}>
      <SectionHead title={t('rw.today')} action={t('rw.manage')} onAction={() => router.push('/rewards/tasks')} />
      <Panel style={{ paddingVertical: space.m, paddingHorizontal: space.s, gap: 2 }}>
        <View style={{ paddingHorizontal: space.s, paddingBottom: space.s, gap: 2 }}>
          <Animated.View key={rw.todayEarned} entering={FadeIn.duration(220)}>
            <Txt v="section" num>
              {t('rw.todayEarned', { amount: rw.fmt(rw.todayEarned) })}
            </Txt>
          </Animated.View>
          {rw.todayPotential > 0 && (
            <Txt v="meta" muted num>
              {t('rw.todayPotential', { amount: rw.fmt(rw.todayPotential) })}
            </Txt>
          )}
        </View>
        {rw.todayHabits.length ? (
          <Animated.View layout={spring}>
            {rw.todayHabits.map((h) => (
              <EarnRow key={h.id} habit={h} day={rw.today} fmt={rw.fmt} />
            ))}
          </Animated.View>
        ) : (
          <View style={{ padding: space.s, gap: space.m, alignItems: 'flex-start' }}>
            <Txt muted>{t('rw.noHabits')}</Txt>
            <Row gap={space.s} style={{ flexWrap: 'wrap' }}>
              <Button
                label={t('rw.addBasics')}
                compact
                icon="plus"
                onPress={() => {
                  const n = addBasics(t);
                  haptic('success');
                  toast(t('rw.basicsAdded', { n }));
                }}
              />
              <Button label={t('rw.manage')} compact kind="ghost" onPress={() => router.push('/rewards/tasks')} />
            </Row>
          </View>
        )}
        {bonusOn && (
          <Row gap={space.m} style={{ paddingHorizontal: space.s, paddingTop: space.s }}>
            <View style={{ width: 26, alignItems: 'center' }}>
              <Icon name="gift" size={18} color={bonusDone ? p.accent : p.faint} />
            </View>
            <Txt v="meta" color={bonusDone ? p.accent : p.muted} weight={bonusDone ? 'semibold' : 'regular'} style={{ flex: 1 }}>
              {bonusDone
                ? t('rw.bonusDone', { amount: rw.fmt(settings.values.bonus) })
                : t('rw.bonusHint', { amount: rw.fmt(settings.values.bonus) })}
            </Txt>
          </Row>
        )}
      </Panel>
      <Txt v="meta" muted>
        {t('rw.also')}: {t('rw.alsoBody').charAt(0).toLowerCase() + t('rw.alsoBody').slice(1)}
      </Txt>
    </View>
  );
}

/* ----------------------------------------------------------------- Queue */

function Queue() {
  const p = usePalette();
  const { t } = useT();
  const rw = useRewards();
  const moveFirst = useStore((s) => s.moveRewardFirst);
  const toast = useUI((s) => s.showToast);
  return (
    <View style={{ gap: space.m }}>
      <View style={{ gap: 2 }}>
        <SectionHead title={t('rw.queue')} />
        <Txt v="meta" muted>
          {t('rw.queueSub')}
        </Txt>
      </View>
      <Panel style={{ padding: space.s }}>
        <Animated.View layout={spring}>
          {rw.queue.slice(1).map((r) => {
            const a = rw.alloc.get(r.id)!;
            return (
              <Animated.View key={r.id} layout={spring}>
                <Press
                  onPress={() => router.push(`/edit/reward?id=${r.id}`)}
                  scaleTo={0.985}
                  accessibilityLabel={r.name}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.s, borderRadius: radius.row }}
                >
                  <Thumb uri={r.image} size={48} icon="gift" />
                  <View style={{ flex: 1, gap: 6 }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Txt numberOfLines={1} style={{ flex: 1 }}>
                        {r.name}
                      </Txt>
                      <Txt v="meta" muted num>
                        {rw.fmt(r.price)}
                      </Txt>
                    </Row>
                    <Progress value={a.progress} height={6} />
                  </View>
                  <IconButton
                    icon="arrowUp"
                    label={t('rw.first')}
                    color={p.muted}
                    onPress={() => {
                      haptic('select');
                      moveFirst(r.id);
                      toast(t('rw.movedFirst'));
                    }}
                  />
                </Press>
              </Animated.View>
            );
          })}
        </Animated.View>
      </Panel>
    </View>
  );
}

/* ------------------------------------------------------------- Movements */

function Movements() {
  const p = usePalette();
  const { t, lang } = useT();
  const fmtDate = useStore((s) => s.prefs.dateFormat);
  const rw = useRewards();
  const label = useEntryLabel();
  const [all, setAll] = useState(false);
  const list = rw.ledger.slice(0, all ? 40 : 6);
  const today = dateKey(new Date());
  return (
    <View style={{ gap: space.m }}>
      <SectionHead
        title={t('rw.history')}
        action={rw.ledger.length > 6 ? (all ? t('c.viewLess') : t('c.viewAll')) : undefined}
        onAction={() => setAll((x) => !x)}
      />
      <Panel style={{ paddingVertical: space.s, paddingHorizontal: space.l }}>
        <Row style={{ justifyContent: 'space-between', paddingVertical: space.s }}>
          <Txt v="label" muted>
            {t('rw.balance')}
          </Txt>
          <Txt v="section" num>
            {rw.fmt(rw.wallet.balance)}
          </Txt>
        </Row>
        <Animated.View layout={spring}>
          {list.map((e) => (
            <Row key={e.id} style={{ paddingVertical: 9, justifyContent: 'space-between' }}>
              <View style={{ flex: 1, gap: 1 }}>
                <Txt numberOfLines={1}>{label(e)}</Txt>
                <Txt v="meta" muted>
                  {e.date === today ? t('rw.today') : shortDate(e.date, lang, fmtDate)}
                </Txt>
              </View>
              <Txt num v="label" color={e.amount < 0 ? p.muted : p.text}>
                {rw.fmt(e.amount, e.amount > 0)}
              </Txt>
            </Row>
          ))}
        </Animated.View>
      </Panel>
    </View>
  );
}

/* -------------------------------------------------------------- Redeemed */

function Redeemed() {
  const { t, lang } = useT();
  const fmtDate = useStore((s) => s.prefs.dateFormat);
  const unredeem = useStore((s) => s.unredeemReward);
  const rw = useRewards();
  return (
    <View style={{ gap: space.m }}>
      <SectionHead title={t('rw.done')} />
      <Panel style={{ padding: space.s }}>
        {rw.redeemed.map((r) => (
          <Press
            key={r.id}
            onPress={async () => {
              const ok = await confirmDestructive(
                t('rw.undoTitle'),
                t('rw.undoBody', { price: rw.fmt(r.price) }),
                t('rw.undo'),
                t('c.cancel'),
              );
              if (ok) unredeem(r.id);
            }}
            scaleTo={0.985}
            accessibilityLabel={`${r.name}. ${t('rw.undo')}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.s, borderRadius: radius.row }}
          >
            <Thumb uri={r.image} size={44} icon="gift" />
            <View style={{ flex: 1, gap: 1 }}>
              <Txt numberOfLines={1}>{r.name}</Txt>
              <Txt v="meta" muted>
                {t('rw.redeemedOn', { date: r.redeemedAt ? shortDate(dateKey(new Date(r.redeemedAt)), lang, fmtDate) : '' })}
              </Txt>
            </View>
            <Txt v="meta" muted num>
              {rw.fmt(r.price)}
            </Txt>
          </Press>
        ))}
      </Panel>
    </View>
  );
}

/* ---------------------------------------------------------------- Redeem */

function RedeemSheet({ reward, onClose }: { reward: Reward | null; onClose: () => void }) {
  const { t } = useT();
  const rw = useRewards();
  const redeem = useStore((s) => s.redeemReward);
  const toast = useUI((s) => s.showToast);
  const [record, setRecord] = useState(true);
  const price = reward ? rw.fmt(reward.price) : '';
  return (
    <Sheet open={!!reward} onClose={onClose}>
      {reward && (
        <View style={{ gap: space.l, paddingHorizontal: layout.gutter, paddingBottom: space.l }}>
          <Txt v="title">{t('rw.redeemTitle', { name: reward.name })}</Txt>
          <Txt muted>{t('rw.redeemBody', { price })}</Txt>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt>{t('rw.recordExpense')}</Txt>
              <Txt v="meta" muted>
                {t('rw.recordExpenseSub', { price })}
              </Txt>
            </View>
            <Toggle value={record} onChange={setRecord} label={t('rw.recordExpense')} />
          </Row>
          <Button
            label={t('rw.redeem')}
            icon="check"
            onPress={() => {
              redeem(reward.id, record);
              haptic('success');
              toast(t('rw.redeemed'));
              onClose();
            }}
          />
        </View>
      )}
    </Sheet>
  );
}
