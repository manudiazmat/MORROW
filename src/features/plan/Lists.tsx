import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { Icon } from '@/components/Icon';
import { Button, Check, Chip, ChipRow, Empty, Field, IconButton, Panel, Press, Row, SectionHead, Txt, haptic } from '@/components/ui';
import { Disclosure } from '@/features/pickers';
import { useLive } from '@/hooks/useData';
import { addDays, dateKey, startOfDay, todayKey } from '@/lib/dates';
import { dayInitial } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { useStore } from '@/store';
import { useUI } from '@/store/ui';
import { radius, space, usePalette } from '@/theme';
import type { Habit, LeisureKind, PlanCategory } from '@/types/models';
import { LEISURE_KINDS, PLAN_CATS, SLOTS } from '../constants';
import { TaskRow } from './TaskRow';

const spring = LinearTransition.springify().damping(20).stiffness(220);

/* ------------------------------------------------------------------ Tasks */

export function TasksList() {
  const { t } = useT();
  const p = usePalette();
  const tasks = useLive('tasks');
  const ideas = useLive('ideas');
  const create = useStore((s) => s.create);
  const remove = useStore((s) => s.remove);
  const [draft, setDraft] = useState('');
  const [cat, setCat] = useState<PlanCategory | 'all'>('all');
  const [showDone, setShowDone] = useState(false);

  const filtered = tasks.filter((x) => cat === 'all' || x.category === cat);
  const pending = filtered
    .filter((x) => x.status !== 'done')
    .sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999') || a.priority - b.priority);
  const done = filtered.filter((x) => x.status === 'done').sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));

  const add = () => {
    const title = draft.trim();
    if (!title) return;
    create('tasks', {
      title,
      category: cat === 'all' ? 'personal' : cat,
      priority: 2,
      due: todayKey(),
      status: 'todo',
      subtasks: [],
      recurrence: 'none',
      goalId: null,
      milestoneId: null,
      completedAt: null,
    });
    haptic('success');
    setDraft('');
  };

  return (
    <View style={{ gap: space.xl }}>
      <Row gap={space.s}>
        <View style={{ flex: 1 }}>
          <Field
            placeholder={t('plan.quickTask')}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={add}
            returnKeyType="done"
            submitBehavior="submit"
          />
        </View>
        <IconButton icon="plus" label={t('c.add')} onPress={add} size={52} />
      </Row>
      <ChipRow>
        <Chip label={t('plan.filterAll')} selected={cat === 'all'} onPress={() => setCat('all')} />
        {PLAN_CATS.map((c) => (
          <Chip key={c} label={t(`cat.${c}`)} selected={cat === c} onPress={() => setCat(c)} />
        ))}
      </ChipRow>

      <View style={{ gap: space.m }}>
        <SectionHead title={`${t('plan.pending')} · ${pending.length}`} />
        <Panel style={{ padding: space.s }}>
          {pending.length ? (
            <Animated.View layout={spring}>
              {pending.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </Animated.View>
          ) : (
            <View style={{ padding: space.m }}>
              <Txt muted>{t('plan.noTasks')}</Txt>
            </View>
          )}
        </Panel>
      </View>

      {done.length > 0 && (
        <Animated.View layout={spring} style={{ gap: space.m }}>
          <Disclosure label={`${t('plan.doneSection')} · ${done.length}`} open={showDone} onToggle={() => setShowDone((v) => !v)} />
          {showDone && (
            <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
              <Panel style={{ padding: space.s }}>
                {done.slice(0, 20).map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </Panel>
            </Animated.View>
          )}
        </Animated.View>
      )}

      {ideas.length > 0 && (
        <View style={{ gap: space.m }}>
          <SectionHead title={t('qa.ideas')} />
          <Panel style={{ gap: space.s, padding: space.m }}>
            {ideas.map((idea) => (
              <Animated.View
                key={idea.id}
                exiting={FadeOut.duration(140)}
                layout={spring}
                style={{ flexDirection: 'row', alignItems: 'center', gap: space.s, minHeight: 48 }}
              >
                <Icon name="idea" size={18} color={p.faint} />
                <Txt style={{ flex: 1 }}>{idea.text}</Txt>
                <IconButton
                  icon="arrowUp"
                  flat
                  size={40}
                  label={t('goals.toTask')}
                  onPress={() => {
                    create('tasks', {
                      title: idea.text,
                      category: 'personal',
                      priority: 2,
                      due: null,
                      status: 'todo',
                      subtasks: [],
                      recurrence: 'none',
                      goalId: null,
                      milestoneId: null,
                      completedAt: null,
                    });
                    remove('ideas', idea.id);
                    useUI.getState().showToast(t('goals.toTaskDone'));
                  }}
                />
                <IconButton icon="close" flat size={40} label={t('c.delete')} color={p.muted} onPress={() => remove('ideas', idea.id)} />
              </Animated.View>
            ))}
          </Panel>
        </View>
      )}
    </View>
  );
}

/* --------------------------------------------------------------- Routines */

function streak(h: Habit): number {
  let n = 0;
  let d = startOfDay(new Date());
  if (!h.log.includes(dateKey(d))) d = addDays(d, -1);
  for (let i = 0; i < 400; i++) {
    if (!h.days.includes(d.getDay())) {
      d = addDays(d, -1);
      continue;
    }
    if (!h.log.includes(dateKey(d))) break;
    n++;
    d = addDays(d, -1);
  }
  return n;
}

function HabitRow({ h }: { h: Habit }) {
  const p = usePalette();
  const { t, lang } = useT();
  const toggle = useStore((s) => s.toggleHabit);
  const today = startOfDay(new Date());
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const expectedToday = h.days.includes(today.getDay());
  const doneToday = h.log.includes(dateKey(today));
  const s = streak(h);
  return (
    <Press
      onPress={() => router.push(`/edit/habit?id=${h.id}`)}
      scaleTo={0.985}
      accessibilityLabel={h.title}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.m,
        paddingVertical: space.m,
        paddingHorizontal: space.m,
        borderRadius: radius.row,
      }}
    >
      <Check done={doneToday} label={h.title} onPress={() => toggle(h.id)} />
      <View style={{ flex: 1, gap: 6 }}>
        <Txt color={expectedToday ? p.text : p.muted}>{h.title}</Txt>
        <Row gap={6}>
          {days.map((d) => {
            const k = dateKey(d);
            const expected = h.days.includes(d.getDay());
            const done = h.log.includes(k);
            return (
              <View key={k} style={{ alignItems: 'center', gap: 2 }}>
                <View
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    backgroundColor: done ? p.accent : expected ? p.panelStrong : 'transparent',
                    borderWidth: expected || done ? 0 : 1,
                    borderColor: p.panelStrong,
                  }}
                />
                <Txt v="meta" muted style={{ fontSize: 11, lineHeight: 13 }}>
                  {dayInitial(lang, d.getDay())}
                </Txt>
              </View>
            );
          })}
          {s > 1 && (
            <Txt v="meta" muted style={{ marginLeft: 6 }}>
              {t('plan.streak', { n: s })}
            </Txt>
          )}
        </Row>
      </View>
    </Press>
  );
}

export function RoutinesList() {
  const { t } = useT();
  const p = usePalette();
  const habits = useLive('habits');
  if (!habits.length)
    return (
      <Panel>
        <Empty icon="leaf" text={t('plan.noHabits')} action={t('plan.addHabit')} onAction={() => router.push('/edit/habit')} />
      </Panel>
    );
  return (
    <View style={{ gap: space.xl }}>
      {SLOTS.map((slot) => {
        const list = habits.filter((h) => h.slot === slot);
        if (!list.length) return null;
        return (
          <View key={slot} style={{ gap: space.m }}>
            <Row gap={space.s}>
              <Icon name={slot === 'morning' ? 'sun' : slot === 'evening' ? 'moon' : 'day'} size={18} color={p.muted} />
              <Txt v="section">{t(`plan.${slot}`)}</Txt>
            </Row>
            <Panel style={{ padding: space.s }}>
              {list.map((h) => (
                <HabitRow key={h.id} h={h} />
              ))}
            </Panel>
          </View>
        );
      })}
      <Button
        label={t('plan.addHabit')}
        kind="raised"
        compact
        icon="plus"
        onPress={() => router.push('/edit/habit')}
        style={{ alignSelf: 'flex-start' }}
      />
    </View>
  );
}

/* -------------------------------------------------------------- Free time */

export function FreeTimeList() {
  const { t } = useT();
  const p = usePalette();
  const items = useLive('leisure_items');
  const update = useStore((s) => s.update);
  const [kind, setKind] = useState<LeisureKind | 'all'>('all');
  const list = items
    .filter((i) => kind === 'all' || i.kind === kind)
    .sort((a, b) => Number(a.done) - Number(b.done) || (a.date ?? '9999').localeCompare(b.date ?? '9999'));
  return (
    <View style={{ gap: space.xl }}>
      <ChipRow>
        <Chip label={t('plan.filterAll')} selected={kind === 'all'} onPress={() => setKind('all')} />
        {LEISURE_KINDS.map((k) => (
          <Chip key={k} label={t(`leisure.${k}`)} selected={kind === k} onPress={() => setKind(k)} />
        ))}
      </ChipRow>
      {list.length ? (
        <Panel style={{ padding: space.s }}>
          <Animated.View layout={spring}>
            {list.map((i) => (
              <Animated.View key={i.id} layout={spring} entering={FadeIn.duration(180)}>
                <Press
                  onPress={() => router.push(`/edit/leisure?id=${i.id}`)}
                  scaleTo={0.985}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.m, minHeight: 56 }}
                >
                  <Check done={i.done} label={i.title} onPress={() => update('leisure_items', i.id, { done: !i.done })} />
                  <View style={{ flex: 1 }}>
                    <Txt color={i.done ? p.muted : p.text} style={i.done ? { textDecorationLine: 'line-through' } : undefined}>
                      {i.title}
                    </Txt>
                    <Txt v="meta" muted>
                      {t(`leisure.${i.kind}`)}
                      {i.date ? ` · ${i.date.split('-').reverse().slice(0, 2).join('/')}` : ''}
                    </Txt>
                  </View>
                </Press>
              </Animated.View>
            ))}
          </Animated.View>
        </Panel>
      ) : (
        <Panel>
          <Empty text={t('plan.noLeisure')} action={t('plan.addLeisure')} onAction={() => router.push('/edit/leisure')} />
        </Panel>
      )}
      {list.length > 0 && (
        <Button
          label={t('plan.addLeisure')}
          kind="raised"
          compact
          icon="plus"
          onPress={() => router.push('/edit/leisure')}
          style={{ alignSelf: 'flex-start' }}
        />
      )}
    </View>
  );
}
