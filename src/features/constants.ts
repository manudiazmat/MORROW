import type {
  DimensionKey,
  ExpenseCategory,
  GoalHorizon,
  IncomeCategory,
  LeisureKind,
  PlanCategory,
  Recurrence,
  RoutineSlot,
} from '@/types/models';

export const PLAN_CATS: PlanCategory[] = ['work', 'sport', 'learning', 'personal', 'social', 'leisure'];
export const EXPENSE_CATS: ExpenseCategory[] = [
  'home',
  'food',
  'transport',
  'leisure',
  'health',
  'shopping',
  'education',
  'subscriptions',
  'other',
];
export const INCOME_CATS: IncomeCategory[] = ['salary', 'freelance', 'gift', 'investment', 'other_income'];
export const DIMS: DimensionKey[] = ['career', 'finance', 'health', 'relationships', 'growth', 'leisure', 'home', 'purpose'];
export const HORIZONS: GoalHorizon[] = ['short', 'medium', 'long'];
export const RECURRENCES: Recurrence[] = ['none', 'daily', 'weekdays', 'weekly', 'monthly'];
export const LEISURE_KINDS: LeisureKind[] = ['weekend', 'activity', 'place', 'trip', 'experience'];
export const SLOTS: RoutineSlot[] = ['morning', 'anytime', 'evening'];
/** Plan category a dimension most naturally maps to (used when the assistant or goals create items). */
export const DIM_TO_CAT: Record<DimensionKey, PlanCategory> = {
  career: 'work',
  finance: 'personal',
  health: 'sport',
  relationships: 'social',
  growth: 'learning',
  leisure: 'leisure',
  home: 'personal',
  purpose: 'personal',
};
