import { live, type State, useStore } from '@/store';
import type { ActionProposal, AssistantModule, ProposedAction } from '@/types/models';
import { addDays, dateKey, dateTimeKey, monthKey, prevMonthKey, startOfDay } from './dates';
import { budgetStatus, byCategory, monthTotals } from './domain/finance';
import { delay, goalProgress } from './domain/goals';
import { computeAll } from './domain/lifeBalance';
import { balanceInput } from './domain/review';
import { uid } from './id';
import { freeSlots, occurrences } from './recurrence';
import { supabase, supabaseConfigured } from './supabase';

/**
 * Provider-independent assistant client.
 * The app never talks to an AI provider directly: it calls the `assistant` Supabase Edge Function,
 * which holds the provider key and translates to Anthropic / OpenAI (see supabase/functions/assistant).
 * Nothing is sent without consent, and only the modules the person allowed.
 */
export const assistantProviderName = process.env.EXPO_PUBLIC_ASSISTANT_PROVIDER_NAME ?? '';
export const assistantConfigured = supabaseConfigured && process.env.EXPO_PUBLIC_ASSISTANT_ENABLED === 'true';

const euros = (c: number) => Math.round(c) / 100;

export function buildContext(s: State, now = new Date()) {
  const m = s.prefs.assistant.modules;
  const allow = (k: AssistantModule) => s.prefs.assistant.consent && m[k];
  const ctx: Record<string, unknown> = {
    today: dateKey(now),
    now: dateTimeKey(now),
    weekday: now.getDay(),
    locale: s.prefs.language,
    currency: s.prefs.currency,
    person: {
      name: s.prefs.name || null,
      activeHours: [s.prefs.dayStartHour, s.prefs.dayEndHour],
      weeklySportTarget: s.prefs.weeklySportTarget,
      weekStartsOn: s.prefs.weekStartsOn,
    },
  };
  const from = startOfDay(now);
  const to = addDays(from, 14);
  if (allow('calendar')) {
    const occ = occurrences(live(s.events), from, to);
    ctx.calendar = occ.slice(0, 80).map((o) => ({
      id: o.event.id,
      title: o.event.title,
      start: dateTimeKey(o.start),
      end: dateTimeKey(o.end),
      category: o.event.category,
      allDay: o.event.allDay,
      recurring: o.event.recurrence !== 'none',
    }));
    ctx.freeSlotsNext7Days = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(from, i);
      return {
        date: dateKey(d),
        slots: freeSlots(
          occ.filter((o) => o.day === dateKey(d)),
          d,
          s.prefs.dayStartHour,
          s.prefs.dayEndHour,
          45,
        ),
      };
    });
  }
  if (allow('tasks')) {
    const tasks = live(s.tasks);
    ctx.tasks = {
      pending: tasks
        .filter((t) => t.status !== 'done')
        .slice(0, 60)
        .map((t) => ({
          id: t.id,
          title: t.title,
          due: t.due,
          priority: t.priority,
          category: t.category,
          recurring: t.recurrence !== 'none',
        })),
      doneLast7Days: tasks.filter((t) => t.completedAt && t.completedAt.slice(0, 10) >= dateKey(addDays(now, -7))).length,
    };
  }
  if (allow('goals')) {
    const fin = live(s.financial_goals);
    ctx.goals = live(s.personal_goals).map((g) => ({
      title: g.title,
      dimension: g.dimension,
      horizon: g.horizon,
      status: g.status,
      targetDate: g.targetDate,
      progressPct: Math.round(goalProgress(g, fin) * 100),
      behindSchedulePct: Math.round(delay(g, fin, now) * 100),
      openMilestones: g.milestones.filter((x) => !x.done).map((x) => x.title),
    }));
  }
  if (allow('finance')) {
    const tx = live(s.transactions);
    const mk = monthKey(now);
    const months = [mk, prevMonthKey(mk), prevMonthKey(mk, 2), prevMonthKey(mk, 3)];
    ctx.finance = {
      note: 'amounts in currency units',
      months: months.map((x) => {
        const tt = monthTotals(tx, x);
        return {
          month: x,
          income: euros(tt.income),
          expenses: euros(tt.expenses),
          savings: euros(tt.savings),
          byCategory: byCategory(tx, x, 'expense').map((c) => ({ category: c.category, amount: euros(c.amount) })),
        };
      }),
      budgets: budgetStatus(live(s.budgets), tx, mk).map((b) => ({
        category: b.budget.category,
        limit: euros(b.budget.monthlyLimit),
        spent: euros(b.spent),
      })),
      savingsGoals: live(s.financial_goals).map((g) => ({
        name: g.name,
        target: euros(g.target),
        current: euros(g.current),
        dueDate: g.dueDate,
      })),
      subscriptions: live(s.subscriptions)
        .filter((x) => x.active)
        .map((x) => ({ name: x.name, amount: euros(x.amount), cycle: x.cycle })),
    };
  }
  if (allow('habits')) {
    ctx.habits = live(s.habits).map((h) => {
      const last7 = Array.from({ length: 7 }, (_, i) => dateKey(addDays(now, -i)));
      return { title: h.title, slot: h.slot, doneLast7: last7.filter((d) => h.log.includes(d)).length, expectedDays: h.days };
    });
  }
  if (allow('lifeBalance')) {
    const res = computeAll(
      s.dimensions.filter((d) => d.enabled).map((d) => d.key),
      balanceInput(s, now),
    );
    const prev = s.snapshots.find((x) => x.month === prevMonthKey(monthKey(now)));
    ctx.lifeBalance = {
      scale: '0-12; self = personal rating, data = from logged activity',
      dimensions: res.map((r) => ({
        key: r.key,
        priority: s.dimensions.find((d) => d.key === r.key)?.priority,
        self: r.self,
        data: r.data,
        combined: r.combined,
        previousMonth: prev?.values[r.key]?.combined ?? null,
      })),
    };
  }
  if (allow('reviews')) ctx.weeklyReviews = s.reviews.slice(0, 3);
  return ctx;
}

export interface AssistantReply {
  text: string;
  actions: ProposedAction[];
}

export async function askAssistant(conversationId: string, module: string | null): Promise<AssistantReply> {
  if (!supabase) throw new Error('Supabase not configured');
  const s = useStore.getState();
  const history = s.messages
    .filter((m) => m.conversationId === conversationId && !m.error)
    .slice(-16)
    .map((m) => ({ role: m.role, text: m.text }));
  const { data, error } = await supabase.functions.invoke('assistant', {
    body: { messages: history, context: buildContext(s), module, locale: s.prefs.language },
  });
  if (error) throw new Error(error.message);
  if (!data || typeof data.text !== 'string') throw new Error('Invalid response');
  return { text: data.text, actions: Array.isArray(data.actions) ? data.actions : [] };
}

export function toProposals(actions: ProposedAction[]): ActionProposal[] {
  return actions.map((action) => ({ id: uid(), action, status: 'pending' }));
}

/** Runs an approved proposal against the local store. Returns false when it can't be applied. */
export function applyAction(a: ProposedAction): boolean {
  const st = useStore.getState();
  switch (a.kind) {
    case 'create_task':
      st.create('tasks', {
        title: a.title,
        category: a.category ?? 'personal',
        priority: a.priority ?? 2,
        due: a.due ?? null,
        status: 'todo',
        subtasks: [],
        recurrence: 'none',
        goalId: null,
        milestoneId: null,
        completedAt: null,
      });
      return true;
    case 'create_event':
      if (!a.start || !a.end || a.end <= a.start) return false;
      st.create('events', {
        title: a.title,
        category: a.category ?? 'personal',
        start: a.start.slice(0, 16),
        end: a.end.slice(0, 16),
        allDay: false,
        location: a.location ?? '',
        recurrence: 'none',
        reminderMinutes: null,
        goalId: null,
        exceptions: [],
      });
      return true;
    case 'move_event': {
      const ev = st.events.find((e) => e.id === a.eventId && !e.deletedAt);
      if (!ev || a.end <= a.start) return false;
      if (ev.recurrence !== 'none') {
        // move one occurrence: exclude it from the series and create a one-off copy
        if (!a.occurrenceDate) return false;
        st.update('events', ev.id, { exceptions: [...(ev.exceptions ?? []), a.occurrenceDate] });
        st.create('events', {
          ...ev,
          id: undefined,
          start: a.start.slice(0, 16),
          end: a.end.slice(0, 16),
          recurrence: 'none',
          exceptions: [],
        } as never);
      } else st.update('events', ev.id, { start: a.start.slice(0, 16), end: a.end.slice(0, 16) });
      return true;
    }
    case 'add_transaction':
      if (!(a.amount > 0)) return false;
      st.create('transactions', {
        amount: Math.round(a.amount * 100),
        type: a.type,
        category: a.category,
        date: a.date,
        description: a.description,
        account: '',
        subscriptionId: null,
      });
      return true;
    case 'create_goal':
      st.create('personal_goals', {
        title: a.title,
        dimension: a.dimension,
        horizon: a.horizon,
        startDate: dateKey(new Date()),
        targetDate: a.targetDate ?? null,
        priority: 2,
        status: 'active',
        milestones: (a.milestones ?? []).map((m) => ({ id: uid(), title: m, done: false, dueDate: null, doneAt: null })),
        financialGoalId: null,
        manualProgress: 0,
      });
      return true;
    case 'create_habit':
      st.create('habits', {
        title: a.title,
        slot: a.slot,
        dimension: a.dimension,
        days: a.days?.length ? a.days : [0, 1, 2, 3, 4, 5, 6],
        log: [],
      });
      return true;
  }
}
