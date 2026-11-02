/** Typed domain models. Money is stored in integer cents. Dates are ISO strings (local time). */

export type ID = string;

export interface Entity {
  id: ID;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export type ThemePreference = 'system' | 'light' | 'dark';
export type AccentName = 'sage' | 'ocean' | 'blue' | 'lavender' | 'rose' | 'clay' | 'amber' | 'graphite';
export type Language = 'es' | 'en';
export type Currency = 'EUR' | 'USD' | 'GBP' | 'MXN';
export type DateFormat = 'dmy' | 'mdy' | 'ymd';
export type Units = 'metric' | 'imperial';

export interface UserPreferences {
  name: string;
  language: Language;
  currency: Currency;
  dateFormat: DateFormat;
  weekStartsOn: 0 | 1; // 0 Sunday, 1 Monday
  units: Units;
  theme: ThemePreference;
  /** accent colour; grounds and text never change */
  accent?: AccentName;
  dayStartHour: number; // for free-time calculation
  dayEndHour: number;
  weeklySportTarget: number;
  notifications: { reminders: boolean; weeklyReview: boolean; insights: boolean };
  assistant: {
    consent: boolean; // explicit consent to send data to the AI provider
    modules: Record<AssistantModule, boolean>;
  };
  onboarded: boolean;
}

export type AssistantModule = 'calendar' | 'tasks' | 'goals' | 'finance' | 'habits' | 'lifeBalance' | 'reviews' | 'health';

export interface User {
  id: ID | null; // null in local mode
  email: string | null;
  mode: 'local' | 'cloud';
}

/** Plan categories */
export type PlanCategory = 'work' | 'sport' | 'learning' | 'personal' | 'social' | 'leisure';

export type Recurrence = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly';

export interface Subtask {
  id: ID;
  title: string;
  done: boolean;
}

export type TaskStatus = 'todo' | 'doing' | 'done';
export type Priority = 1 | 2 | 3; // 1 high, 3 low

export interface Task extends Entity {
  title: string;
  notes?: string;
  category: PlanCategory;
  priority: Priority;
  due?: string | null; // YYYY-MM-DD
  status: TaskStatus;
  subtasks: Subtask[];
  recurrence: Recurrence;
  goalId?: ID | null;
  milestoneId?: ID | null;
  completedAt?: string | null;
}

export interface CalendarEvent extends Entity {
  title: string;
  category: PlanCategory;
  start: string; // ISO local datetime YYYY-MM-DDTHH:mm
  end: string;
  allDay: boolean;
  location?: string;
  notes?: string;
  recurrence: Recurrence;
  reminderMinutes?: number | null;
  goalId?: ID | null;
  /** occurrence dates (YYYY-MM-DD) removed from a recurring series */
  exceptions?: string[];
}

export type RoutineSlot = 'morning' | 'evening' | 'anytime';

export interface Habit extends Entity {
  title: string;
  slot: RoutineSlot;
  dimension: DimensionKey;
  days: number[]; // weekdays 0-6 when expected
  log: string[]; // YYYY-MM-DD done
}

export type LeisureKind = 'weekend' | 'activity' | 'place' | 'trip' | 'experience';

export interface LeisureItem extends Entity {
  title: string;
  kind: LeisureKind;
  date?: string | null;
  done: boolean;
  notes?: string;
}

export interface Idea extends Entity {
  text: string;
}

/** Finance */
export type TxType = 'income' | 'expense';

export type ExpenseCategory = 'home' | 'food' | 'transport' | 'leisure' | 'health' | 'shopping' | 'education' | 'subscriptions' | 'other';
export type IncomeCategory = 'salary' | 'freelance' | 'gift' | 'investment' | 'other_income';
export type TxCategory = ExpenseCategory | IncomeCategory;

export interface Transaction extends Entity {
  amount: number; // cents, always positive
  type: TxType;
  category: TxCategory;
  date: string; // YYYY-MM-DD
  description: string;
  account?: string;
  subscriptionId?: ID | null;
}

export interface Budget extends Entity {
  category: ExpenseCategory;
  monthlyLimit: number; // cents
}

export interface Subscription extends Entity {
  name: string;
  amount: number; // cents per cycle
  cycle: 'monthly' | 'yearly';
  nextDate: string; // YYYY-MM-DD
  category: ExpenseCategory;
  active: boolean;
}

export interface FinancialGoal extends Entity {
  name: string;
  target: number; // cents
  current: number; // cents
  dueDate?: string | null;
  priority: Priority;
  contributions: { date: string; amount: number }[];
}

export interface FinanceSettings {
  openingBalance: number; // cents, money held before the first logged operation
}

/** Goals */
export type GoalHorizon = 'short' | 'medium' | 'long';
export type GoalStatus = 'active' | 'paused' | 'done';

export interface GoalMilestone {
  id: ID;
  title: string;
  done: boolean;
  dueDate?: string | null;
  doneAt?: string | null;
}

export interface PersonalGoal extends Entity {
  title: string;
  description?: string;
  dimension: DimensionKey;
  horizon: GoalHorizon;
  startDate: string;
  targetDate?: string | null;
  priority: Priority;
  status: GoalStatus;
  milestones: GoalMilestone[];
  /** when set, progress also reflects this savings goal */
  financialGoalId?: ID | null;
  /** manual progress (0-100) used only when there are no milestones nor linked savings */
  manualProgress?: number;
}

/** Life Balance */
export type DimensionKey = 'career' | 'finance' | 'health' | 'relationships' | 'growth' | 'leisure' | 'home' | 'purpose';

export interface LifeBalanceDimension {
  key: DimensionKey;
  label?: string | null; // custom label
  priority: 1 | 2 | 3; // how much it matters to the person (not achievement)
  enabled: boolean;
}

export interface LifeBalanceScore {
  key: DimensionKey;
  self: number | null; // 0-12 self rating
  ratedAt: string | null;
}

export interface DimensionResult {
  key: DimensionKey;
  self: number | null;
  data: number | null;
  combined: number | null;
  /** evidence for the data part, as i18n keys with params */
  basis: { k: string; p?: Record<string, string | number>; v: number }[];
}

export interface LifeBalanceSnapshot {
  month: string; // YYYY-MM
  takenAt: string;
  values: Record<DimensionKey, { self: number | null; data: number | null; combined: number | null }>;
}

/** Weekly review */
export interface WeeklyReview {
  weekStart: string; // YYYY-MM-DD
  createdAt: string;
  tasksDone: number;
  tasksPending: number;
  minutesByCategory: Record<PlanCategory, number>;
  sportSessions: number;
  income: number;
  expenses: number;
  goalsProgress: { id: ID; title: string; progress: number }[];
  balanceDelta: { key: DimensionKey; from: number | null; to: number | null }[];
  note?: string;
}

/** Assistant */
export type AssistantRole = 'user' | 'assistant';

export type ProposedAction =
  | { kind: 'create_task'; title: string; due?: string; category?: PlanCategory; priority?: Priority }
  | {
      kind: 'create_event';
      title: string;
      start: string;
      end: string;
      category?: PlanCategory;
      location?: string;
    }
  | { kind: 'move_event'; eventId: ID; start: string; end: string; occurrenceDate?: string }
  | {
      kind: 'add_transaction';
      amount: number;
      type: TxType;
      category: TxCategory;
      date: string;
      description: string;
    }
  | {
      kind: 'create_goal';
      title: string;
      dimension: DimensionKey;
      horizon: GoalHorizon;
      targetDate?: string;
      milestones?: string[];
    }
  | { kind: 'create_habit'; title: string; slot: RoutineSlot; dimension: DimensionKey; days: number[] };

export interface ActionProposal {
  id: ID;
  action: ProposedAction;
  status: 'pending' | 'applied' | 'dismissed';
}

export interface AssistantMessage {
  id: ID;
  conversationId: ID;
  role: AssistantRole;
  text: string;
  createdAt: string;
  proposals?: ActionProposal[];
  error?: boolean;
}

export interface AssistantConversation extends Entity {
  title: string;
  context?: string; // module it was opened from
}

/** Health: training */
export type WorkoutFocus = 'strength' | 'cardio' | 'mobility' | 'mixed';

export interface Exercise {
  id: ID;
  name: string;
  sets: number;
  reps: string; // "10", "8-12", "30 s"
  weightKg?: number | null;
  restSec?: number | null;
  notes?: string;
}

export interface WorkoutRoutine extends Entity {
  name: string;
  focus: WorkoutFocus;
  days: number[]; // weekdays 0-6
  time?: string | null; // HH:mm, when scheduled in the calendar
  durationMin: number;
  exercises: Exercise[];
  notes?: string;
  /** weekly calendar events created for this routine */
  eventIds: ID[];
}

export interface LoggedExercise {
  exerciseId: ID;
  name: string;
  setsDone: number;
  setsPlanned: number;
  weightKg?: number | null;
}

export interface WorkoutLog extends Entity {
  routineId?: ID | null;
  name: string;
  date: string; // YYYY-MM-DD
  durationMin: number;
  exercises: LoggedExercise[];
  effort?: 1 | 2 | 3 | 4 | 5 | null; // perceived effort
  notes?: string;
}

/** Health: nutrition */
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Ingredient {
  id: ID;
  name: string;
  quantity: string; // "200 g", "1 cda"
}

export interface Recipe extends Entity {
  name: string;
  mealType: MealType;
  servings: number;
  prepMin?: number | null;
  ingredients: Ingredient[];
  steps: string[];
  /** per serving, only when the person enters them */
  kcal?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  image?: string | null; // local file URI (native) or compressed data URI (web)
  notes?: string;
}

export interface MealItem {
  id: ID;
  recipeId?: ID | null;
  text?: string;
}

export type DietWeek = Record<string, Partial<Record<MealType, MealItem[]>>>; // key: weekday "0".."6"

export interface DietPlan extends Entity {
  name: string;
  goal?: string;
  kcalTarget?: number | null;
  notes?: string;
  week: DietWeek;
  images: string[];
  active: boolean;
  /** meals marked as eaten: "YYYY-MM-DD:mealType" */
  log: string[];
}

/** Sync outbox */
export type SyncTable =
  | 'tasks'
  | 'events'
  | 'habits'
  | 'leisure_items'
  | 'ideas'
  | 'transactions'
  | 'budgets'
  | 'subscriptions'
  | 'financial_goals'
  | 'personal_goals'
  | 'assistant_conversations'
  | 'routines'
  | 'workout_logs'
  | 'recipes'
  | 'diets';

export interface OutboxItem {
  table: SyncTable;
  id: ID;
  at: string;
}
