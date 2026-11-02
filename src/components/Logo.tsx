import { Text, View } from 'react-native';

import { font, usePalette } from '@/theme';
import { Mark } from './Icon';

/** Wordmark: MORROW in Manrope semibold, opened tracking; the symbol can stand alone. */
export function Wordmark({ size = 20, withMark = true }: { size?: number; withMark?: boolean }) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.45 }} accessibilityRole="header" accessibilityLabel="MORROW">
      {withMark && <Mark size={size * 1.25} color={p.text} accent={p.accent} />}
      <Text style={{ fontFamily: font.semibold, fontSize: size, letterSpacing: size * 0.22, color: p.text }}>MORROW</Text>
    </View>
  );
}
