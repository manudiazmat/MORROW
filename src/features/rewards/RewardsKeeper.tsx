import { useEffect } from 'react';

import { todayKey } from '@/lib/dates';
import { expectedEntries, reconcile } from '@/lib/domain/rewards';
import { useStore } from '@/store';

/**
 * Keeps the rewards ledger in step with what was actually done:
 * checking a habit, finishing a task or logging a workout adds credit; undoing it takes it back.
 */
export function RewardsKeeper() {
  const habits = useStore((s) => s.habits);
  const tasks = useStore((s) => s.tasks);
  const workoutLogs = useStore((s) => s.workout_logs);
  const diets = useStore((s) => s.diets);
  const reviews = useStore((s) => s.reviews);
  const entries = useStore((s) => s.reward_entries);
  const settings = useStore((s) => s.prefs.rewards);

  useEffect(() => {
    if (!settings.since) return;
    const expected = expectedEntries({ habits, tasks, workout_logs: workoutLogs, diets, reviews }, settings, todayKey());
    const { create, remove } = reconcile(entries, expected);
    if (!create.length && !remove.length) return;
    const st = useStore.getState();
    for (const id of remove) st.remove('reward_entries', id);
    for (const e of create) st.create('reward_entries', e);
  }, [habits, tasks, workoutLogs, diets, reviews, entries, settings]);

  return null;
}
