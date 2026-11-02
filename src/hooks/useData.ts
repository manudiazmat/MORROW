import { useMemo } from 'react';

import { computeAll, overall } from '@/lib/domain/lifeBalance';
import { balanceInput } from '@/lib/domain/review';
import { useT } from '@/lib/i18n';
import { live, useStore, type Collections } from '@/store';
import type { DimensionKey, DimensionResult } from '@/types/models';

export function useLive<K extends keyof Collections>(table: K): Collections[K] {
  const rows = useStore((s) => s[table]);
  return useMemo(() => live(rows as never) as Collections[K], [rows]);
}

/** Life Balance results for all dimensions (live, recomputed when any input changes). */
export function useLifeBalance() {
  const s = useStore();
  const { t } = useT();
  const all = useMemo(
    () =>
      computeAll(
        s.dimensions.map((d) => d.key),
        balanceInput(s),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      s.tasks,
      s.events,
      s.habits,
      s.transactions,
      s.budgets,
      s.personal_goals,
      s.financial_goals,
      s.leisure_items,
      s.scores,
      s.dimensions,
      s.prefs.weeklySportTarget,
      s.prefs.weekStartsOn,
    ],
  );
  const enabled = s.dimensions.filter((d) => d.enabled);
  const results = enabled.map((d) => all.find((r) => r.key === d.key)!).filter(Boolean);
  const label = (k: DimensionKey) => s.dimensions.find((d) => d.key === k)?.label || t(`dim.${k}`);
  const shortLabel = (k: DimensionKey) => s.dimensions.find((d) => d.key === k)?.label || t(`dims.${k}`);
  return { all, results, overall: overall(results), label, shortLabel, dimensions: s.dimensions };
}

export function flowerData(results: DimensionResult[], shortLabel: (k: DimensionKey) => string) {
  return results.map((r) => ({
    key: r.key,
    label: shortLabel(r.key),
    value: r.combined,
    selfOnly: r.data == null && r.self != null,
  }));
}
