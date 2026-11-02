import type { CalendarEvent, DietPlan, MealItem, MealType, Task, WorkoutLog } from '@/types/models';
import { addDays, dateKey, startOfDay } from '../dates';
import { occurrences } from '../recurrence';

export const MEALS: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner'];

/**
 * Sport sessions in [from, to): logged workouts, plus sport calendar occurrences already past
 * on days without a log (so a scheduled routine and its log don't count twice), plus done sport tasks.
 */
export function sportSessions(
  input: { workout_logs: WorkoutLog[]; events: CalendarEvent[]; tasks: Task[] },
  from: Date,
  to: Date,
  now = new Date(),
): number {
  const f = dateKey(from);
  const t = dateKey(to);
  const logs = input.workout_logs.filter((l) => !l.deletedAt && l.date >= f && l.date < t);
  const logDays = new Set(logs.map((l) => l.date));
  const occ = occurrences(input.events, from, to).filter((o) => o.event.category === 'sport' && o.start <= now && !logDays.has(o.day));
  const tasks = input.tasks.filter(
    (x) => !x.deletedAt && x.category === 'sport' && x.completedAt && x.completedAt.slice(0, 10) >= f && x.completedAt.slice(0, 10) < t,
  );
  return logs.length + occ.length + tasks.length;
}

export function mealsFor(diet: DietPlan, day: Date): Partial<Record<MealType, MealItem[]>> {
  return diet.week[String(day.getDay())] ?? {};
}

/** Share of planned meals marked as eaten over the last `days` days (today included). null without a plan. */
export function dietAdherence(
  diet: DietPlan | undefined,
  now = new Date(),
  days = 7,
): { rate: number; planned: number; done: number } | null {
  if (!diet) return null;
  let planned = 0;
  let done = 0;
  for (let i = 0; i < days; i++) {
    const d = addDays(startOfDay(now), -i);
    const k = dateKey(d);
    if (k < diet.createdAt.slice(0, 10)) continue; // days before the plan existed
    const meals = mealsFor(diet, d);
    for (const m of MEALS) {
      if (!meals[m]?.length) continue;
      planned++;
      if (diet.log.includes(`${k}:${m}`)) done++;
    }
  }
  if (!planned) return null;
  return { rate: done / planned, planned, done };
}

/** Scales the leading number of a quantity ("200 g", "1,5 cda", "1/2 taza"); leaves text-only quantities alone. */
export function scaleQuantity(q: string, factor: number, lang: 'es' | 'en' = 'es'): string {
  if (factor === 1) return q;
  const m = q.trim().match(/^(\d+\s*\/\s*\d+|\d+(?:[.,]\d+)?)(.*)$/);
  if (!m) return q;
  const raw = m[1].replace(/\s/g, '');
  const n = raw.includes('/') ? Number(raw.split('/')[0]) / Number(raw.split('/')[1]) : Number(raw.replace(',', '.'));
  if (!isFinite(n)) return q;
  const v = Math.round(n * factor * 100) / 100;
  const s = Number.isInteger(v) ? String(v) : String(v).replace('.', lang === 'es' ? ',' : '.');
  return `${s}${m[2]}`;
}
