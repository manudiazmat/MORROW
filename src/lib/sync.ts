import { AppState } from 'react-native';

import { useStore, type Collections } from '@/store';
import { useUI } from '@/store/ui';
import type { Entity, SyncTable } from '@/types/models';
import { nowISO } from './dates';
import { supabase } from './supabase';

/**
 * Local-first sync.
 * - Every local write goes to the store immediately and to an outbox (table + id).
 * - Push: rows in the outbox are upserted by id (UUIDs generated on device, so no duplicates).
 * - Pull: rows changed on the server since the last pull (server-side `server_updated_at`)
 *   are merged with last-write-wins on `updatedAt`. Deletes are soft (`deleted_at`).
 * - Runs on sign-in, on app foreground, and a few seconds after local changes.
 */

const TABLES: SyncTable[] = [
  'financial_goals',
  'personal_goals',
  'subscriptions',
  'tasks',
  'events',
  'habits',
  'leisure_items',
  'ideas',
  'transactions',
  'budgets',
  'assistant_conversations',
  'recipes',
  'routines',
  'workout_logs',
  'diets',
  'rewards',
  'reward_entries',
];

const snake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const camel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
const TS_FIELDS = new Set(['createdAt', 'updatedAt', 'deletedAt', 'completedAt', 'redeemedAt']);

export function toRow(e: Entity, userId: string): Record<string, unknown> {
  const row: Record<string, unknown> = { user_id: userId };
  for (const [k, v] of Object.entries(e)) row[snake(k)] = v === undefined ? null : v;
  return row;
}

export function fromRow(row: Record<string, unknown>): Entity {
  const e: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === 'user_id' || k === 'server_updated_at') continue;
    const ck = camel(k);
    e[ck] = TS_FIELDS.has(ck) && typeof v === 'string' ? new Date(v).toISOString() : v;
  }
  return e as unknown as Entity;
}

let running = false;
let timer: ReturnType<typeof setTimeout> | null = null;

export async function syncNow(): Promise<void> {
  const s = useStore.getState();
  const ui = useUI.getState();
  if (!supabase || s.user.mode !== 'cloud' || !s.user.id || running) return;
  running = true;
  ui.setSync({ status: 'syncing', message: undefined });
  try {
    const userId = s.user.id;
    // push
    const outbox = [...s.outbox];
    for (const table of TABLES) {
      const items = outbox.filter((o) => o.table === table);
      if (!items.length) continue;
      const rows = (s[table] as Entity[]).filter((e) => items.some((i) => i.id === e.id)).map((e) => toRow(e, userId));
      if (rows.length) {
        const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
        if (error) throw error;
      }
      useStore.getState().clearOutbox(items);
    }
    await pushSettings(userId);
    // pull
    const since = useStore.getState().lastPulledAt ?? '1970-01-01T00:00:00Z';
    let newest = since;
    for (const table of TABLES) {
      const { data, error } = await supabase.from(table).select('*').gt('server_updated_at', since).limit(5000);
      if (error) throw error;
      if (data?.length) {
        useStore.getState().mergeRemote(table, data.map(fromRow) as Collections[typeof table]);
        for (const r of data) if ((r.server_updated_at as string) > newest) newest = r.server_updated_at as string;
      }
    }
    useStore.getState().setLastPulledAt(newest);
    ui.setSync({ status: 'idle', lastSyncAt: nowISO() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
    ui.setSync({ status: /network|fetch/i.test(msg) ? 'offline' : 'error', message: msg });
  } finally {
    running = false;
  }
}

/** Settings-shaped data (preferences, Life Balance, reviews) is small: pushed whole. */
async function pushSettings(userId: string) {
  if (!supabase) return;
  const s = useStore.getState();
  const { error } = await supabase
    .from('user_preferences')
    .upsert({ user_id: userId, prefs: s.prefs, finance: s.finance, updated_at: nowISO() }, { onConflict: 'user_id' });
  if (error) throw error;
  const dims = s.dimensions.map((d) => {
    const sc = s.scores.find((x) => x.key === d.key);
    return {
      user_id: userId,
      key: d.key,
      label: d.label ?? null,
      priority: d.priority,
      enabled: d.enabled,
      self_score: sc?.self ?? null,
      rated_at: sc?.ratedAt ?? null,
    };
  });
  const r1 = await supabase.from('life_balance_dimensions').upsert(dims, { onConflict: 'user_id,key' });
  if (r1.error) throw r1.error;
  if (s.snapshots.length) {
    const r2 = await supabase.from('life_balance_snapshots').upsert(
      s.snapshots.map((x) => ({ user_id: userId, month: x.month, taken_at: x.takenAt, values: x.values })),
      { onConflict: 'user_id,month' },
    );
    if (r2.error) throw r2.error;
  }
  if (s.reviews.length) {
    const r3 = await supabase.from('weekly_reviews').upsert(
      s.reviews.map((x) => ({ user_id: userId, week_start: x.weekStart, data: x })),
      { onConflict: 'user_id,week_start' },
    );
    if (r3.error) throw r3.error;
  }
}

/** First sign-in on a device: bring settings down when this device has none of its own. */
export async function pullSettings(userId: string) {
  if (!supabase) return;
  const s = useStore.getState();
  const { data: pref } = await supabase.from('user_preferences').select('*').eq('user_id', userId).maybeSingle();
  if (pref && !s.prefs.name) useStore.setState({ prefs: { ...s.prefs, ...(pref.prefs as object) }, finance: pref.finance });
  const { data: dims } = await supabase.from('life_balance_dimensions').select('*').eq('user_id', userId);
  if (dims?.length && !s.scores.some((x) => x.ratedAt)) {
    useStore.setState({
      dimensions: s.dimensions.map((d) => {
        const r = dims.find((x) => x.key === d.key);
        return r ? { ...d, label: r.label, priority: r.priority, enabled: r.enabled } : d;
      }),
      scores: s.scores.map((sc) => {
        const r = dims.find((x) => x.key === sc.key);
        return r ? { ...sc, self: r.self_score, ratedAt: r.rated_at } : sc;
      }),
    });
  }
  const { data: snaps } = await supabase.from('life_balance_snapshots').select('*').eq('user_id', userId);
  for (const x of snaps ?? []) {
    if (!useStore.getState().snapshots.some((y) => y.month === x.month))
      useStore.getState().upsertSnapshot({ month: x.month, takenAt: x.taken_at, values: x.values });
  }
  const { data: revs } = await supabase.from('weekly_reviews').select('*').eq('user_id', userId);
  for (const x of revs ?? [])
    if (!useStore.getState().reviews.some((y) => y.weekStart === x.week_start)) useStore.getState().saveReview(x.data);
}

/** Debounced sync after local changes + on foreground. Returns an unsubscribe. */
export function startSyncLoop(): () => void {
  if (!supabase) return () => {};
  const unsubStore = useStore.subscribe((st, prev) => {
    if (st.outbox.length && st.outbox !== prev.outbox) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void syncNow(), 3000);
    }
  });
  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'active') void syncNow();
  });
  void syncNow();
  return () => {
    unsubStore();
    sub.remove();
  };
}
