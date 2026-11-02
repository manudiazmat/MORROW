import type { State } from '@/store';
import { live } from '@/store';
import { addDays, dateKey, monthKey, prevMonthKey, startOfDay, startOfWeek } from '../dates';
import { conflicts, freeSlots, occurrences } from '../recurrence';
import { budgetStatus, byCategory } from './finance';
import { delay } from './goals';

export interface Insight {
  id: string;
  /** i18n key + params */
  k: string;
  p?: Record<string, string | number>;
  /** where acting on it leads */
  href: string;
  /** a prompt the assistant can be asked about it */
  ask?: string;
  weight: number;
}

/**
 * Deterministic observations computed from the person's own data. They are not model output:
 * every number comes from stored rows, and each insight links to where it can be acted on.
 */
export function computeInsights(s: State, now = new Date()): Insight[] {
  const out: Insight[] = [];
  const tasks = live(s.tasks);
  const events = live(s.events);
  const tx = live(s.transactions);
  const today = startOfDay(now);
  const ws = startOfWeek(now, s.prefs.weekStartsOn);
  const we = addDays(ws, 7);
  const weekOcc = occurrences(events, ws, we);

  // Sport: sessions this week vs target, and free slots left to fit them.
  const sportUsed = events.some((e) => e.category === 'sport') || tasks.some((t) => t.category === 'sport');
  if (sportUsed && s.prefs.weeklySportTarget > 0) {
    const planned =
      weekOcc.filter((o) => o.event.category === 'sport').length +
      tasks.filter((t) => t.category === 'sport' && t.due && t.due >= dateKey(ws) && t.due < dateKey(we)).length;
    const missing = s.prefs.weeklySportTarget - planned;
    if (missing > 0) {
      let slots = 0;
      for (let d = today; d < we; d = addDays(d, 1)) {
        const dayOcc = weekOcc.filter((o) => o.day === dateKey(d));
        slots += freeSlots(
          dayOcc,
          d,
          Math.max(s.prefs.dayStartHour, d.getTime() === today.getTime() ? now.getHours() + 1 : 0),
          s.prefs.dayEndHour,
          60,
        ).length;
      }
      out.push({
        id: 'sport',
        k: slots < missing ? 'insight.sportTight' : 'insight.sportGap',
        p: { planned, target: s.prefs.weeklySportTarget, slots },
        href: '/plan',
        ask: 'Quiero entrenar esta semana lo que me falta. ¿Dónde encaja?',
        weight: slots < missing ? 80 : 50,
      });
    }
  }

  const c = conflicts(weekOcc.filter((o) => o.end > now));
  if (c.length) {
    out.push({
      id: 'conflicts',
      k: 'insight.conflicts',
      p: { n: c.length, title: c[0][0].event.title },
      href: '/plan',
      ask: 'Tengo eventos que se solapan esta semana. ¿Cómo los reorganizo?',
      weight: 90,
    });
  }

  const overdue = tasks.filter((t) => t.status !== 'done' && t.due && t.due < dateKey(today));
  if (overdue.length)
    out.push({
      id: 'overdue',
      k: overdue.length === 1 ? 'insight.overdue1' : 'insight.overdue',
      p: { n: overdue.length },
      href: '/plan?tab=tasks',
      weight: 60,
    });

  // Spending by category vs the same point of last month (cumulative to the same day, so a rent
  // paid on the 1st compares with last month's rent, not with a prorated average).
  const m = monthKey(now);
  const pm = prevMonthKey(m);
  const day = String(now.getDate()).padStart(2, '0');
  const cur = byCategory(tx, m, 'expense');
  const prevSamePoint = new Map(
    byCategory(
      tx.filter((x) => x.date <= `${pm}-${day}`),
      pm,
      'expense',
    ).map((x) => [x.category, x.amount]),
  );
  for (const row of cur) {
    const before = prevSamePoint.get(row.category);
    if (!before) continue;
    if (row.amount > before * 1.25 && row.amount - before > 2000) {
      out.push({
        id: `spend-${row.category}`,
        k: 'insight.spendUp',
        p: { cat: row.category, pct: Math.round((row.amount / before - 1) * 100) },
        href: '/finance',
        ask: '¿Por qué estoy gastando más este mes y cómo ajusto el presupuesto?',
        weight: 55,
      });
      break;
    }
  }

  for (const b of budgetStatus(live(s.budgets), tx, m)) {
    if (b.ratio >= 1) {
      out.push({ id: `budget-${b.budget.id}`, k: 'insight.budgetOver', p: { cat: b.budget.category }, href: '/finance', weight: 70 });
      break;
    }
    if (b.ratio >= 0.9) {
      out.push({
        id: `budget-${b.budget.id}`,
        k: 'insight.budgetNear',
        p: { cat: b.budget.category, pct: Math.round(b.ratio * 100) },
        href: '/finance',
        weight: 45,
      });
      break;
    }
  }

  const fin = live(s.financial_goals);
  const late = live(s.personal_goals)
    .map((g) => ({ g, d: delay(g, fin, now) }))
    .filter((x) => x.d > 0.2)
    .sort((a, b) => b.d - a.d);
  if (late.length)
    out.push({
      id: 'goal-late',
      k: 'insight.goalLate',
      p: { title: late[0].g.title },
      href: `/goals/${late[0].g.id}`,
      ask: '¿Qué objetivos tengo más retrasados y qué puedo hacer esta semana?',
      weight: 40,
    });

  const rated = s.scores.filter((x) => x.ratedAt && x.ratedAt.slice(0, 7) === m).length;
  const enabled = s.dimensions.filter((d) => d.enabled).length;
  if (rated === 0 && now.getDate() >= 1) out.push({ id: 'rate', k: 'insight.rateMonth', href: '/life-balance/rate', weight: 20 });
  else if (rated < enabled && rated > 0)
    out.push({ id: 'rate', k: 'insight.rateRest', p: { n: enabled - rated }, href: '/life-balance/rate', weight: 15 });

  return out.sort((a, b) => b.weight - a.weight);
}
