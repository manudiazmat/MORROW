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
