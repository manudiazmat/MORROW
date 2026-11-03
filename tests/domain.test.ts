import assert from 'node:assert/strict';
import { test } from 'node:test';

import { averageMonthlySavings, balance, budgetStatus, monthTotals, requiredMonthly } from '../src/lib/domain/finance';
import { goalProgress } from '../src/lib/domain/goals';
import { combine, computeDimension } from '../src/lib/domain/lifeBalance';
import { money, parseAmount } from '../src/lib/format';
import { conflicts, freeMinutes, nextDue, occurrences } from '../src/lib/recurrence';
import type { CalendarEvent, FinancialGoal, PersonalGoal, Transaction } from '../src/types/models';

const base = { createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z', deletedAt: null };
const tx = (id: string, amount: number, type: 'income' | 'expense', date: string, category = 'food'): Transaction =>
  ({ ...base, id, amount, type, date, category, description: '', account: '', subscriptionId: null }) as Transaction;
const ev = (
  id: string,
  start: string,
  end: string,
  rec: CalendarEvent['recurrence'] = 'none',
  category: CalendarEvent['category'] = 'work',
): CalendarEvent => ({ ...base, id, title: id, category, start, end, allDay: false, recurrence: rec, exceptions: [] }) as CalendarEvent;

test('money parsing accepts Spanish and English formats', () => {
  assert.equal(parseAmount('12,50'), 1250);
  assert.equal(parseAmount('12.50'), 1250);
  assert.equal(parseAmount('1.200'), 120000);
  assert.equal(parseAmount('1.234,56'), 123456);
  assert.equal(parseAmount('1,234.56'), 123456);
  assert.equal(parseAmount('abc'), null);
  assert.equal(parseAmount(''), null);
});

test('money formatting', () => {
  assert.equal(money(123456, 'EUR', 'es'), '1234,56 €');
  assert.equal(money(1234567, 'EUR', 'es'), '12.345,67 €');
  assert.equal(money(-5000, 'EUR', 'es'), '−50 €');
  assert.equal(money(123456, 'USD', 'en'), '$1,234.56');
});

test('month totals, savings rate and balance are exact', () => {
  const txs = [
    tx('a', 200000, 'income', '2026-10-01'),
    tx('b', 75000, 'expense', '2026-10-02'),
    tx('c', 25000, 'expense', '2026-10-20'),
    tx('d', 1000, 'expense', '2026-11-01'),
  ];
  const m = monthTotals(txs, '2026-10');
  assert.deepEqual(m, { income: 200000, expenses: 100000, savings: 100000, rate: 0.5 });
  assert.equal(balance(txs, 10000), 10000 + 200000 - 100000 - 1000);
  assert.equal(monthTotals(txs, '2026-09').rate, null);
  const deleted = { ...tx('e', 999999, 'expense', '2026-10-03'), deletedAt: '2026-10-04T00:00:00Z' };
  assert.equal(monthTotals([...txs, deleted], '2026-10').expenses, 100000);
});

test('budgets compare spending to the limit', () => {
  const s = budgetStatus(
    [{ ...base, id: 'b', category: 'food', monthlyLimit: 20000 }],
    [tx('x', 25000, 'expense', '2026-10-05')],
    '2026-10',
  );
  assert.equal(s[0].spent, 25000);
  assert.equal(s[0].ratio, 1.25);
});

test('average savings uses only complete months with data', () => {
  const now = new Date(2026, 10, 2);
  const txs = [tx('a', 100000, 'income', '2026-10-01'), tx('b', 40000, 'expense', '2026-10-02'), tx('c', 100000, 'income', '2026-11-01')];
  assert.equal(averageMonthlySavings(txs, now), 60000);
  assert.equal(averageMonthlySavings([tx('c', 100000, 'income', '2026-11-01')], now), null);
});

test('required monthly saving to reach a goal', () => {
  const g = {
    ...base,
    id: 'g',
    name: 'x',
    target: 600000,
    current: 240000,
    dueDate: '2027-08-01',
    priority: 1,
    contributions: [],
  } as FinancialGoal;
  assert.equal(requiredMonthly(g, new Date(2026, 10, 2)), 40000);
});

test('recurring events expand, respect exceptions and detect conflicts', () => {
  const work = ev('work', '2026-09-07T09:00', '2026-09-07T17:30', 'weekdays');
  const call = ev('call', '2026-11-03T17:00', '2026-11-03T18:00');
  const from = new Date(2026, 10, 2);
  const to = new Date(2026, 10, 9);
  const occ = occurrences([work, call], from, to);
  assert.equal(occ.filter((o) => o.event.id === 'work').length, 5);
  assert.equal(conflicts(occ).length, 1);
  const withEx = { ...work, exceptions: ['2026-11-04'] };
  assert.equal(occurrences([withEx], from, to).length, 4);
  // 08–22 window minus 09:00–17:30 = 14h − 8.5h
  const monday = occurrences([work], from, new Date(2026, 10, 3));
  assert.equal(freeMinutes(monday, from, 8, 22), 330);
});

test('recurring tasks advance to the next due date', () => {
  assert.equal(nextDue('weekdays', '2026-11-06'), '2026-11-09');
  assert.equal(nextDue('monthly', '2026-01-31'), '2026-02-28');
  assert.equal(nextDue('none', '2026-01-01'), null);
});

test('goal progress blends milestones and linked savings', () => {
  const fin = [{ ...base, id: 'f', name: 'f', target: 1000, current: 500, priority: 1, contributions: [] } as FinancialGoal];
  const g = {
    ...base,
    id: 'g',
    title: 'g',
    dimension: 'home',
    horizon: 'long',
    startDate: '2026-01-01',
    priority: 1,
    status: 'active',
    milestones: [
      { id: 'm', title: 'm', done: true },
      { id: 'n', title: 'n', done: false },
    ],
    financialGoalId: 'f',
  } as PersonalGoal;
  assert.equal(goalProgress(g, fin), 0.5);
  assert.equal(goalProgress({ ...g, milestones: [], financialGoalId: null, manualProgress: 30 }, fin), 0.3);
});

test('Life Balance: self rating weighs 60 %, missing sources are never invented', () => {
  assert.equal(combine(10, 5), 8);
  assert.equal(combine(null, 6), 6);
  assert.equal(combine(7, null), 7);
  assert.equal(combine(null, null), null);
  const empty = {
    tasks: [],
    events: [],
    habits: [],
    transactions: [],
    budgets: [],
    personal_goals: [],
    financial_goals: [],
    leisure_items: [],
    workout_logs: [],
    diets: [],
    sportTarget: 3,
    weekStartsOn: 1 as const,
    now: new Date(2026, 10, 2, 21),
  };
  const r = computeDimension('relationships', { ...empty, scores: [{ key: 'relationships', self: 10, ratedAt: null }] });
  // A planned dinner must not lower a self-rated relationship: no event counting here.
  const r2 = computeDimension('relationships', {
    ...empty,
    events: [ev('dinner', '2026-11-07T21:00', '2026-11-07T23:00', 'none', 'social')],
    scores: [{ key: 'relationships', self: 10, ratedAt: null }],
  });
  assert.equal(r.combined, 10);
  assert.equal(r2.combined, 10);
  const h = computeDimension('health', { ...empty, scores: [] });
  assert.equal(h.data, null);
  assert.equal(h.combined, null);
});

import { dietAdherence, scaleQuantity, sportSessions } from '../src/lib/domain/health';
import type { DietPlan, WorkoutLog } from '../src/types/models';

test('recipe quantities scale with servings', () => {
  assert.equal(scaleQuantity('200 g', 2), '400 g');
  assert.equal(scaleQuantity('1,5 cda', 2, 'es'), '3 cda');
  assert.equal(scaleQuantity('1/2 taza', 3, 'es'), '1,5 taza');
  assert.equal(scaleQuantity('al gusto', 3), 'al gusto');
});

test('a logged workout and its scheduled event count once', () => {
  const gym = ev('gym', '2026-10-05T19:00', '2026-10-05T20:00', 'weekly', 'sport'); // Mondays
  const log = { ...base, id: 'l', routineId: 'r', name: 'Gym', date: '2026-11-02', durationMin: 60, exercises: [] } as WorkoutLog;
  const from = new Date(2026, 10, 2);
  const to = new Date(2026, 10, 9);
  const now = new Date(2026, 10, 2, 21);
  assert.equal(sportSessions({ workout_logs: [], events: [gym], tasks: [] }, from, to, now), 1);
  assert.equal(sportSessions({ workout_logs: [log], events: [gym], tasks: [] }, from, to, now), 1);
});

test('diet adherence counts only planned meals', () => {
  const diet = {
    ...base,
    id: 'd',
    name: 'd',
    week: { '1': { lunch: [{ id: 'a', text: 'Ensalada' }], dinner: [{ id: 'b', text: 'Pescado' }] } },
    images: [],
    active: true,
    log: ['2026-11-02:lunch'],
  } as DietPlan;
  const r = dietAdherence(diet, new Date(2026, 10, 2, 22));
  assert.deepEqual(r, { rate: 0.5, planned: 2, done: 1 });
  assert.equal(dietAdherence(undefined), null);
});

/* ------------------------------------------------------------- Rewards */

import { allocate, bonusDays, dailyPace, etaDays, expectedEntries, reconcile, wallet } from '../src/lib/domain/rewards';
import type { Habit, Reward, RewardEntry, RewardSettings, Task } from '../src/types/models';

const rwSettings: RewardSettings = {
  since: '2026-11-02',
  values: { habit: 50, task: 100, taskHigh: 200, workout: 300, meal: 25, review: 300, bonus: 150 },
};
const habit = (id: string, log: string[], value?: number): Habit =>
  ({ ...base, id, title: id, slot: 'morning', dimension: 'home', days: [0, 1, 2, 3, 4, 5, 6], log, value }) as Habit;
const entry = (key: string, amount: number, date: string, id = key, createdAt = base.createdAt): RewardEntry =>
  ({ ...base, id, key, amount, date, createdAt, source: amount < 0 ? 'redeem' : 'habit', label: '' }) as RewardEntry;
const reward = (id: string, price: number, order: number): Reward => ({ ...base, id, name: id, price, order, status: 'active' }) as Reward;

test('rewards: only what was done since the start counts, with each habit’s own value', () => {
  const input = {
    habits: [
      habit('bed', ['2026-11-01', '2026-11-02', '2026-11-03']),
      habit('focus', ['2026-11-03'], 200),
      habit('off', ['2026-11-03'], 0),
    ],
    tasks: [
      { ...base, id: 't1', title: 'x', status: 'done', priority: 1, completedAt: '2026-11-03T10:00:00', subtasks: [] } as unknown as Task,
      { ...base, id: 't2', title: 'y', status: 'done', priority: 2, completedAt: '2026-10-20T10:00:00', subtasks: [] } as unknown as Task,
      { ...base, id: 't3', title: 'z', status: 'todo', priority: 2, completedAt: null, subtasks: [] } as unknown as Task,
    ],
    workout_logs: [],
    diets: [],
    reviews: [],
  };
  const exp = expectedEntries(input, rwSettings, '2026-11-03');
  const keys = exp.map((e) => e.key).sort();
  assert.deepEqual(keys, ['bonus:2026-11-03', 'habit:bed:2026-11-02', 'habit:bed:2026-11-03', 'habit:focus:2026-11-03', 'task:t1']);
  assert.equal(exp.find((e) => e.key === 'task:t1')?.amount, 200);
  assert.equal(exp.find((e) => e.key === 'habit:focus:2026-11-03')?.amount, 200);
  assert.deepEqual(expectedEntries(input, { ...rwSettings, since: null }, '2026-11-03'), []);
});

test('rewards: the full-day bonus needs every planned habit (and at least three)', () => {
  const hs = [habit('a', ['2026-11-03']), habit('b', ['2026-11-03']), habit('c', ['2026-11-03'])];
  assert.deepEqual(bonusDays(hs, '2026-11-02', '2026-11-03'), ['2026-11-03']);
  assert.deepEqual(bonusDays(hs.slice(0, 2), '2026-11-02', '2026-11-03'), []);
  assert.deepEqual(bonusDays([...hs, habit('d', [])], '2026-11-02', '2026-11-03'), []);
});

test('rewards: reconcile keeps earned amounts, removes undone ones and duplicates, never touches redemptions', () => {
  const entries = [
    entry('habit:a:2026-11-03', 40, '2026-11-03'),
    entry('habit:b:2026-11-03', 50, '2026-11-03', 'b1', '2026-11-03T08:00:00.000Z'),
    entry('habit:b:2026-11-03', 50, '2026-11-03', 'b2', '2026-11-03T09:00:00.000Z'),
    entry('task:gone', 100, '2026-11-03'),
    entry('redeem:r1', -500, '2026-11-03'),
  ];
  const expected = [
    { key: 'habit:a:2026-11-03', source: 'habit' as const, date: '2026-11-03', amount: 50, label: '' },
    { key: 'habit:b:2026-11-03', source: 'habit' as const, date: '2026-11-03', amount: 50, label: '' },
    { key: 'habit:c:2026-11-03', source: 'habit' as const, date: '2026-11-03', amount: 50, label: '' },
  ];
  const { create, remove } = reconcile(entries, expected);
  assert.deepEqual(
    create.map((e) => e.key),
    ['habit:c:2026-11-03'],
  );
  assert.deepEqual(remove.sort(), ['b2', 'task:gone']);
});

test('rewards: credit fills the queue in order; pace and ETA', () => {
  const w = wallet([entry('a', 3000, '2026-11-03'), entry('b', 2000, '2026-11-02'), entry('redeem:x', -1000, '2026-11-03')]);
  assert.deepEqual(w, { earned: 5000, spent: 1000, balance: 4000 });
  const alloc = allocate([reward('second', 5000, 2), reward('first', 3000, 1)], w.balance);
  assert.deepEqual(alloc.get('first'), { saved: 3000, remaining: 0, progress: 1, funded: true });
  assert.equal(alloc.get('second')?.saved, 1000);
  assert.equal(alloc.get('second')?.remaining, 4000);
  // two days since start, 5000 earned → 2500/day
  assert.equal(dailyPace([entry('a', 3000, '2026-11-03'), entry('b', 2000, '2026-11-02')], '2026-11-02', '2026-11-03'), 2500);
  assert.equal(etaDays(4000, 2500), 2);
  assert.equal(etaDays(4000, 0), null);
});
