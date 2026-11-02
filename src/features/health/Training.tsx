import { router } from 'expo-router';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Icon } from '@/components/Icon';
import { Button, Dot, Empty, Panel, PanelLink, Press, Progress, Row, SectionHead, Txt } from '@/components/ui';
import { useLive } from '@/hooks/useData';
import { addDays, startOfDay, startOfWeek } from '@/lib/dates';
import { sportSessions } from '@/lib/domain/health';
import { dayInitial, shortDate } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { useStore } from '@/store';
import { catColor, radius, space, usePalette } from '@/theme';
import type { WorkoutRoutine } from '@/types/models';

function RoutineCard({ r, today }: { r: WorkoutRoutine; today: boolean }) {
  const p = usePalette();
  const { t, lang } = useT();
  const ws = useStore((s) => s.prefs.weekStartsOn);
  return (
    <PanelLink onPress={() => router.push(`/edit/routine?id=${r.id}`)} label={r.name} style={{ gap: space.m }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt v="section" numberOfLines={2}>
            {r.name}
          </Txt>
          <Txt v="meta" muted>
            {t(`hl.focus.${r.focus}`)} · {r.exercises.length === 1 ? t('hl.exercise1') : t('hl.exercises', { n: r.exercises.length })} ·{' '}
            {t('hl.min', { n: r.durationMin })}
            {r.time ? ` · ${r.time}` : ''}
          </Txt>
        </View>
        <Button
          label={t('hl.start')}
          icon="play"
          kind={today ? 'primary' : 'raised'}
          compact
          onPress={() => router.push(`/health/session/${r.id}`)}
        />
      </Row>
      <Row gap={6}>
        {Array.from({ length: 7 }, (_, i) => (i + ws) % 7).map((d) => {
          const on = r.days.includes(d);
          return (
            <View
              key={d}
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: on ? p.accentSoft : 'transparent',
              }}
            >
              <Txt v="meta" color={on ? p.accentInk : p.muted} weight={on ? 'semibold' : 'regular'}>
                {dayInitial(lang, d)}
              </Txt>
            </View>
          );
        })}
      </Row>
    </PanelLink>
  );
}

export function Training() {
  const p = usePalette();
  const { t, lang } = useT();
  const prefs = useStore((s) => s.prefs);
  const routines = useLive('routines');
  const logs = useLive('workout_logs');
  const events = useLive('events');
  const tasks = useLive('tasks');
  const now = new Date();
  const ws = startOfWeek(now, prefs.weekStartsOn);
  const sessions = sportSessions({ workout_logs: logs, events, tasks }, ws, addDays(ws, 7), now);
  const todayDow = startOfDay(now).getDay();
  const sorted = [...routines].sort(
    (a, b) => Number(b.days.includes(todayDow)) - Number(a.days.includes(todayDow)) || a.name.localeCompare(b.name),
  );
  const history = [...logs].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0, 12);

  return (
    <View style={{ gap: space.xl }}>
      <Panel style={{ gap: space.m }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt v="label">{t('hl.weekSessions', { n: sessions, target: prefs.weeklySportTarget })}</Txt>
          <Icon name="dumbbell" size={20} color={p.faint} />
        </Row>
        <Progress value={prefs.weeklySportTarget ? sessions / prefs.weeklySportTarget : 0} />
      </Panel>

      <View style={{ gap: space.m }}>
        <SectionHead
          title={t('hl.routines')}
          action={routines.length ? t('c.add') : undefined}
          onAction={() => router.push('/edit/routine')}
        />
        {sorted.length ? (
          sorted.map((r) => (
            <Animated.View key={r.id} entering={FadeIn.duration(200)}>
              <RoutineCard r={r} today={r.days.includes(todayDow)} />
            </Animated.View>
          ))
        ) : (
          <Panel>
            <Empty icon="dumbbell" text={t('hl.noRoutines')} action={t('hl.newRoutine')} onAction={() => router.push('/edit/routine')} />
          </Panel>
        )}
        <Press
          onPress={() => router.push('/health/session/free')}
          scaleTo={0.985}
          style={{ flexDirection: 'row', alignItems: 'center', gap: space.s, paddingVertical: space.s }}
        >
          <Icon name="plus" size={18} color={p.muted} />
          <Txt v="label" color={p.muted}>
            {t('hl.logFree')}
          </Txt>
        </Press>
      </View>

      <View style={{ gap: space.m }}>
        <SectionHead title={t('hl.history')} />
        <Panel style={{ padding: space.s }}>
          {history.length ? (
            history.map((l) => {
              const done = l.exercises.reduce((s, e) => s + e.setsDone, 0);
              const planned = l.exercises.reduce((s, e) => s + e.setsPlanned, 0);
              return (
                <View
                  key={l.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.m,
                    minHeight: 56,
                    paddingHorizontal: space.m,
                    borderRadius: radius.row,
                  }}
                >
                  <Dot color={catColor(p, 'sport')} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt numberOfLines={1}>{l.name}</Txt>
                    <Txt v="meta" muted num>
                      {shortDate(l.date, lang, prefs.dateFormat)} · {t('hl.min', { n: l.durationMin })}
                      {planned ? ` · ${t('hl.setsOf', { done, n: planned })}` : ''}
                      {l.effort ? ` · ${t(`ss.effort.${l.effort}`)}` : ''}
                    </Txt>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={{ padding: space.m }}>
              <Txt muted>{t('hl.noHistory')}</Txt>
            </View>
          )}
        </Panel>
      </View>
    </View>
  );
}
