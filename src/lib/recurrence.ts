import type { CalendarEvent, Recurrence } from '@/types/models';
import { addDays, addMonths, dateKey, dateTimeKey, parseDate, parseDateTime, startOfDay } from './dates';

export interface Occurrence {
  event: CalendarEvent;
  start: Date;
  end: Date;
  /** date key of this occurrence (used for exceptions) */
  day: string;
}

function matches(rec: Recurrence, first: Date, d: Date): boolean {
  if (d < startOfDay(first)) return false;
  switch (rec) {
    case 'none':
      return dateKey(d) === dateKey(first);
    case 'daily':
      return true;
    case 'weekdays':
      return d.getDay() !== 0 && d.getDay() !== 6;
    case 'weekly':
      return d.getDay() === first.getDay();
    case 'monthly':
      return d.getDate() === first.getDate();
  }
}

/** Expand events (with recurrence) into concrete occurrences overlapping [from, to). */
export function occurrences(events: CalendarEvent[], from: Date, to: Date): Occurrence[] {
  const out: Occurrence[] = [];
  for (const ev of events) {
    if (ev.deletedAt) continue;
    const s = parseDateTime(ev.start);
    const e = parseDateTime(ev.end);
    const durMs = Math.max(0, e.getTime() - s.getTime());
    if (ev.recurrence === 'none') {
      if (s < to && e > from) out.push({ event: ev, start: s, end: e, day: dateKey(s) });
      continue;
    }
    for (let d = startOfDay(from); d < to; d = addDays(d, 1)) {
      if (!matches(ev.recurrence, s, d)) continue;
      const key = dateKey(d);
      if (ev.exceptions?.includes(key)) continue;
      const os = new Date(d);
      os.setHours(s.getHours(), s.getMinutes(), 0, 0);
      const oe = new Date(os.getTime() + durMs);
      out.push({ event: ev, start: os, end: oe, day: key });
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Next due date for a recurring task after completing the one due on `due`. */
export function nextDue(rec: Recurrence, due: string): string | null {
  const d = parseDate(due);
  switch (rec) {
    case 'none':
      return null;
    case 'daily':
      return dateKey(addDays(d, 1));
    case 'weekdays': {
      let n = addDays(d, 1);
      while (n.getDay() === 0 || n.getDay() === 6) n = addDays(n, 1);
      return dateKey(n);
    }
    case 'weekly':
      return dateKey(addDays(d, 7));
    case 'monthly':
      return dateKey(addMonths(d, 1));
  }
}

/** Pairs of occurrences that overlap in time (same day conflicts). */
export function conflicts(occ: Occurrence[]): [Occurrence, Occurrence][] {
  const res: [Occurrence, Occurrence][] = [];
  const timed = occ.filter((o) => !o.event.allDay);
  for (let i = 0; i < timed.length; i++) {
    for (let j = i + 1; j < timed.length; j++) {
      const a = timed[i];
      const b = timed[j];
      if (b.start >= a.end) break;
      if (a.start < b.end && b.start < a.end) res.push([a, b]);
    }
  }
  return res;
}

/** Free minutes in a day between dayStart and dayEnd hours, minus timed occurrences. */
export function freeMinutes(occ: Occurrence[], day: Date, startH: number, endH: number): number {
  const ds = new Date(day);
  ds.setHours(startH, 0, 0, 0);
  const de = new Date(day);
  de.setHours(endH, 0, 0, 0);
  const intervals = occ
    .filter((o) => !o.event.allDay)
    .map((o) => [Math.max(o.start.getTime(), ds.getTime()), Math.min(o.end.getTime(), de.getTime())] as const)
    .filter(([a, b]) => b > a)
    .sort((x, y) => x[0] - y[0]);
  let busy = 0;
  let curS = -1;
  let curE = -1;
  for (const [a, b] of intervals) {
    if (a > curE) {
      if (curE > curS) busy += curE - curS;
      curS = a;
      curE = b;
    } else curE = Math.max(curE, b);
  }
  if (curE > curS) busy += curE - curS;
  return Math.max(0, Math.round((de.getTime() - ds.getTime() - busy) / 60000));
}

/** Free slots of at least `minMinutes` within a day window. */
export function freeSlots(occ: Occurrence[], day: Date, startH: number, endH: number, minMinutes = 45) {
  const ds = new Date(day);
  ds.setHours(startH, 0, 0, 0);
  const de = new Date(day);
  de.setHours(endH, 0, 0, 0);
  const busy = occ
    .filter((o) => !o.event.allDay && o.end > ds && o.start < de)
    .map((o) => [o.start.getTime(), o.end.getTime()] as const)
    .sort((a, b) => a[0] - b[0]);
  const slots: { start: string; end: string }[] = [];
  let cursor = ds.getTime();
  for (const [a, b] of busy) {
    if (a - cursor >= minMinutes * 60000) slots.push({ start: dateTimeKey(new Date(cursor)), end: dateTimeKey(new Date(a)) });
    cursor = Math.max(cursor, b);
  }
  if (de.getTime() - cursor >= minMinutes * 60000) slots.push({ start: dateTimeKey(new Date(cursor)), end: dateTimeKey(de) });
  return slots;
}
