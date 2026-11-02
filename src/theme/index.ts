import { useColorScheme } from 'react-native';

import { useStore } from '@/store';
import { dark, light, type Palette } from './tokens';

export * from './tokens';

export function usePalette(): Palette {
  const pref = useStore((s) => s.prefs.theme);
  const system = useColorScheme();
  const mode = pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;
  return mode === 'dark' ? dark : light;
}
