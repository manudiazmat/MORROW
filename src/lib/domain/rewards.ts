import { addDays, dateKey, parseDate } from '../dates';
import type {
  DietPlan,
  DimensionKey,
  EarnSource,
  Habit,
  Reward,
  RewardEntry,
  RewardSettings,
  RewardValueKey,
  RoutineSlot,
  Task,
  WeeklyReview,
  WorkoutLog,
} from '../../types/models';

/** Default worth of each source, in cents. Calibrated so a normal day of basics is worth roughly 8–10 €. */
export const DEFAULT_REWARD_VALUES: Record<RewardValueKey, number> = {
  habit: 50,
  task: 100,
  taskHigh: 200,
  workout: 300,
  meal: 25,
  review: 300,
  bonus: 150,
};

export const DEFAULT_REWARD_SETTINGS: RewardSettings = { since: null, values: { ...DEFAULT_REWARD_VALUES } };

/** A full-day bonus needs at least this many habits planned that day. */
export const BONUS_MIN_HABITS = 3;

/* ------------------------------------------------------------ Catalogue */

export type PresetGroup = 'home' | 'health' | 'mind' | 'work' | 'money' | 'social';

export interface Preset {
  key: string;
  group: PresetGroup;
  value: number; // cents
  slot: RoutineSlot;
  days: number[];
  dimension: DimensionKey;
}

const EVERY = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];

/** Everyday tasks most people do or want to do. Titles live in i18n under `rw.p.<key>`. */
export const PRESETS: Preset[] = [
  { key: 'bed', group: 'home', value: 50, slot: 'morning', days: EVERY, dimension: 'home' },
  { key: 'dishes', group: 'home', value: 100, slot: 'evening', days: EVERY, dimension: 'home' },
  { key: 'tidy', group: 'home', value: 75, slot: 'anytime', days: EVERY, dimension: 'home' },
  { key: 'trash', group: 'home', value: 50, slot: 'evening', days: [1, 3, 5], dimension: 'home' },
  { key: 'laundry', group: 'home', value: 100, slot: 'anytime', days: [1, 4], dimension: 'home' },
  { key: 'groceries', group: 'home', value: 150, slot: 'anytime', days: [6], dimension: 'home' },
  { key: 'bathroom', group: 'home', value: 200, slot: 'anytime', days: [6], dimension: 'home' },
  { key: 'cook', group: 'home', value: 150, slot: 'evening', days: EVERY, dimension: 'health' },

  { key: 'water', group: 'health', value: 75, slot: 'anytime', days: EVERY, dimension: 'health' },
  { key: 'walk', group: 'health', value: 150, slot: 'anytime', days: EVERY, dimension: 'health' },
  { key: 'stretch', group: 'health', value: 50, slot: 'morning', days: EVERY, dimension: 'health' },
  { key: 'veggies', group: 'health', value: 75, slot: 'anytime', days: EVERY, dimension: 'health' },
  { key: 'wake', group: 'health', value: 75, slot: 'morning', days: EVERY, dimension: 'health' },
  { key: 'sleep', group: 'health', value: 100, slot: 'evening', days: EVERY, dimension: 'health' },

  { key: 'read', group: 'mind', value: 100, slot: 'evening', days: EVERY, dimension: 'growth' },
  { key: 'meditate', group: 'mind', value: 75, slot: 'morning', days: EVERY, dimension: 'purpose' },
  { key: 'journal', group: 'mind', value: 50, slot: 'evening', days: EVERY, dimension: 'purpose' },
  { key: 'noSocial', group: 'mind', value: 150, slot: 'morning', days: EVERY, dimension: 'growth' },

  { key: 'plan', group: 'work', value: 75, slot: 'morning', days: WEEKDAYS, dimension: 'career' },
  { key: 'focus', group: 'work', value: 200, slot: 'anytime', days: WEEKDAYS, dimension: 'career' },
  { key: 'inbox', group: 'work', value: 100, slot: 'anytime', days: WEEKDAYS, dimension: 'career' },
  { key: 'learn', group: 'work', value: 100, slot: 'anytime', days: EVERY, dimension: 'growth' },

  { key: 'noImpulse', group: 'money', value: 150, slot: 'anytime', days: EVERY, dimension: 'finance' },
  { key: 'logSpend', group: 'money', value: 50, slot: 'evening', days: EVERY, dimension: 'finance' },

  { key: 'call', group: 'social', value: 75, slot: 'anytime', days: EVERY, dimension: 'relationships' },
];

export const PRESET_GROUPS: PresetGroup[] = ['home', 'health', 'mind', 'work', 'money', 'social'];

/** The starter set offered with one tap. */
export const BASICS = ['bed', 'dishes', 'water', 'walk', 'read', 'plan', 'focus', 'sleep'];

/* --------------------------------------------------------------- Ledger */

export interface RewardInput {
  habits: Habit[];
  tasks: Task[];
  workout_logs: WorkoutLog[];
  diets: DietPlan[];
  reviews: WeeklyReview[];
}

export interface ExpectedEntry {
  key: string;
  source: EarnSource;
  date: string;
  amount: number;
  label: string;
}

const alive = <T extends { deletedAt?: string | null }>(rows: T[]) => rows.filter((r) => !r.deletedAt);
const localDay = (iso: string) => dateKey(new Date(iso));

export function habitValue(h: Pick<Habit, 'value'>, settings: RewardSettings): number {
  return h.value ?? settings.values.habit;
}

/** Days with a full-day bonus: every habit planned that day (at least BONUS_MIN_HABITS) was done. */
export function bonusDays(habits: Habit[], since: string, today: string): string[] {
  const live = alive(habits);
  const out: string[] = [];
  if (since > today) return out;
  for (let d = parseDate(since); dateKey(d) <= today; d = addDays(d, 1)) {
    const k = dateKey(d);
    const planned = live.filter((h) => h.days.includes(d.getDay()) && localDay(h.createdAt) <= k);
    if (planned.length >= BONUS_MIN_HABITS && planned.every((h) => h.log.includes(k))) out.push(k);
  }
  return out;
}

/** Every earning that should exist, given what was done between `since` and today. */
export function expectedEntries(input: RewardInput, settings: RewardSettings, today: string): ExpectedEntry[] {
  const { since, values } = settings;
  if (!since) return [];
  const inRange = (d: string) => d >= since && d <= today;
  const out: ExpectedEntry[] = [];
  const push = (e: ExpectedEntry) => {
    if (e.amount > 0) out.push(e);
  };

  for (const h of alive(input.habits))
    for (const d of new Set(h.log))
      if (inRange(d)) push({ key: `habit:${h.id}:${d}`, source: 'habit', date: d, amount: habitValue(h, settings), label: h.title });

  if (values.bonus > 0)
    for (const d of bonusDays(input.habits, since, today))
      push({ key: `bonus:${d}`, source: 'bonus', date: d, amount: values.bonus, label: '' });

  for (const t of alive(input.tasks)) {
    if (t.status !== 'done' || !t.completedAt) continue;
    const d = localDay(t.completedAt);
    if (inRange(d))
      push({ key: `task:${t.id}`, source: 'task', date: d, amount: t.priority === 1 ? values.taskHigh : values.task, label: t.title });
  }

  for (const w of alive(input.workout_logs))
    if (inRange(w.date)) push({ key: `workout:${w.id}`, source: 'workout', date: w.date, amount: values.workout, label: w.name });

  for (const diet of alive(input.diets))
    for (const k of new Set(diet.log)) {
      const [d, meal] = k.split(':');
      if (d && meal && inRange(d)) push({ key: `meal:${diet.id}:${k}`, source: 'meal', date: d, amount: values.meal, label: meal });
    }

  for (const r of input.reviews) {
    const d = localDay(r.createdAt);
    if (inRange(d)) push({ key: `review:${r.weekStart}`, source: 'review', date: d, amount: values.review, label: r.weekStart });
  }
  return out;
}

/**
 * What to change so the ledger matches what was done.
 * Existing earnings keep the amount they had when earned (changing a value is not retroactive);
 * earnings whose cause disappeared are removed; duplicates from another device collapse to the oldest.
 */
export function reconcile(entries: RewardEntry[], expected: ExpectedEntry[]): { create: ExpectedEntry[]; remove: string[] } {
  const byKey = new Map<string, RewardEntry[]>();
  for (const e of alive(entries)) {
    if (e.source === 'redeem') continue;
    byKey.set(e.key, [...(byKey.get(e.key) ?? []), e]);
  }
  const want = new Set(expected.map((e) => e.key));
  const remove: string[] = [];
  for (const [key, list] of byKey) {
    const sorted = [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
    if (!want.has(key)) remove.push(...sorted.map((e) => e.id));
    else remove.push(...sorted.slice(1).map((e) => e.id));
  }
  const create = expected.filter((e) => !byKey.has(e.key));
  return { create, remove };
}

/** Live ledger with one row per key (defensive against duplicates not yet reconciled). */
export function ledger(entries: RewardEntry[]): RewardEntry[] {
  const seen = new Map<string, RewardEntry>();
  for (const e of alive(entries)) {
    const prev = seen.get(e.key);
    if (!prev || e.createdAt < prev.createdAt) seen.set(e.key, e);
  }
  return [...seen.values()].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

export interface Wallet {
  earned: number;
  spent: number;
  balance: number;
}

export function wallet(entries: RewardEntry[]): Wallet {
  let earned = 0;
  let spent = 0;
  for (const e of ledger(entries)) {
    if (e.amount >= 0) earned += e.amount;
    else spent -= e.amount;
  }
  return { earned, spent, balance: earned - spent };
}

export interface Allocation {
  saved: number;
  remaining: number;
  progress: number; // 0..1
  funded: boolean;
}

/** Credit fills active rewards in queue order: the first is paid off before the next one starts. */
export function allocate(rewards: Reward[], balance: number): Map<string, Allocation> {
  const out = new Map<string, Allocation>();
  let left = Math.max(0, balance);
  for (const r of queue(rewards)) {
    const saved = Math.min(left, r.price);
    left -= saved;
    out.set(r.id, { saved, remaining: r.price - saved, progress: r.price > 0 ? saved / r.price : 1, funded: saved >= r.price });
  }
  return out;
}

export function queue(rewards: Reward[]): Reward[] {
  return alive(rewards)
    .filter((r) => r.status === 'active')
    .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
}

export function earnedOn(entries: RewardEntry[], day: string): number {
  return ledger(entries)
    .filter((e) => e.date === day && e.amount > 0)
    .reduce((s, e) => s + e.amount, 0);
}

/** Average credit per day over the last `days` days (only days since rewards started). */
export function dailyPace(entries: RewardEntry[], since: string | null, today: string, days = 7): number {
  if (!since) return 0;
  const startWindow = dateKey(addDays(parseDate(today), -(days - 1)));
  const from = since > startWindow ? since : startWindow;
  const span = Math.round((parseDate(today).getTime() - parseDate(from).getTime()) / 86400000) + 1;
  const sum = ledger(entries)
    .filter((e) => e.amount > 0 && e.date >= from && e.date <= today)
    .reduce((s, e) => s + e.amount, 0);
  return span > 0 ? sum / span : 0;
}

/** Days left at the current pace, or null when there is no pace yet. */
export function etaDays(remaining: number, pace: number): number | null {
  if (remaining <= 0) return 0;
  if (pace <= 0) return null;
  return Math.ceil(remaining / pace);
}

/** Habits that are planned for (or were done on) a given day, in slot order. */
export function habitsForDay(habits: Habit[], day: string): Habit[] {
  const wd = parseDate(day).getDay();
  const order: Record<RoutineSlot, number> = { morning: 0, anytime: 1, evening: 2 };
  return alive(habits)
    .filter((h) => h.days.includes(wd) || h.log.includes(day))
    .sort((a, b) => order[a.slot] - order[b.slot] || a.createdAt.localeCompare(b.createdAt));
}

/** Most a day of habits can earn (planned habits plus the bonus when it applies). */
export function dayPotential(habits: Habit[], day: string, settings: RewardSettings): number {
  const wd = parseDate(day).getDay();
  const planned = alive(habits).filter((h) => h.days.includes(wd));
  const sum = planned.reduce((s, h) => s + habitValue(h, settings), 0);
  return sum + (planned.length >= BONUS_MIN_HABITS ? settings.values.bonus : 0);
}
