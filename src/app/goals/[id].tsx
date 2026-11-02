import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { StackScreen } from '@/components/Screen';
import { Button, Check, IconButton, Panel, Progress, Row, SectionHead, Txt } from '@/components/ui';
import { DIM_TO_CAT } from '@/features/constants';
import { TaskRow } from '@/features/plan/TaskRow';
import { useLive } from '@/hooks/useData';
import { todayKey } from '@/lib/dates';
import { delay, goalProgress, timeElapsed } from '@/lib/domain/goals';
import { money, shortDate } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { useStore } from '@/store';
import { useUI } from '@/store/ui';
import { space, usePalette } from '@/theme';

export default function GoalDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = usePalette();
  const { t, lang } = useT();
  const goal = useStore((s) => s.personal_goals.find((g) => g.id === id && !g.deletedAt));
  const fin = useLive('financial_goals');
  const tasks = useLive('tasks').filter((x) => x.goalId === id);
  const prefs = useStore((s) => s.prefs);
  const update = useStore((s) => s.update);
  const create = useStore((s) => s.create);
  const toast = useUI((s) => s.showToast);
  if (!goal) return <StackScreen title={t('goals.title')}>{null}</StackScreen>;

  const prog = goalProgress(goal, fin);
  const elapsed = timeElapsed(goal);
  const late = delay(goal, fin) > 0.2;
  const linked = fin.find((f) => f.id === goal.financialGoalId);

  const toggleMs = (msId: string) =>
    update('personal_goals', goal.id, {
      milestones: goal.milestones.map((m) =>
        m.id === msId ? { ...m, done: !m.done, doneAt: !m.done ? new Date().toISOString() : null } : m,
      ),
    });

  const toTask = (msId: string, title: string) => {
    create('tasks', {
      title,
      category: DIM_TO_CAT[goal.dimension],
      priority: goal.priority,
      due: todayKey(),
      status: 'todo',
      subtasks: [],
      recurrence: 'none',
      goalId: goal.id,
      milestoneId: msId,
      completedAt: null,
    });
    toast(t('goals.toTaskDone'));
  };

  return (
    <StackScreen
      title={goal.title}
      right={<IconButton icon="edit" label={t('c.edit')} onPress={() => router.push(`/edit/goal?id=${goal.id}`)} />}
    >
      <View style={{ gap: space.s }}>
        <Txt v="meta" muted>
          {t(`dim.${goal.dimension}`)} · {t(`goals.${goal.horizon}`)} · {t(`goals.status.${goal.status}`)}
        </Txt>
        {goal.description ? <Txt v="bodyL">{goal.description}</Txt> : null}
      </View>

      <Panel style={{ gap: space.m }}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Txt v="figure" num>
            {Math.round(prog * 100)} %
          </Txt>
          {goal.targetDate && (
            <Txt v="meta" muted>
              {t('goals.until', { date: shortDate(goal.targetDate, lang, prefs.dateFormat) })}
            </Txt>
          )}
        </Row>
        <Progress value={prog} height={10} />
        {elapsed != null && (
          <Txt v="meta" color={late && goal.status === 'active' ? p.negative : p.muted} num>
            {late && goal.status === 'active' ? `${t('goals.behind')} · ` : ''}
            {t('goals.timeUsed', { pct: Math.round(elapsed * 100) })}
          </Txt>
        )}
        {linked && (
          <Txt v="meta" muted num>
            {t('goals.linked', { name: linked.name })}: {money(linked.current, prefs.currency, lang)} /{' '}
            {money(linked.target, prefs.currency, lang)}
          </Txt>
        )}
      </Panel>

      <View style={{ gap: space.m }}>
        <SectionHead title={t('ed.milestones')} action={t('c.edit')} onAction={() => router.push(`/edit/goal?id=${goal.id}`)} />
        <Panel style={{ padding: space.s }}>
          {goal.milestones.length ? (
            <Animated.View layout={LinearTransition.springify().damping(20).stiffness(220)}>
              {goal.milestones.map((m) => {
                const hasTask = tasks.some((x) => x.milestoneId === m.id);
                return (
                  <View
                    key={m.id}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 56, paddingHorizontal: space.m }}
                  >
                    <Check done={m.done} label={m.title} onPress={() => toggleMs(m.id)} />
                    <Txt style={{ flex: 1 }} color={m.done ? p.muted : p.text}>
                      {m.title}
                    </Txt>
                    {!m.done && !hasTask && (
                      <IconButton
                        icon="plan"
                        flat
                        size={40}
                        label={t('goals.toTask')}
                        color={p.muted}
                        onPress={() => toTask(m.id, m.title)}
                      />
                    )}
                  </View>
                );
              })}
            </Animated.View>
          ) : (
            <View style={{ padding: space.m }}>
              <Button
                label={t('ed.addMilestone')}
                kind="raised"
                icon="plus"
                compact
                onPress={() => router.push(`/edit/goal?id=${goal.id}`)}
                style={{ alignSelf: 'flex-start' }}
              />
            </View>
          )}
        </Panel>
      </View>

      <View style={{ gap: space.m }}>
        <SectionHead title={t('goals.tasks')} action={t('c.add')} onAction={() => router.push(`/edit/task?goalId=${goal.id}`)} />
        {tasks.length > 0 && (
          <Panel style={{ padding: space.s }}>
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </Panel>
        )}
      </View>

      {goal.status !== 'done' && (
        <Row gap={space.m}>
          <Button
            label={t('goals.markDone')}
            kind="raised"
            compact
            icon="check"
            onPress={() => update('personal_goals', goal.id, { status: 'done' })}
            style={{ flex: 1 }}
          />
          <Button
            label={goal.status === 'paused' ? t('goals.resume') : t('goals.pause')}
            kind="ghost"
            compact
            onPress={() => update('personal_goals', goal.id, { status: goal.status === 'paused' ? 'active' : 'paused' })}
          />
        </Row>
      )}
    </StackScreen>
  );
}
