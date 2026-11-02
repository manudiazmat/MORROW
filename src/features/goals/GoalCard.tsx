import { router } from 'expo-router';
import { View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { PanelLink, Progress, Row, Txt } from '@/components/ui';
import { useLive } from '@/hooks/useData';
import { delay, goalProgress, isOverdue } from '@/lib/domain/goals';
import { shortDate } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { useStore } from '@/store';
import { space, usePalette } from '@/theme';
import type { PersonalGoal } from '@/types/models';

export function GoalCard({ goal }: { goal: PersonalGoal }) {
  const p = usePalette();
  const { t, lang } = useT();
  const fin = useLive('financial_goals');
  const fmt = useStore((s) => s.prefs.dateFormat);
  const prog = goalProgress(goal, fin);
  const late = delay(goal, fin) > 0.2;
  const overdue = isOverdue(goal);
  const status =
    goal.status === 'done'
      ? t('goals.completed')
      : goal.status === 'paused'
        ? t('goals.paused')
        : overdue
          ? t('goals.overdue')
          : late
            ? t('goals.behind')
            : t('goals.onTrack');
  const doneMs = goal.milestones.filter((m) => m.done).length;
  return (
    <Animated.View entering={FadeIn.duration(200)} layout={LinearTransition.springify().damping(20).stiffness(220)}>
      <PanelLink onPress={() => router.push(`/goals/${goal.id}`)} label={goal.title} style={{ gap: space.m }}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt v="section" numberOfLines={2}>
              {goal.title}
            </Txt>
            <Txt v="meta" muted>
              {t(`dims.${goal.dimension}`)}
              {goal.targetDate ? ` · ${t('goals.until', { date: shortDate(goal.targetDate, lang, fmt) })}` : ''}
            </Txt>
          </View>
          <Txt v="title" num>
            {Math.round(prog * 100)} %
          </Txt>
        </Row>
        <Progress value={prog} color={goal.status === 'paused' ? p.faint : p.accent} />
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt v="meta" color={(late || overdue) && goal.status === 'active' ? p.negative : p.muted}>
            {status}
          </Txt>
          {goal.milestones.length > 0 && (
            <Txt v="meta" muted num>
              {t('goals.milestones', { done: doneMs, n: goal.milestones.length })}
            </Txt>
          )}
        </Row>
      </PanelLink>
    </Animated.View>
  );
}
