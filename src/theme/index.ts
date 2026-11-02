import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { useStore } from '@/store';
import { dark, light, withAccent, type Palette } from './tokens';

export * from './tokens';

export function usePalette(): Palette {
  const pref = useStore((s) => s.prefs.theme);
  const accent = useStore((s) => s.prefs.accent);
  const system = useColorScheme();
  const mode = pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;
  return useMemo(() => withAccent(mode === 'dark' ? dark : light, accent), [mode, accent]);
}
