import { router } from 'expo-router';
import { useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { Icon, Mark } from '@/components/Icon';
import { LifeBalanceFlower } from '@/components/LifeBalanceFlower';
import { ProfileButton, TabScreen } from '@/components/Screen';
import { TaskRow } from '@/features/plan/TaskRow';
import { Button, Dot, Empty, Panel, PanelLink, Press, Row, SectionHead, Txt } from '@/components/ui';
import { flowerData, useLifeBalance, useLive } from '@/hooks/useData';
import { addDays, dateKey, hhmm, monthKey, parseDate, startOfDay, startOfWeek } from '@/lib/dates';
import { monthTotals } from '@/lib/domain/finance';
import { goalProgress } from '@/lib/domain/goals';
import { sportSessions } from '@/lib/domain/health';
import { computeInsights } from '@/lib/domain/insights';
import { capitalize, longDate, money } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { occurrences } from '@/lib/recurrence';
import { useStore } from '@/store';
import { useUI } from '@/store/ui';
import { catColor, space, usePalette } from '@/theme';

export default function Home() {
  const p = usePalette();
  const { t, lang } = useT();
  const { width } = useWindowDimensions();
  const prefs = useStore((s) => s.prefs);
  const state = useStore();
  const tasks = useLive('tasks');
  const events = useLive('events');
  const txs = useLive('transactions');
  const goals = useLive('personal_goals');
  const logs = useLive('workout_logs');
  const fin = useLive('financial_goals');
  const { results, overall, shortLabel } = useLifeBalance();

  const now = new Date();
  const today = dateKey(now);
  const hour = now.getHours();
  const greeting = hour < 13 ? t('home.morning') : hour < 21 ? t('home.afternoon') : t('home.evening');

  const todayOcc = (() => {
    const d = startOfDay(parseDate(today));
    return occurrences(events, d, addDays(d, 1));
  })();
  const upcoming = todayOcc.filter((o) => o.end > now);
  const next = upcoming[0];

  const dueToday = tasks
    .filter((x) => x.status !== 'done' && x.due && x.due <= today)
    .sort((a, b) => a.priority - b.priority || (a.due ?? '').localeCompare(b.due ?? ''));
  const doneToday = tasks.filter((x) => x.completedAt?.slice(0, 10) === today).length;

  const fact = next
    ? t('home.factNext', { title: next.event.title, time: hhmm(next.start) })
    : dueToday.length > 1
      ? t('home.factTasks', { n: dueToday.length })
      : dueToday.length === 1
        ? t('home.factTask1')
        : doneToday > 0
          ? t('home.factDone')
          : t('home.factClear');

  // Week
  const ws = startOfWeek(now, prefs.weekStartsOn);
  const sportDone = sportSessions({ workout_logs: logs, events, tasks }, ws, addDays(ws, 7), now);
  const month = monthTotals(txs, monthKey(now));
  const activeGoals = goals.filter((g) => g.status === 'active');
  const avgGoal = activeGoals.length ? activeGoals.reduce((s, g) => s + goalProgress(g, fin), 0) / activeGoals.length : null;

  const insight = prefs.notifications.insights ? computeInsights(state, now)[0] : undefined;
  const flowerSize = Math.min(width - 40 - 40, 320);
  const hasBalance = results.some((r) => r.combined != null);

  return (
    <TabScreen
      context="home"
      right={<ProfileButton />}
      header={
        <View style={{ gap: 6 }}>
          <Txt v="h1">
            {greeting}
            {prefs.name ? `, ${prefs.name}` : ''}.
          </Txt>
          <Txt muted>
            {capitalize(longDate(now, lang))} · {fact}
          </Txt>
        </View>
      }
    >
      {insight && (
        <Animated.View entering={FadeIn.duration(300)}>
          <Press
            onPress={() => router.push(insight.href as never)}
            scaleTo={0.985}
            accessibilityLabel={t(insight.k, insight.p as never)}
            style={{ flexDirection: 'row', gap: space.m, alignItems: 'flex-start', paddingHorizontal: 4 }}
          >
            <View style={{ paddingTop: 1 }}>
              <Mark size={20} color={p.muted} />
            </View>
            <Txt style={{ flex: 1 }}>
              {t(insight.k, { ...insight.p, cat: insight.p?.cat ? t(`txc.${insight.p.cat}`).toLowerCase() : '' })}
            </Txt>
            <Icon name="right" size={18} color={p.faint} />
          </Press>
        </Animated.View>
      )}

      {/* Today */}
      <PanelLink onPress={() => router.push('/plan')} label={t('home.today')} style={{ gap: space.l }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt v="section">{t('home.today')}</Txt>
          <Icon name="right" size={18} color={p.faint} />
        </Row>
        {next ? (
          <View style={{ gap: 4 }}>
            <Txt v="meta" muted>
              {t('home.nextEvent')} · {next.event.allDay ? t('plan.allDay') : `${hhmm(next.start)}–${hhmm(next.end)}`}
            </Txt>
            <Row gap={space.s}>
              <Dot color={catColor(p, next.event.category)} />
              <Txt v="title" style={{ flex: 1 }} numberOfLines={2}>
                {next.event.title}
              </Txt>
            </Row>
            {next.event.location ? (
              <Row gap={6}>
                <Icon name="pin" size={14} color={p.muted} />
                <Txt v="meta" muted>
                  {next.event.location}
                </Txt>
              </Row>
            ) : null}
          </View>
        ) : (
          <Txt muted>{t('home.noEvents')}</Txt>
        )}
        {upcoming.length > 1 && (
          <View style={{ gap: space.s }}>
            {upcoming.slice(1, 4).map((o) => (
              <Row key={o.event.id + o.day} gap={space.m}>
                <Txt v="meta" num muted style={{ width: 44 }}>
                  {o.event.allDay ? '—' : hhmm(o.start)}
                </Txt>
                <Dot color={catColor(p, o.event.category)} size={6} />
                <Txt numberOfLines={1} style={{ flex: 1 }}>
                  {o.event.title}
                </Txt>
              </Row>
            ))}
          </View>
        )}
      </PanelLink>

      {/* Priorities */}
      <View style={{ gap: space.m }}>
        <SectionHead
          title={t('home.priorities')}
          action={dueToday.length > 5 ? t('c.viewAll') : undefined}
          onAction={() => router.push('/plan?tab=tasks')}
        />
        <Panel style={{ paddingVertical: space.s, paddingHorizontal: space.s }}>
          {dueToday.length ? (
            <Animated.View layout={LinearTransition.springify().damping(20).stiffness(220)}>
              {dueToday.slice(0, 5).map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </Animated.View>
          ) : (
            <View style={{ padding: space.m }}>
              <Empty text={t('home.noPriorities')} action={t('home.addTask')} onAction={() => useUI.getState().openQuickAdd('task')} />
            </View>
          )}
        </Panel>
      </View>

      {/* Week */}
      <View style={{ gap: space.m }}>
        <SectionHead title={t('home.week')} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.m }}>
          <WeekTile
            label={t('home.sport')}
            value={t('home.sportValue', { n: sportDone, target: prefs.weeklySportTarget })}
            onPress={() => router.push('/health')}
          />
          <WeekTile
            label={t('home.balance')}
            value={money(month.savings, prefs.currency, lang, { sign: month.savings > 0 })}
            tone={month.savings < 0 ? p.negative : undefined}
            bold
            onPress={() => router.push('/finance')}
          />
          <WeekTile
            label={t('home.goals')}
            value={activeGoals.length ? `${Math.round((avgGoal ?? 0) * 100)} %` : t('home.noGoals')}
            caption={activeGoals.length ? t('home.goalsValue', { n: activeGoals.length }) : undefined}
            onPress={() => router.push('/goals')}
          />
          <WeekTile
            label={t('home.review')}
            value={t('home.done', { n: tasks.filter((x) => x.completedAt && x.completedAt.slice(0, 10) >= dateKey(ws)).length })}
            caption={t('home.reviewSub')}
            onPress={() => router.push('/review')}
          />
        </View>
      </View>

      {/* Life Balance */}
      <PanelLink onPress={() => router.push('/life-balance')} label={t('home.lifeBalance')} style={{ gap: space.l, alignItems: 'center' }}>
        <Row style={{ justifyContent: 'space-between', alignSelf: 'stretch' }}>
          <View>
            <Txt v="section">{t('home.lifeBalance')}</Txt>
            {overall != null && (
              <Txt v="meta" muted>
                {t('home.lbOverall', { n: results.filter((r) => r.combined != null).length })}
              </Txt>
            )}
          </View>
          {overall != null ? (
            <Txt v="figure" num>
              {overall.toFixed(1).replace('.', lang === 'es' ? ',' : '.')}
              <Txt v="body" muted>
                {' '}
                / 12
              </Txt>
            </Txt>
          ) : (
            <Icon name="right" size={18} color={p.faint} />
          )}
        </Row>
        <LifeBalanceFlower data={flowerData(results, shortLabel)} size={flowerSize} onSelect={(k) => router.push(`/life-balance/${k}`)} />
        {!hasBalance && (
          <View style={{ alignSelf: 'stretch', gap: space.m }}>
            <Txt muted>{t('home.lbEmpty')}</Txt>
            <Button
              label={t('home.lbRate')}
              kind="raised"
              compact
              onPress={() => router.push('/life-balance/rate')}
              style={{ alignSelf: 'flex-start' }}
            />
          </View>
        )}
      </PanelLink>
    </TabScreen>
  );
}

function WeekTile({
  label,
  value,
  caption,
  onPress,
  tone,
  bold,
}: {
  label: string;
  value: string;
  caption?: string;
  onPress: () => void;
  tone?: string;
  bold?: boolean;
}) {
  return (
    <PanelLink
      onPress={onPress}
      label={`${label}: ${value}`}
      style={{ flexGrow: 1, flexBasis: '45%', minHeight: 112, padding: space.l, justifyContent: 'space-between', gap: space.s }}
    >
      <Txt v="meta" muted>
        {label}
      </Txt>
      <View style={{ gap: 2 }}>
        <Txt v="title" num color={tone} weight={bold ? 'bold' : 'regular'} numberOfLines={1}>
          {value}
        </Txt>
        {caption && (
          <Txt v="meta" muted numberOfLines={1}>
            {caption}
          </Txt>
        )}
      </View>
    </PanelLink>
  );
}
