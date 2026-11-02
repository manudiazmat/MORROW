import type { FinancialGoal, PersonalGoal } from '@/types/models';
import { parseDate } from '../dates';

/** Progress 0..1 from milestones and/or the linked savings goal; manual value only as a last resort. */
export function goalProgress(goal: PersonalGoal, financial: FinancialGoal[]): number {
  if (goal.status === 'done') return 1;
  const parts: number[] = [];
  if (goal.milestones.length) parts.push(goal.milestones.filter((m) => m.done).length / goal.milestones.length);
  if (goal.financialGoalId) {
    const f = financial.find((x) => x.id === goal.financialGoalId && !x.deletedAt);
    if (f && f.target > 0) parts.push(Math.min(1, f.current / f.target));
  }
  if (!parts.length) return Math.max(0, Math.min(1, (goal.manualProgress ?? 0) / 100));
  return parts.reduce((a, b) => a + b, 0) / parts.length;
}

/** Fraction of the planned time already elapsed (null without a target date). */
export function timeElapsed(goal: PersonalGoal, now = new Date()): number | null {
  if (!goal.targetDate) return null;
  const s = parseDate(goal.startDate).getTime();
  const e = parseDate(goal.targetDate).getTime();
  if (e <= s) return 1;
  return Math.max(0, Math.min(1, (now.getTime() - s) / (e - s)));
}

/** How far behind schedule (0 when on track). Only meaningful with a target date. */
export function delay(goal: PersonalGoal, financial: FinancialGoal[], now = new Date()): number {
  if (goal.status !== 'active') return 0;
  const t = timeElapsed(goal, now);
  if (t == null) return 0;
  return Math.max(0, t - goalProgress(goal, financial));
}

export function isOverdue(goal: PersonalGoal, now = new Date()): boolean {
  return goal.status === 'active' && !!goal.targetDate && parseDate(goal.targetDate) < now;
}
