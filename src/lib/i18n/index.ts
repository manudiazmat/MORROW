import { useCallback } from 'react';

import { useStore } from '@/store';
import type { Language } from '@/types/models';
import { en } from './en';
import { es, type Dict } from './es';

export type TKey = keyof Dict;
const dicts: Record<Language, Dict> = { es, en };

export function translate(lang: Language, key: TKey | string, params?: Record<string, string | number>): string {
  const d = dicts[lang] as Record<string, string>;
  let s = d[key] ?? (es as Record<string, string>)[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

export function useT() {
  const lang = useStore((s) => s.prefs.language);
  const t = useCallback((key: TKey | string, params?: Record<string, string | number>) => translate(lang, key, params), [lang]);
  return { t, lang };
}
