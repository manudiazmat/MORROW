import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { Check, Chip, Field, IconButton, Row, Segmented, Toggle, Txt } from '@/components/ui';
import { useLive } from '@/hooks/useData';
import { parseDateTime, timeOf, todayKey, withTime } from '@/lib/dates';
import { dayInitial, money, parseAmount } from '@/lib/format';
import { uid } from '@/lib/id';
import { useT } from '@/lib/i18n';
import { ensurePermission, rescheduleReminders } from '@/lib/notifications';
import { useStore } from '@/store';
import { space, usePalette } from '@/theme';
import type {
  CalendarEvent,
  DimensionKey,
  Habit,
  LeisureItem,
  LeisureKind,
  PlanCategory,
  Priority,
  Recurrence,
  RoutineSlot,
  Subtask,
  Task,
  TaskStatus,
} from '@/types/models';
import { DIMS, LEISURE_KINDS, PLAN_CATS, RECURRENCES, SLOTS } from '../constants';
import { ChoiceField, DateField, TimeField } from '../pickers';
import { EditorScaffold } from './Scaffold';

const spring = LinearTransition.springify().damping(20).stiffness(220);

/* ------------------------------------------------------------------- Task */

export function TaskEditor({ id, title: initialTitle, goalId: initialGoal }: { id?: string; title?: string; goalId?: string }) {
  const { t } = useT();
  const p = usePalette();
  const existing = useStore((s) => s.tasks.find((x) => x.id === id));
  const goals = useLive('personal_goals').filter((g) => g.status === 'active');
  const create = useStore((s) => s.create);
  const update = useStore((s) => s.update);
  const remove = useStore((s) => s.remove);
  const complete = useStore((s) => s.completeTask);

  const [title, setTitle] = useState(existing?.title ?? initialTitle ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [category, setCategory] = useState<PlanCategory>(existing?.category ?? 'personal');
  const [priority, setPriority] = useState<Priority>(existing?.priority ?? 2);
  const [due, setDue] = useState<string | null>(existing ? (existing.due ?? null) : todayKey());
  const [recurrence, setRecurrence] = useState<Recurrence>(existing?.recurrence ?? 'none');
  const [status, setStatus] = useState<TaskStatus>(existing?.status ?? 'todo');
  const [subtasks, setSubtasks] = useState<Subtask[]>(existing?.subtasks ?? []);
  const [goalId, setGoalId] = useState<string | null>(existing?.goalId ?? initialGoal ?? null);
  const [newSub, setNewSub] = useState('');
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    if (!title.trim()) {
      setError(t('c.required'));
      return false;
    }
    const data: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> = {
      title: title.trim(),
      notes,
      category,
      priority,
      due,
      recurrence,
      status: existing ? existing.status : status,
      subtasks,
      goalId,
      milestoneId: existing?.milestoneId ?? null,
      completedAt: existing?.completedAt ?? null,
    };
    if (existing) {
      update('tasks', existing.id, data);
      if (status !== existing.status) {
        if (status === 'done' || existing.status === 'done') complete(existing.id, status === 'done');
        if (status !== 'done') update('tasks', existing.id, { status });
      }
    } else create('tasks', { ...data, status, completedAt: status === 'done' ? new Date().toISOString() : null });
  };

  const addSub = () => {
    if (!newSub.trim()) return;
    setSubtasks((s) => [...s, { id: uid(), title: newSub.trim(), done: false }]);
    setNewSub('');
  };

  return (
    <EditorScaffold
      title={existing ? t('ed.editTask') : t('ed.newTask')}
      onSave={save}
      onDelete={existing ? () => remove('tasks', existing.id) : undefined}
      deleteName={existing?.title}
    >
      <Field
        label={t('c.title')}
        value={title}
        onChangeText={(v) => {
          setTitle(v);
          setError(null);
        }}
        error={error}
        autoFocus={!existing}
      />
      <Segmented
        value={status}
        onChange={setStatus}
        small
        options={[
          { value: 'todo', label: t('st.todo') },
          { value: 'doing', label: t('st.doing') },
          { value: 'done', label: t('st.done') },
        ]}
      />
      <DateField label={t('ed.due')} value={due} onChange={setDue} allowEmpty />
      <ChoiceField
        label={t('c.category')}
        value={category}
        onChange={setCategory}
        options={PLAN_CATS.map((c) => ({ value: c, label: t(`cat.${c}`) }))}
      />
      <View style={{ gap: space.s }}>
        <Txt v="label" muted>
          {t('c.priority')}
        </Txt>
        <Segmented
          small
          value={String(priority)}
          onChange={(v) => setPriority(Number(v) as Priority)}
          options={[1, 2, 3].map((n) => ({ value: String(n), label: t(`prio.${n}`) }))}
        />
      </View>
      <ChoiceField
        label={t('ed.repeat')}
        value={recurrence}
        onChange={setRecurrence}
        options={RECURRENCES.map((r) => ({ value: r, label: t(`rec.${r}`) }))}
      />

      <View style={{ gap: space.s }}>
        <Txt v="label" muted>
          {t('ed.subtasks')}
        </Txt>
        <Animated.View layout={spring} style={{ gap: 4 }}>
          {subtasks.map((st) => (
            <Animated.View
              key={st.id}
              entering={FadeIn.duration(160)}
              exiting={FadeOut.duration(120)}
              layout={spring}
              style={{ flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 48 }}
            >
              <Check
                done={st.done}
                label={st.title}
                onPress={() => setSubtasks((s) => s.map((x) => (x.id === st.id ? { ...x, done: !x.done } : x)))}
              />
              <Txt style={{ flex: 1 }} color={st.done ? p.muted : p.text}>
                {st.title}
              </Txt>
              <IconButton
                icon="close"
                flat
                size={40}
                color={p.muted}
                label={t('c.delete')}
                onPress={() => setSubtasks((s) => s.filter((x) => x.id !== st.id))}
              />
            </Animated.View>
          ))}
        </Animated.View>
        <Row gap={space.s}>
          <View style={{ flex: 1 }}>
            <Field
              placeholder={t('ed.addSubtask')}
              value={newSub}
              onChangeText={setNewSub}
              onSubmitEditing={addSub}
              submitBehavior="submit"
            />
          </View>
          <IconButton icon="plus" label={t('ed.addSubtask')} onPress={addSub} size={52} />
        </Row>
      </View>

      {goals.length > 0 && (
        <ChoiceField
          label={t('ed.goal')}
          value={goalId ?? ''}
          onChange={(v) => setGoalId(v || null)}
          options={[{ value: '', label: t('c.none') }, ...goals.map((g) => ({ value: g.id, label: g.title }))]}
        />
      )}
      <Field label={`${t('c.notes')} (${t('c.optional')})`} value={notes} onChangeText={setNotes} multiline />
    </EditorScaffold>
  );
}

/* ------------------------------------------------------------------ Event */

const REMINDERS: (number | null)[] = [null, 10, 30, 60, 1440];

export function EventEditor({ id, date }: { id?: string; date?: string }) {
  const { t } = useT();
  const p = usePalette();
  const existing = useStore((s) => s.events.find((x) => x.id === id));
  const create = useStore((s) => s.create);
  const update = useStore((s) => s.update);
  const remove = useStore((s) => s.remove);
  const remindersOn = useStore((s) => s.prefs.notifications.reminders);

  const baseDay = existing ? existing.start.slice(0, 10) : (date ?? todayKey());
  const [title, setTitle] = useState(existing?.title ?? '');
  const [day, setDay] = useState<string>(baseDay);
  const [allDay, setAllDay] = useState(existing?.allDay ?? false);
  const [start, setStart] = useState(existing ? timeOf(existing.start) : '18:00');
  const [end, setEnd] = useState(existing ? timeOf(existing.end) : '19:00');
  const [endDay, setEndDay] = useState<string>(existing ? existing.end.slice(0, 10) : baseDay);
  const [category, setCategory] = useState<PlanCategory>(existing?.category ?? 'personal');
  const [recurrence, setRecurrence] = useState<Recurrence>(existing?.recurrence ?? 'none');
  const [location, setLocation] = useState(existing?.location ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [reminder, setReminder] = useState<number | null>(existing?.reminderMinutes ?? null);
  const [error, setError] = useState<string | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);

  const save = () => {
    if (!title.trim()) {
      setError(t('c.required'));
      return false;
    }
    const s = allDay ? withTime(day, '00:00') : withTime(day, start);
    const e = allDay ? withTime(endDay < day ? day : endDay, '23:59') : withTime(endDay < day ? day : endDay, end);
    if (!allDay && parseDateTime(e) <= parseDateTime(s)) {
      setTimeError(t('ed.endBeforeStart'));
      return false;
    }
    const data: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> = {
      title: title.trim(),
      category,
      start: s,
      end: e,
      allDay,
      location,
      notes,
      recurrence,
      reminderMinutes: reminder,
      goalId: existing?.goalId ?? null,
      exceptions: existing?.exceptions ?? [],
    };
    if (existing) update('events', existing.id, data);
    else create('events', data);
    if (reminder != null && remindersOn) void ensurePermission().then(() => rescheduleReminders());
    else void rescheduleReminders();
  };

  return (
    <EditorScaffold
      title={existing ? t('ed.editEvent') : t('ed.newEvent')}
      onSave={save}
      onDelete={
        existing
          ? () => {
              remove('events', existing.id);
              void rescheduleReminders();
            }
          : undefined
      }
      deleteName={existing?.title}
    >
      <Field
        label={t('c.title')}
        value={title}
        onChangeText={(v) => {
          setTitle(v);
          setError(null);
        }}
        error={error}
        autoFocus={!existing}
      />
      <DateField
        label={t('c.date')}
        value={day}
        onChange={(v) => {
          if (v) {
            setDay(v);
            if (endDay < v) setEndDay(v);
          }
        }}
      />
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt v="label">{t('ed.allDay')}</Txt>
        <Toggle value={allDay} onChange={setAllDay} label={t('ed.allDay')} />
      </Row>
      {!allDay && (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)} style={{ gap: space.l }}>
          <TimeField
            label={t('ed.start')}
            value={start}
            onChange={(v) => {
              // keep the duration: moving the start moves the end with it
              const toMin = (x: string) => Number(x.slice(0, 2)) * 60 + Number(x.slice(3, 5));
              const dur = Math.max(15, toMin(end) - toMin(start));
              const e = Math.min(23 * 60 + 45, toMin(v) + dur);
              setStart(v);
              setEnd(`${String(Math.floor(e / 60)).padStart(2, '0')}:${String(e % 60).padStart(2, '0')}`);
              setTimeError(null);
            }}
          />
          <TimeField
            label={t('ed.end')}
            value={end}
            onChange={(v) => {
              setEnd(v);
              setTimeError(null);
            }}
          />
          {endDay !== day && <DateField label={t('ed.end')} value={endDay} onChange={(v) => v && setEndDay(v)} />}
          {timeError && (
            <Txt v="meta" color={p.negative}>
              {timeError}
            </Txt>
          )}
        </Animated.View>
      )}
      <ChoiceField
        label={t('c.category')}
        value={category}
        onChange={setCategory}
        options={PLAN_CATS.map((c) => ({ value: c, label: t(`cat.${c}`) }))}
      />
      <ChoiceField
        label={t('ed.repeat')}
        value={recurrence}
        onChange={setRecurrence}
        options={RECURRENCES.map((r) => ({ value: r, label: t(`rec.${r}`) }))}
      />
      <ChoiceField
        label={t('ed.reminder')}
        value={reminder ?? -1}
        onChange={(v) => setReminder(v === -1 ? null : v)}
        options={REMINDERS.map((r) => ({
          value: r ?? -1,
          label:
            r == null
              ? t('ed.reminderNone')
              : r === 60
                ? t('ed.reminderHour')
                : r === 1440
                  ? t('ed.reminderDay')
                  : t('ed.reminderMin', { n: r }),
        }))}
      />
      <Field label={`${t('ed.location')} (${t('c.optional')})`} value={location} onChangeText={setLocation} />
      <Field label={`${t('c.notes')} (${t('c.optional')})`} value={notes} onChangeText={setNotes} multiline />
    </EditorScaffold>
  );
}

/* ------------------------------------------------------------------ Habit */

export function HabitEditor({ id }: { id?: string }) {
  const { t, lang } = useT();
  const existing = useStore((s) => s.habits.find((x) => x.id === id));
  const ws = useStore((s) => s.prefs.weekStartsOn);
  const create = useStore((s) => s.create);
  const update = useStore((s) => s.update);
  const remove = useStore((s) => s.remove);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [slot, setSlot] = useState<RoutineSlot>(existing?.slot ?? 'morning');
  const [dimension, setDimension] = useState<DimensionKey>(existing?.dimension ?? 'health');
  const [days, setDays] = useState<number[]>(existing?.days ?? [0, 1, 2, 3, 4, 5, 6]);
  const [error, setError] = useState<string | null>(null);
  const rewards = useStore((s) => s.prefs.rewards);
  const currency = useStore((s) => s.prefs.currency);
  const [value, setValue] = useState(
    existing?.value == null ? '' : lang === 'es' ? (existing.value / 100).toFixed(2).replace('.', ',') : (existing.value / 100).toFixed(2),
  );
  const [valueError, setValueError] = useState<string | null>(null);

  const save = () => {
    if (!title.trim()) {
      setError(t('c.required'));
      return false;
    }
    const cents = value.trim() === '' ? null : parseAmount(value);
    if (value.trim() !== '' && (cents == null || cents < 0)) {
      setValueError(t('c.invalidAmount'));
      return false;
    }
    const data: Omit<Habit, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> = {
      title: title.trim(),
      slot,
      dimension,
      days,
      log: existing?.log ?? [],
      value: cents,
      presetKey: existing?.presetKey ?? null,
    };
    if (existing) update('habits', existing.id, data);
    else create('habits', data);
  };

  return (
    <EditorScaffold
      title={existing ? t('ed.editHabit') : t('ed.newHabit')}
      onSave={save}
      onDelete={existing ? () => remove('habits', existing.id) : undefined}
      deleteName={existing?.title}
    >
      <Field
        label={t('c.title')}
        value={title}
        onChangeText={(v) => {
          setTitle(v);
          setError(null);
        }}
        error={error}
        autoFocus={!existing}
      />
      <ChoiceField label={t('ed.slot')} value={slot} onChange={setSlot} options={SLOTS.map((s) => ({ value: s, label: t(`plan.${s}`) }))} />
      <View style={{ gap: space.s }}>
        <Txt v="label" muted>
          {t('ed.days')}
        </Txt>
        <Row gap={space.s} style={{ flexWrap: 'wrap' }}>
          {Array.from({ length: 7 }, (_, i) => (i + ws) % 7).map((d) => (
            <Chip
              key={d}
              label={dayInitial(lang, d)}
              selected={days.includes(d)}
              onPress={() => setDays((x) => (x.includes(d) ? x.filter((y) => y !== d) : [...x, d]))}
            />
          ))}
        </Row>
      </View>
      <ChoiceField
        label={t('ed.dimension')}
        value={dimension}
        onChange={setDimension}
        options={DIMS.map((d) => ({ value: d, label: t(`dims.${d}`) }))}
      />
      {rewards.since && (
        <Field
          label={t('ed.rewardValue')}
          value={value}
          onChangeText={(v) => {
            setValue(v);
            setValueError(null);
          }}
          keyboardType="decimal-pad"
          placeholder={money(rewards.values.habit, currency, lang, { decimals: true })}
          hint={t('ed.rewardValueHint', { amount: money(rewards.values.habit, currency, lang, { decimals: true }) })}
          error={valueError}
        />
      )}
    </EditorScaffold>
  );
}

/* ---------------------------------------------------------------- Leisure */

export function LeisureEditor({ id }: { id?: string }) {
  const { t } = useT();
  const existing = useStore((s) => s.leisure_items.find((x) => x.id === id));
  const create = useStore((s) => s.create);
  const update = useStore((s) => s.update);
  const remove = useStore((s) => s.remove);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [kind, setKind] = useState<LeisureKind>(existing?.kind ?? 'weekend');
  const [date, setDate] = useState<string | null>(existing?.date ?? null);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const save = () => {
    if (!title.trim()) {
      setError(t('c.required'));
      return false;
    }
    const data: Omit<LeisureItem, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> = {
      title: title.trim(),
      kind,
      date,
      notes,
      done: existing?.done ?? false,
    };
    if (existing) update('leisure_items', existing.id, data);
    else create('leisure_items', data);
  };
  return (
    <EditorScaffold
      title={existing ? existing.title : t('ed.newLeisure')}
      onSave={save}
      onDelete={existing ? () => remove('leisure_items', existing.id) : undefined}
      deleteName={existing?.title}
    >
      <Field
        label={t('c.title')}
        value={title}
        onChangeText={(v) => {
          setTitle(v);
          setError(null);
        }}
        error={error}
        autoFocus={!existing}
      />
      <ChoiceField
        label={t('ed.kind')}
        value={kind}
        onChange={setKind}
        options={LEISURE_KINDS.map((k) => ({ value: k, label: t(`leisure.${k}`) }))}
      />
      <DateField label={`${t('c.date')} (${t('c.optional')})`} value={date} onChange={setDate} allowEmpty />
      <Field label={`${t('c.notes')} (${t('c.optional')})`} value={notes} onChangeText={setNotes} multiline />
    </EditorScaffold>
  );
}
