import { useMemo } from 'react';

import { todayKey } from '@/lib/dates';
import { allocate, dailyPace, dayPotential, earnedOn, etaDays, habitsForDay, ledger, queue, wallet } from '@/lib/domain/rewards';
import { money } from '@/lib/format';
import { useStore } from '@/store';
import { useT } from '@/lib/i18n';

/** Everything the rewards screens show, derived from the store in one place. */
export function useRewards() {
  const rewards = useStore((s) => s.rewards);
  const entries = useStore((s) => s.reward_entries);
  const habits = useStore((s) => s.habits);
  const settings = useStore((s) => s.prefs.rewards);
  const currency = useStore((s) => s.prefs.currency);
  const { lang } = useT();
  const today = todayKey();

  return useMemo(() => {
    const q = queue(rewards);
    const w = wallet(entries);
    const alloc = allocate(q, w.balance);
    const pace = dailyPace(entries, settings.since, today);
    const todayHabits = habitsForDay(habits, today);
    const redeemed = rewards
      .filter((r) => !r.deletedAt && r.status === 'redeemed')
      .sort((a, b) => (b.redeemedAt ?? '').localeCompare(a.redeemedAt ?? ''));
    const first = q[0];
    const firstAlloc = first ? alloc.get(first.id) : undefined;
    return {
      settings,
      queue: q,
      redeemed,
      alloc,
      wallet: w,
      pace,
      first,
      firstAlloc,
      eta: firstAlloc ? etaDays(firstAlloc.remaining, pace) : null,
      today,
      todayHabits,
      todayEarned: earnedOn(entries, today),
      todayPotential: dayPotential(habits, today, settings),
      ledger: ledger(entries),
      fmt: (cents: number, sign = false) => money(cents, currency, lang, { sign }),
    };
  }, [rewards, entries, habits, settings, currency, lang, today]);
}

/** "in about 3 weeks"-style wording for an ETA in days. */
export function etaKey(days: number | null): { k: string; n?: number } {
  if (days == null) return { k: 'rw.eta.none' };
  if (days <= 1) return { k: 'rw.eta.day1' };
  if (days < 14) return { k: 'rw.eta.days', n: days };
  if (days < 60) return { k: 'rw.eta.weeks', n: Math.round(days / 7) };
  return { k: 'rw.eta.months', n: Math.round(days / 30) };
}
