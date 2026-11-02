import type {
  Budget,
  CalendarEvent,
  DimensionKey,
  DimensionResult,
  FinancialGoal,
  Habit,
  LeisureItem,
  LifeBalanceScore,
  PersonalGoal,
  PlanCategory,
  Task,
  Transaction,
} from '@/types/models';
import { addDays, dateKey, monthKey, parseDate, startOfDay } from '../dates';
import { occurrences } from '../recurrence';
import { budgetStatus, monthTotals } from './finance';
import { goalProgress } from './goals';

export const MAX_SCORE = 12;
/** Weight of the self rating when both sources exist. Documented in the criteria screen. */
export const SELF_WEIGHT = 0.6;

export interface BalanceInput {
  tasks: Task[];
  events: CalendarEvent[];
  habits: Habit[];
  transactions: Transaction[];
  budgets: Budget[];
  personal_goals: PersonalGoal[];
  financial_goals: FinancialGoal[];
  leisure_items: LeisureItem[];
  scores: LifeBalanceScore[];
  sportTarget: number;
  weekStartsOn: 0 | 1;
  now?: Date;
}

type Part = DimensionResult['basis'][number];

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const round1 = (n: number) => Math.round(n * 10) / 10;

function categoryUsed(cat: PlanCategory, tasks: Task[], events: CalendarEvent[], since: string) {
  return (
    tasks.some((t) => !t.deletedAt && t.category === cat && (t.createdAt.slice(0, 10) >= since || (t.due ?? '') >= since)) ||
    events.some((e) => !e.deletedAt && e.category === cat && (e.start.slice(0, 10) >= since || e.recurrence !== 'none'))
  );
}

function habitRate(habits: Habit[], dim: DimensionKey, now: Date): { rate: number; n: number } | null {
  const hs = habits.filter((h) => !h.deletedAt && h.dimension === dim && h.days.length);
  if (!hs.length) return null;
  let expected = 0;
  let done = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(startOfDay(now), -i);
    const k = dateKey(d);
    for (const h of hs) {
      if (h.createdAt.slice(0, 10) > k) continue;
      if (!h.days.includes(d.getDay())) continue;
      expected++;
      if (h.log.includes(k)) done++;
    }
  }
  if (!expected) return null;
  return { rate: done / expected, n: hs.length };
}

function goalsPart(goals: PersonalGoal[], fin: FinancialGoal[], filter: (g: PersonalGoal) => boolean): Part | null {
  const gs = goals.filter((g) => !g.deletedAt && g.status !== 'paused' && filter(g));
  if (!gs.length) return null;
  const avg = gs.reduce((s, g) => s + goalProgress(g, fin), 0) / gs.length;
  return { k: gs.length === 1 ? 'lb.basis.goal1' : 'lb.basis.goals', p: { n: gs.length, pct: Math.round(avg * 100) }, v: avg };
}

function doneInWindow(tasks: Task[], cat: PlanCategory, from: Date, to: Date) {
  const f = dateKey(from);
  const t = dateKey(to);
  const relevant = tasks.filter((x) => !x.deletedAt && x.category === cat);
  const done = relevant.filter((x) => x.completedAt && x.completedAt.slice(0, 10) >= f && x.completedAt.slice(0, 10) <= t);
  const missed = relevant.filter((x) => x.status !== 'done' && x.due && x.due >= f && x.due < dateKey(new Date()));
  return { done: done.length, missed: missed.length };
}

export function computeDimension(key: DimensionKey, input: BalanceInput): DimensionResult {
  const now = input.now ?? new Date();
  const since60 = dateKey(addDays(now, -60));
  const from14 = addDays(startOfDay(now), -13);
  const parts: Part[] = [];
  const { tasks, events, habits, transactions, budgets, personal_goals: goals, financial_goals: fin } = input;
  // time given to a category: the last 14 days plus what is already planned for the next 7
  const occ21 = occurrences(events, from14, addDays(startOfDay(now), 8));
  const countOcc = (cat: PlanCategory) => occ21.filter((o) => o.event.category === cat).length;

  const dimGoals = goalsPart(goals, fin, (g) => g.dimension === key && (key !== 'purpose' || true));
  const hr = habitRate(habits, key, now);

  switch (key) {
    case 'career': {
      if (categoryUsed('work', tasks, events, since60)) {
        const w = doneInWindow(tasks, 'work', from14, now);
        // at least 3 tasks in the window, so one finished task can't read as a perfect fortnight
        if (w.done + w.missed >= 3)
          parts.push({ k: 'lb.basis.workTasks', p: { done: w.done, missed: w.missed }, v: w.done / (w.done + w.missed) });
      }
      break;
    }
    case 'finance': {
      const m = monthTotals(transactions, monthKey(now));
      if (m.rate != null) parts.push({ k: 'lb.basis.savingsRate', p: { pct: Math.round(m.rate * 100) }, v: clamp01(m.rate / 0.2) });
      const bs = budgetStatus(budgets, transactions, monthKey(now));
      if (bs.length) {
        const ok = bs.filter((b) => b.ratio <= 1).length;
        parts.push({ k: 'lb.basis.budgets', p: { ok, n: bs.length }, v: ok / bs.length });
      }
      const fg = fin.filter((g) => !g.deletedAt && g.target > 0);
      if (fg.length) {
        const avg = fg.reduce((s, g) => s + Math.min(1, g.current / g.target), 0) / fg.length;
        parts.push({ k: 'lb.basis.savingsGoals', p: { pct: Math.round(avg * 100) }, v: avg });
      }
      break;
    }
    case 'health': {
      if (categoryUsed('sport', tasks, events, since60)) {
        const ws = addDays(startOfDay(now), -6);
        const sessions =
          occurrences(events, ws, addDays(startOfDay(now), 1)).filter((o) => o.event.category === 'sport' && o.start <= now).length +
          doneInWindow(tasks, 'sport', ws, now).done;
        const target = Math.max(1, input.sportTarget);
        parts.push({ k: 'lb.basis.sport', p: { n: sessions, target }, v: clamp01(sessions / target) });
      }
      break;
    }
    case 'relationships':
      // brief: self rating + social goals only — counting events would judge relationships by calendar entries
      break;
    case 'growth': {
      if (categoryUsed('learning', tasks, events, since60)) {
        const n = countOcc('learning') + doneInWindow(tasks, 'learning', from14, now).done;
        parts.push({ k: 'lb.basis.learning', p: { n }, v: clamp01(n / 5) });
      }
      break;
    }
    case 'leisure': {
      if (categoryUsed('leisure', tasks, events, since60)) {
        const n = countOcc('leisure') + doneInWindow(tasks, 'leisure', from14, now).done;
        parts.push({ k: 'lb.basis.leisureTime', p: { n }, v: clamp01(n / 4) });
      }
      const items = input.leisure_items.filter((l) => !l.deletedAt);
      if (items.length) {
        const since30 = dateKey(addDays(now, -30));
        const done = items.filter((l) => l.done && l.updatedAt.slice(0, 10) >= since30).length;
        parts.push({ k: 'lb.basis.experiences', p: { n: done }, v: clamp01(done / 2) });
      }
      break;
    }
    case 'home':
      break;
    case 'purpose': {
      const longGoals = goalsPart(goals, fin, (g) => g.horizon === 'long');
      if (longGoals) parts.push({ ...longGoals, k: longGoals.p?.n === 1 ? 'lb.basis.longGoal1' : 'lb.basis.longGoals' });
      const active = goals.filter((g) => !g.deletedAt && g.status === 'active');
      if (active.length) {
        const since30 = dateKey(addDays(now, -30));
        const moving = active.filter((g) => g.milestones.some((m) => m.doneAt && m.doneAt.slice(0, 10) >= since30)).length;
        parts.push({ k: 'lb.basis.moving', p: { n: moving, total: active.length }, v: moving / active.length });
      }
      break;
    }
  }
  if (dimGoals && key !== 'purpose') parts.push(dimGoals);
  if (hr) parts.push({ k: 'lb.basis.habits', p: { pct: Math.round(hr.rate * 100), n: hr.n }, v: hr.rate });

  const data = parts.length ? round1((parts.reduce((s, p) => s + p.v, 0) / parts.length) * MAX_SCORE) : null;
  const self = input.scores.find((s) => s.key === key)?.self ?? null;
  return { key, self, data, combined: combine(self, data), basis: parts };
}

export function combine(self: number | null, data: number | null): number | null {
  if (self == null && data == null) return null;
  if (self == null) return data;
  if (data == null) return self;
  return round1(SELF_WEIGHT * self + (1 - SELF_WEIGHT) * data);
}

export function computeAll(keys: DimensionKey[], input: BalanceInput): DimensionResult[] {
  return keys.map((k) => computeDimension(k, input));
}

export function overall(results: DimensionResult[]): number | null {
  const vals = results.map((r) => r.combined).filter((v): v is number => v != null);
  if (!vals.length) return null;
  return round1(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export const isStale = (ratedAt: string | null, now = new Date()) =>
  !ratedAt || (now.getTime() - parseDate(ratedAt.slice(0, 10)).getTime()) / 86400000 > 31;
