import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { dateKey, nowISO, todayKey } from '@/lib/dates';
import { uid } from '@/lib/id';
import { nextDue } from '@/lib/recurrence';
import type {
  AssistantConversation,
  AssistantMessage,
  Budget,
  CalendarEvent,
  DimensionKey,
  Entity,
  FinanceSettings,
  FinancialGoal,
  Habit,
  Idea,
  LeisureItem,
  LifeBalanceDimension,
  LifeBalanceScore,
  LifeBalanceSnapshot,
  OutboxItem,
  PersonalGoal,
  Subscription,
  SyncTable,
  Task,
  Transaction,
  User,
  UserPreferences,
  WeeklyReview,
} from '@/types/models';

export const DIMENSIONS: DimensionKey[] = ['career', 'finance', 'health', 'relationships', 'growth', 'leisure', 'home', 'purpose'];

export interface Collections {
  tasks: Task[];
  events: CalendarEvent[];
  habits: Habit[];
  leisure_items: LeisureItem[];
  ideas: Idea[];
  transactions: Transaction[];
  budgets: Budget[];
  subscriptions: Subscription[];
  financial_goals: FinancialGoal[];
  personal_goals: PersonalGoal[];
  assistant_conversations: AssistantConversation[];
}

type ItemOf<K extends SyncTable> = Collections[K][number];
type Draft<T extends Entity> = Omit<T, keyof Entity> & Partial<Pick<T, 'id'>>;

export interface State extends Collections {
  hydrated: boolean;
  user: User;
  prefs: UserPreferences;
  finance: FinanceSettings;
  dimensions: LifeBalanceDimension[];
  scores: LifeBalanceScore[];
  snapshots: LifeBalanceSnapshot[];
  reviews: WeeklyReview[];
  messages: AssistantMessage[];
  outbox: OutboxItem[];
  lastPulledAt: string | null;

  setHydrated: () => void;
  setUser: (u: User) => void;
  setPrefs: (p: Partial<UserPreferences>) => void;
  setFinance: (f: Partial<FinanceSettings>) => void;

  create: <K extends SyncTable>(table: K, draft: Draft<ItemOf<K>>) => ItemOf<K>;
  update: <K extends SyncTable>(table: K, id: string, patch: Partial<ItemOf<K>>) => void;
  remove: <K extends SyncTable>(table: K, id: string) => void;
  /** Merge rows pulled from the server (last-write-wins on updatedAt). */
  mergeRemote: <K extends SyncTable>(table: K, rows: ItemOf<K>[]) => void;
  clearOutbox: (items: OutboxItem[]) => void;
  setLastPulledAt: (at: string) => void;

  completeTask: (id: string, done: boolean) => void;
  toggleHabit: (id: string, day?: string) => void;
  contribute: (goalId: string, amount: number, date?: string) => void;

  setRating: (key: DimensionKey, value: number | null) => void;
  setDimension: (key: DimensionKey, patch: Partial<LifeBalanceDimension>) => void;
  upsertSnapshot: (s: LifeBalanceSnapshot) => void;

  saveReview: (r: WeeklyReview) => void;

  addMessage: (m: Omit<AssistantMessage, 'id' | 'createdAt'> & { id?: string }) => AssistantMessage;
  patchMessage: (id: string, patch: Partial<AssistantMessage>) => void;

  importAll: (data: Partial<State>) => void;
  resetAll: () => void;
}

const defaultPrefs: UserPreferences = {
  name: '',
  language: 'es',
  currency: 'EUR',
  dateFormat: 'dmy',
  weekStartsOn: 1,
  units: 'metric',
  theme: 'system',
  dayStartHour: 8,
  dayEndHour: 22,
  weeklySportTarget: 3,
  notifications: { reminders: true, weeklyReview: true, insights: true },
  assistant: {
    consent: false,
    modules: {
      calendar: true,
      tasks: true,
      goals: true,
      finance: true,
      habits: true,
      lifeBalance: true,
      reviews: true,
    },
  },
  onboarded: false,
};

const emptyCollections = (): Collections => ({
  tasks: [],
  events: [],
  habits: [],
  leisure_items: [],
  ideas: [],
  transactions: [],
  budgets: [],
  subscriptions: [],
  financial_goals: [],
  personal_goals: [],
  assistant_conversations: [],
});

const initialData = () => ({
  ...emptyCollections(),
  user: { id: null, email: null, mode: 'local' as const },
  prefs: defaultPrefs,
  finance: { openingBalance: 0 },
  dimensions: DIMENSIONS.map((key) => ({ key, priority: 2 as const, enabled: true, label: null })),
  scores: DIMENSIONS.map((key) => ({ key, self: null, ratedAt: null })),
  snapshots: [] as LifeBalanceSnapshot[],
  reviews: [] as WeeklyReview[],
  messages: [] as AssistantMessage[],
  outbox: [] as OutboxItem[],
  lastPulledAt: null as string | null,
});

function enqueue(outbox: OutboxItem[], table: SyncTable, id: string): OutboxItem[] {
  const rest = outbox.filter((o) => !(o.table === table && o.id === id));
  return [...rest, { table, id, at: nowISO() }];
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...initialData(),
      hydrated: false,

      setHydrated: () => set({ hydrated: true }),
      setUser: (user) => set({ user }),
      setPrefs: (p) =>
        set((s) => ({
          prefs: {
            ...s.prefs,
            ...p,
            notifications: { ...s.prefs.notifications, ...(p.notifications ?? {}) },
            assistant: {
              ...s.prefs.assistant,
              ...(p.assistant ?? {}),
              modules: { ...s.prefs.assistant.modules, ...(p.assistant?.modules ?? {}) },
            },
          },
        })),
      setFinance: (f) => set((s) => ({ finance: { ...s.finance, ...f } })),

      create: (table, draft) => {
        const now = nowISO();
        const item = { ...draft, id: draft.id ?? uid(), createdAt: now, updatedAt: now, deletedAt: null } as never;
        set(
          (s) =>
            ({
              [table]: [...(s[table] as Entity[]), item],
              outbox: enqueue(s.outbox, table, (item as Entity).id),
            }) as Partial<State>,
        );
        return item;
      },

      update: (table, id, patch) =>
        set(
          (s) =>
            ({
              [table]: (s[table] as Entity[]).map((e) => (e.id === id ? { ...e, ...patch, updatedAt: nowISO() } : e)),
              outbox: enqueue(s.outbox, table, id),
            }) as Partial<State>,
        ),

      remove: (table, id) =>
        set((s) => {
          const now = nowISO();
          return {
            [table]: (s[table] as Entity[]).map((e) => (e.id === id ? { ...e, deletedAt: now, updatedAt: now } : e)),
            outbox: enqueue(s.outbox, table, id),
          } as Partial<State>;
        }),

      mergeRemote: (table, rows) =>
        set((s) => {
          const map = new Map((s[table] as Entity[]).map((e) => [e.id, e]));
          for (const r of rows as Entity[]) {
            const local = map.get(r.id);
            // Last write wins: a pending local edit is newer than what the server has, so it stays.
            if (!local || Date.parse(r.updatedAt) > Date.parse(local.updatedAt)) map.set(r.id, r);
          }
          return { [table]: [...map.values()] } as Partial<State>;
        }),

      clearOutbox: (items) =>
        set((s) => ({
          outbox: s.outbox.filter((o) => !items.some((i) => i.table === o.table && i.id === o.id && i.at === o.at)),
        })),
      setLastPulledAt: (at) => set({ lastPulledAt: at }),

      completeTask: (id, done) => {
        const t = get().tasks.find((x) => x.id === id);
        if (!t) return;
        const now = nowISO();
        get().update('tasks', id, { status: done ? 'done' : 'todo', completedAt: done ? now : null });
        // Recurring tasks spawn their next occurrence once, when completed.
        if (done && t.recurrence !== 'none') {
          const next = nextDue(t.recurrence, t.due ?? todayKey());
          const exists = get().tasks.some((x) => !x.deletedAt && x.title === t.title && x.due === next && x.status !== 'done');
          if (next && !exists)
            get().create('tasks', {
              title: t.title,
              notes: t.notes,
              category: t.category,
              priority: t.priority,
              due: next,
              status: 'todo',
              subtasks: t.subtasks.map((st) => ({ ...st, id: uid(), done: false })),
              recurrence: t.recurrence,
              goalId: t.goalId ?? null,
              milestoneId: null,
              completedAt: null,
            });
        }
      },

      toggleHabit: (id, day) => {
        const h = get().habits.find((x) => x.id === id);
        if (!h) return;
        const k = day ?? todayKey();
        const log = h.log.includes(k) ? h.log.filter((d) => d !== k) : [...h.log, k];
        get().update('habits', id, { log });
      },

      contribute: (goalId, amount, date) => {
        const g = get().financial_goals.find((x) => x.id === goalId);
        if (!g) return;
        get().update('financial_goals', goalId, {
          current: Math.max(0, g.current + amount),
          contributions: [...g.contributions, { date: date ?? todayKey(), amount }],
        });
      },

      setRating: (key, value) =>
        set((s) => ({
          scores: s.scores.map((sc) => (sc.key === key ? { ...sc, self: value, ratedAt: value == null ? null : nowISO() } : sc)),
        })),
      setDimension: (key, patch) => set((s) => ({ dimensions: s.dimensions.map((d) => (d.key === key ? { ...d, ...patch } : d)) })),
      upsertSnapshot: (snap) =>
        set((s) => ({
          snapshots: [...s.snapshots.filter((x) => x.month !== snap.month), snap].sort((a, b) => a.month.localeCompare(b.month)),
        })),

      saveReview: (r) =>
        set((s) => ({
          reviews: [...s.reviews.filter((x) => x.weekStart !== r.weekStart), r].sort((a, b) => b.weekStart.localeCompare(a.weekStart)),
        })),

      addMessage: (m) => {
        const msg: AssistantMessage = { ...m, id: m.id ?? uid(), createdAt: nowISO() };
        set((s) => ({ messages: [...s.messages, msg] }));
        return msg;
      },
      patchMessage: (id, patch) => set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),

      importAll: (data) => set((s) => ({ ...s, ...data })),
      resetAll: () => set({ ...initialData() }),
    }),
    {
      name: 'morrow-v1',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => {
        const { hydrated: _h, ...rest } = s;
        return Object.fromEntries(Object.entries(rest).filter(([, v]) => typeof v !== 'function')) as Partial<State>;
      },
      // mark hydrated even if storage failed (private mode, blocked site data): the app still opens
      onRehydrateStorage: () => () => useStore.setState({ hydrated: true }),
    },
  ),
);

/** Live (non-deleted) rows of a collection. */
export function live<T extends Entity>(rows: T[]): T[] {
  return rows.filter((r) => !r.deletedAt);
}

export const todayDateKey = () => dateKey(new Date());
