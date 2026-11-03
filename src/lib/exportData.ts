import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { useStore } from '@/store';
import { dateKey } from './dates';

/** Everything the person has logged, as one JSON file (GDPR-style portability). */
export function buildExport() {
  const s = useStore.getState();
  return {
    app: 'morrow',
    version: 1,
    exportedAt: new Date().toISOString(),
    prefs: s.prefs,
    finance: s.finance,
    tasks: s.tasks,
    events: s.events,
    habits: s.habits,
    leisure_items: s.leisure_items,
    ideas: s.ideas,
    transactions: s.transactions,
    budgets: s.budgets,
    subscriptions: s.subscriptions,
    financial_goals: s.financial_goals,
    personal_goals: s.personal_goals,
    rewards: { rewards: s.rewards, ledger: s.reward_entries },
    health: { routines: s.routines, workout_logs: s.workout_logs, recipes: s.recipes, diets: s.diets },
    life_balance: { dimensions: s.dimensions, scores: s.scores, snapshots: s.snapshots },
    weekly_reviews: s.reviews,
    assistant: { conversations: s.assistant_conversations, messages: s.messages },
  };
}

export async function exportData(): Promise<void> {
  const json = JSON.stringify(buildExport(), null, 2);
  const name = `morrow-${dateKey(new Date())}.json`;
  if (Platform.OS === 'web') {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(json);
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: name });
}
