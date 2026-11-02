import type { State } from '@/store';
import { DIMENSIONS, live } from '@/store';
import type { PlanCategory, WeeklyReview } from '@/types/models';
import { addDays, dateKey, minutesBetween, monthKey, nowISO, parseDate, prevMonthKey } from '../dates';
import { occurrences } from '../recurrence';
import { goalProgress } from './goals';
import { computeAll } from './lifeBalance';

export const CATEGORIES: PlanCategory[] = ['work', 'sport', 'learning', 'personal', 'social', 'leisure'];

export function balanceInput(s: State, now = new Date()) {
  return {
    tasks: live(s.tasks),
    events: live(s.events),
    habits: live(s.habits),
    transactions: live(s.transactions),
    budgets: live(s.budgets),
    personal_goals: live(s.personal_goals),
    financial_goals: live(s.financial_goals),
    leisure_items: live(s.leisure_items),
    scores: s.scores,
    sportTarget: s.prefs.weeklySportTarget,
    weekStartsOn: s.prefs.weekStartsOn,
    now,
  };
}

export function computeReview(s: State, weekStart: string): WeeklyReview {
  const ws = parseDate(weekStart);
  const we = addDays(ws, 7);
  const wsk = dateKey(ws);
  const wek = dateKey(we);
  const tasks = live(s.tasks);
  const doneIn = tasks.filter((t) => t.completedAt && t.completedAt.slice(0, 10) >= wsk && t.completedAt.slice(0, 10) < wek);
  const pending = tasks.filter((t) => t.status !== 'done' && t.due && t.due < wek);
  const occ = occurrences(live(s.events), ws, we);
  const minutesByCategory = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<PlanCategory, number>;
  for (const o of occ) if (!o.event.allDay) minutesByCategory[o.event.category] += minutesBetween(o.start, o.end);
  const sportSessions = occ.filter((o) => o.event.category === 'sport').length + doneIn.filter((t) => t.category === 'sport').length;
  let income = 0;
  let expenses = 0;
  for (const t of live(s.transactions)) {
    if (t.date < wsk || t.date >= wek) continue;
    if (t.type === 'income') income += t.amount;
    else expenses += t.amount;
  }
  const fin = live(s.financial_goals);
  const goalsProgress = live(s.personal_goals)
    .filter((g) => g.status === 'active')
    .map((g) => ({ id: g.id, title: g.title, progress: goalProgress(g, fin) }));

  // Life Balance change: current month snapshot vs previous month snapshot (or live values).
  const m = monthKey(ws);
  const prev = s.snapshots.find((x) => x.month === prevMonthKey(m));
  const curSnap = s.snapshots.find((x) => x.month === m);
  const live_ = computeAll(DIMENSIONS, balanceInput(s));
  const balanceDelta = DIMENSIONS.map((key) => ({
    key,
    from: prev?.values[key]?.combined ?? null,
    to: curSnap?.values[key]?.combined ?? live_.find((r) => r.key === key)?.combined ?? null,
  }));

  return {
    weekStart: wsk,
    createdAt: nowISO(),
    tasksDone: doneIn.length,
    tasksPending: pending.length,
    minutesByCategory,
    sportSessions,
    income,
    expenses,
    goalsProgress,
    balanceDelta,
  };
}
