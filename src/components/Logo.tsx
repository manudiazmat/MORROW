import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { usePalette } from '@/theme';
import { WORDMARK } from './brand';

/** The "morrow" wordmark. `size` is the letter height; ink follows the theme so it works on ivory and on charcoal. */
export function Wordmark({ size = 20, color }: { size?: number; color?: string }) {
  const p = usePalette();
  const { x, y, w, h, d } = WORDMARK;
  return (
    <View accessible accessibilityRole="header" accessibilityLabel="morrow">
      <Svg width={(size * w) / h} height={size} viewBox={`${x} ${y} ${w} ${h}`}>
        <Path d={d} fill={color ?? p.text} fillRule="evenodd" />
      </Svg>
    </View>
  );
}
