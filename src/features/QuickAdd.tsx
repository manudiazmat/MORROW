import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { Sheet } from '@/components/Sheet';
import { Button, Chip, ChipRow, Field, Row, Txt, haptic } from '@/components/ui';
import { addDays, dateKey, dateTimeKey, parseDateTime, todayKey, withTime } from '@/lib/dates';
import { parseAmount } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { useStore } from '@/store';
import { useUI, type QuickKind } from '@/store/ui';
import { layout, space } from '@/theme';
import type { ExpenseCategory, GoalHorizon, IncomeCategory, PlanCategory, RoutineSlot } from '@/types/models';
import { EXPENSE_CATS, HORIZONS, INCOME_CATS, PLAN_CATS, SLOTS } from './constants';
import { TimeField } from './pickers';

const KINDS: QuickKind[] = ['task', 'event', 'expense', 'income', 'habit', 'goal', 'idea'];

function nextHalfHour() {
  const d = new Date();
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Quick Add: one sheet, seven kinds, the fewest fields that make a real record. */
export function QuickAdd() {
  const { t } = useT();
  const { open, kind } = useUI((s) => s.quickAdd);
  const close = useUI((s) => s.closeQuickAdd);
  const openQ = useUI((s) => s.openQuickAdd);
  const toast = useUI((s) => s.showToast);
  const create = useStore((s) => s.create);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState<string | null>(todayKey());
  const [time, setTime] = useState(nextHalfHour());
  const [minutes, setMinutes] = useState(60);
  const [planCat, setPlanCat] = useState<PlanCategory>('personal');
  const [expCat, setExpCat] = useState<ExpenseCategory>('food');
  const [incCat, setIncCat] = useState<IncomeCategory>('salary');
  const [slot, setSlot] = useState<RoutineSlot>('morning');
  const [horizon, setHorizon] = useState<GoalHorizon>('short');
  const [error, setError] = useState<string | null>(null);

  // reset the form each time the sheet opens, clear errors when the kind changes (during render, no effects)
  const [wasOpen, setWasOpen] = useState(open);
  const [lastKind, setLastKind] = useState(kind);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setTitle('');
      setAmount('');
      setDay(todayKey());
      setTime(nextHalfHour());
      setError(null);
    }
  }
  if (kind !== lastKind) {
    setLastKind(kind);
    setError(null);
  }

  const money = kind === 'expense' || kind === 'income';

  const save = (more = false) => {
    const now = todayKey();
    if (money) {
      const cents = parseAmount(amount);
      if (!cents) return setError(t('c.invalidAmount'));
      const tx = create('transactions', {
        amount: cents,
        type: kind === 'income' ? 'income' : 'expense',
        category: kind === 'income' ? incCat : expCat,
        date: day ?? now,
        description: title.trim() || t(kind === 'income' ? `txc.${incCat}` : `txc.${expCat}`),
        account: '',
        subscriptionId: null,
      });
      finish(t('qa.added', { what: t(`qa.${kind}`) }), more ? `/edit/tx?id=${tx.id}` : null);
      return;
    }
    if (!title.trim()) return setError(t('c.required'));
    const tt = title.trim();
    switch (kind) {
      case 'task': {
        const task = create('tasks', {
          title: tt,
          category: planCat,
          priority: 2,
          due: day,
          status: 'todo',
          subtasks: [],
          recurrence: 'none',
          goalId: null,
          milestoneId: null,
          completedAt: null,
        });
        return finish(t('qa.added', { what: t('qa.task') }), more ? `/edit/task?id=${task.id}` : null);
      }
      case 'event': {
        const start = withTime(day ?? now, time);
        const sd = parseDateTime(start);
        const ed = new Date(sd.getTime() + minutes * 60000);
        const end = dateKey(ed) === dateKey(sd) ? dateTimeKey(ed) : withTime(day ?? now, '23:59');
        const ev = create('events', {
          title: tt,
          category: planCat,
          start,
          end,
          allDay: false,
          recurrence: 'none',
          reminderMinutes: null,
          goalId: null,
          exceptions: [],
        });
        return finish(t('qa.added', { what: t('qa.event') }), more ? `/edit/event?id=${ev.id}` : null);
      }
      case 'habit': {
        const hb = create('habits', { title: tt, slot, dimension: 'health', days: [0, 1, 2, 3, 4, 5, 6], log: [] });
        return finish(t('qa.added', { what: t('qa.habit') }), more ? `/edit/habit?id=${hb.id}` : null);
      }
      case 'goal': {
        const g = create('personal_goals', {
          title: tt,
          dimension: 'purpose',
          horizon,
          startDate: now,
          targetDate: null,
          priority: 2,
          status: 'active',
          milestones: [],
          financialGoalId: null,
          manualProgress: 0,
        });
        return finish(t('qa.added', { what: t('qa.goal') }), more ? `/edit/goal?id=${g.id}` : null);
      }
      case 'idea': {
        create('ideas', { text: tt });
        return finish(t('qa.added', { what: t('qa.idea') }), null);
      }
    }
  };

  const finish = (msg: string, href: string | null) => {
    haptic('success');
    close();
    if (href) setTimeout(() => router.push(href as never), 260);
    else toast(msg);
  };

  return (
    <Sheet open={open} onClose={close}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingTop: space.s, paddingBottom: space.l, gap: space.xl }}
      >
        <Txt v="title">{t('qa.title')}</Txt>
        <ChipRow>
          {KINDS.map((k) => (
            <Chip key={k} label={t(`qa.${k}`)} selected={k === kind} onPress={() => openQ(k)} />
          ))}
        </ChipRow>

        <Animated.View
          key={kind}
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(100)}
          layout={LinearTransition.duration(200)}
          style={{ gap: space.l }}
        >
          {money ? (
            <>
              <Field
                large
                autoFocus
                keyboardType="decimal-pad"
                placeholder={t('qa.amountPh')}
                value={amount}
                onChangeText={(v) => {
                  setAmount(v);
                  setError(null);
                }}
                prefix={kind === 'expense' ? '−' : '+'}
                error={error}
                accessibilityLabel={t('ed.amount')}
              />
              <ChipRow>
                {(kind === 'expense' ? EXPENSE_CATS : INCOME_CATS).map((c) => (
                  <Chip
                    key={c}
                    label={t(`txc.${c}`)}
                    selected={kind === 'expense' ? c === expCat : c === incCat}
                    onPress={() => (kind === 'expense' ? setExpCat(c as ExpenseCategory) : setIncCat(c as IncomeCategory))}
                  />
                ))}
              </ChipRow>
              <Field
                placeholder={t('qa.descPh')}
                value={title}
                onChangeText={setTitle}
                returnKeyType="done"
                onSubmitEditing={() => save()}
              />
            </>
          ) : (
            <Field
              autoFocus
              placeholder={t(`qa.${kind}Ph`)}
              value={title}
              onChangeText={(v) => {
                setTitle(v);
                setError(null);
              }}
              error={error}
              returnKeyType="done"
              onSubmitEditing={() => save()}
              multiline={kind === 'idea'}
              accessibilityLabel={t('c.title')}
            />
          )}

          {(kind === 'task' || kind === 'event' || money) && (
            <Row gap={space.s} style={{ flexWrap: 'wrap' }}>
              <Chip label={t('c.today')} selected={day === todayKey()} onPress={() => setDay(todayKey())} />
              <Chip
                label={t('c.tomorrow')}
                selected={day === dateKey(addDays(new Date(), 1))}
                onPress={() => setDay(dateKey(addDays(new Date(), 1)))}
              />
              {kind === 'task' && <Chip label={t('ed.noDue')} selected={day === null} onPress={() => setDay(null)} />}
            </Row>
          )}

          {kind === 'event' && (
            <>
              <TimeField label={t('ed.start')} value={time} onChange={setTime} />
              <ChipRow>
                {[30, 60, 90, 120].map((m) => (
                  <Chip
                    key={m}
                    label={m < 60 ? `${m} min` : `${m / 60} h`.replace('.5', ',5')}
                    selected={minutes === m}
                    onPress={() => setMinutes(m)}
                  />
                ))}
              </ChipRow>
            </>
          )}

          {(kind === 'task' || kind === 'event') && (
            <ChipRow>
              {PLAN_CATS.map((c) => (
                <Chip key={c} label={t(`cat.${c}`)} selected={planCat === c} onPress={() => setPlanCat(c)} />
              ))}
            </ChipRow>
          )}

          {kind === 'habit' && (
            <Row gap={space.s}>
              {SLOTS.map((s) => (
                <Chip key={s} label={t(`plan.${s}`)} selected={slot === s} onPress={() => setSlot(s)} />
              ))}
            </Row>
          )}

          {kind === 'goal' && (
            <Row gap={space.s} style={{ flexWrap: 'wrap' }}>
              {HORIZONS.map((h) => (
                <Chip key={h} label={t(`goals.${h}`)} selected={horizon === h} onPress={() => setHorizon(h)} />
              ))}
            </Row>
          )}
        </Animated.View>

        <View style={{ flexDirection: 'row', gap: space.m, alignItems: 'center' }}>
          {kind !== 'idea' && <Button kind="ghost" label={t('c.more')} onPress={() => save(true)} compact />}
          <Button label={t('c.save')} onPress={() => save()} style={{ flex: 1 }} />
        </View>
      </ScrollView>
    </Sheet>
  );
}
