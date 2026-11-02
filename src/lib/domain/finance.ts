import type { Budget, FinancialGoal, Subscription, Transaction, TxCategory } from '@/types/models';
import { monthKey, parseDate, prevMonthKey } from '../dates';

export interface MonthTotals {
  income: number;
  expenses: number;
  savings: number;
  rate: number | null; // savings / income, null when there is no income
}

export function monthTotals(txs: Transaction[], month: string): MonthTotals {
  let income = 0;
  let expenses = 0;
  for (const t of txs) {
    if (t.deletedAt || !t.date.startsWith(month)) continue;
    if (t.type === 'income') income += t.amount;
    else expenses += t.amount;
  }
  const savings = income - expenses;
  return { income, expenses, savings, rate: income > 0 ? savings / income : null };
}

export function balance(txs: Transaction[], opening: number, upTo?: string): number {
  let b = opening;
  for (const t of txs) {
    if (t.deletedAt) continue;
    if (upTo && t.date > upTo) continue;
    b += t.type === 'income' ? t.amount : -t.amount;
  }
  return b;
}

export function byCategory(txs: Transaction[], month: string, type: 'income' | 'expense') {
  const m = new Map<TxCategory, number>();
  for (const t of txs) {
    if (t.deletedAt || t.type !== type || !t.date.startsWith(month)) continue;
    m.set(t.category, (m.get(t.category) ?? 0) + t.amount);
  }
  return [...m.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
}

/** Balance at the end of each of the last `n` months (oldest first), plus money set aside in savings goals. */
export function netWorthSeries(txs: Transaction[], opening: number, goals: FinancialGoal[], n = 6, now = new Date()) {
  const current = monthKey(now);
  const months = Array.from({ length: n }, (_, i) => prevMonthKey(current, n - 1 - i));
  return months.map((m) => {
    const [y, mo] = m.split('-').map(Number);
    const end = new Date(y, mo, 0);
    const endKey = `${m}-${String(end.getDate()).padStart(2, '0')}`;
    const saved = goals
      .filter((g) => !g.deletedAt)
      .reduce((s, g) => s + g.contributions.filter((c) => c.date <= endKey).reduce((a, c) => a + c.amount, 0), 0);
    return { month: m, cash: balance(txs, opening, endKey), saved };
  });
}

export function budgetStatus(budgets: Budget[], txs: Transaction[], month: string) {
  return budgets
    .filter((b) => !b.deletedAt)
    .map((b) => {
      const spent = txs
        .filter((t) => !t.deletedAt && t.type === 'expense' && t.category === b.category && t.date.startsWith(month))
        .reduce((s, t) => s + t.amount, 0);
      return { budget: b, spent, ratio: b.monthlyLimit > 0 ? spent / b.monthlyLimit : 0 };
    })
    .sort((a, b) => b.ratio - a.ratio);
}

export function subscriptionsMonthly(subs: Subscription[]): number {
  return subs
    .filter((s) => !s.deletedAt && s.active)
    .reduce((sum, s) => sum + (s.cycle === 'monthly' ? s.amount : Math.round(s.amount / 12)), 0);
}

/**
 * Average monthly savings over the last complete months that have any operation.
 * Returns null when there is not at least one complete month of data.
 */
export function averageMonthlySavings(txs: Transaction[], now = new Date(), lookback = 3): number | null {
  const current = monthKey(now);
  const months: number[] = [];
  for (let i = 1; i <= lookback; i++) {
    const m = prevMonthKey(current, i);
    const has = txs.some((t) => !t.deletedAt && t.date.startsWith(m));
    if (has) months.push(monthTotals(txs, m).savings);
  }
  if (!months.length) return null;
  return Math.round(months.reduce((a, b) => a + b, 0) / months.length);
}

export function goalEta(goal: FinancialGoal, monthly: number | null): number | null {
  const left = goal.target - goal.current;
  if (left <= 0) return 0;
  if (!monthly || monthly <= 0) return null;
  return Math.ceil(left / monthly);
}

/** Required monthly saving to hit a goal by its due date. */
export function requiredMonthly(goal: FinancialGoal, now = new Date()): number | null {
  if (!goal.dueDate) return null;
  const due = parseDate(goal.dueDate);
  const months = (due.getFullYear() - now.getFullYear()) * 12 + (due.getMonth() - now.getMonth());
  const left = goal.target - goal.current;
  if (left <= 0) return 0;
  if (months <= 0) return left;
  return Math.ceil(left / months);
}
