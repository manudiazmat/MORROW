import Svg, { Path } from 'react-native-svg';

import { SYMBOL } from './brand';

/** One line icon set, 24px grid, 1.5px stroke, round caps. Drawn for MORROW. */
const paths: Record<string, string[]> = {
  home: ['M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z'],
  plan: ['M5 6.5h14a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7.5a1 1 0 0 1 1-1Z', 'M4 10.5h16', 'M8.5 4v4', 'M15.5 4v4'],
  finance: [
    'M4.5 8h13.5a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 18 19H6a1.5 1.5 0 0 1-1.5-1.5Z',
    'M4.5 8 15 4.6a1 1 0 0 1 1.3.95V8',
    'M15.5 13.5h1.5',
  ],
  goals: ['M6 20V4.5', 'M6 5h11l-2.2 3.5L17 12H6'],
  profile: ['M12 12a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z', 'M5 20c.8-3.4 3.6-5.5 7-5.5s6.2 2.1 7 5.5'],
  plus: ['M12 5v14', 'M5 12h14'],
  close: ['M6.5 6.5l11 11', 'M17.5 6.5l-11 11'],
  check: ['M5.5 12.5 10 17l8.5-9.5'],
  left: ['M14.5 6 8.5 12l6 6'],
  right: ['M9.5 6l6 6-6 6'],
  down: ['M6 9.5l6 6 6-6'],
  up: ['M6 14.5l6-6 6 6'],
  send: ['M12 19V5.5', 'M6.5 11 12 5.5l5.5 5.5'],
  trash: ['M5 7h14', 'M9.5 7V5h5v2', 'M6.8 7l.9 12h8.6l.9-12', 'M10.5 10.5v5.5', 'M13.5 10.5v5.5'],
  edit: ['M14.5 5.5l4 4L9 19H5v-4z', 'M12.5 7.5l4 4'],
  clock: ['M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z', 'M12 8v4.5l3 1.8'],
  pin: ['M12 20s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z', 'M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z'],
  repeat: ['M5 11V9.5A2.5 2.5 0 0 1 7.5 7H18', 'M15.5 4.5 18 7l-2.5 2.5', 'M19 13v1.5a2.5 2.5 0 0 1-2.5 2.5H6', 'M8.5 19.5 6 17l2.5-2.5'],
  bell: ['M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.5H5z', 'M10.3 20.5h3.4'],
  more: ['M6 12h.01', 'M12 12h.01', 'M18 12h.01'],
  leaf: ['M5.5 18.5C5.5 10 10 5.5 18.5 5.5c0 8.5-4.5 13-13 13Z', 'M5.5 18.5 13 11'],
  idea: ['M9.5 17.5h5', 'M10.5 20.5h3', 'M12 3.5a5.5 5.5 0 0 0-3.2 10c.5.4.7 1 .7 1.6v.4h5v-.4c0-.6.3-1.2.7-1.6A5.5 5.5 0 0 0 12 3.5Z'],
  sun: [
    'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
    'M12 3v1.5',
    'M12 19.5V21',
    'M3 12h1.5',
    'M19.5 12H21',
    'M5.6 5.6l1.1 1.1',
    'M17.3 17.3l1.1 1.1',
    'M5.6 18.4l1.1-1.1',
    'M17.3 6.7l1.1-1.1',
  ],
  moon: ['M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z'],
  day: ['M4 16h16', 'M7.5 16a4.5 4.5 0 0 1 9 0', 'M12 7.5V9', 'M6 10l1 1', 'M18 10l-1 1'],
  export: ['M12 4v11', 'M7.5 8.5 12 4l4.5 4.5', 'M5 14v4.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V14'],
  cloud: ['M7 18h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7 11a3.5 3.5 0 0 0 0 7Z'],
  refresh: ['M19 12a7 7 0 1 1-2.05-4.95', 'M19 5v3.5h-3.5'],
  info: ['M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z', 'M12 11v5', 'M12 8h.01'],
  sliders: ['M5 8h9', 'M18 8h1', 'M5 16h1', 'M10 16h9', 'M16 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z', 'M8 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z'],
  history: ['M4.5 12a7.5 7.5 0 1 0 2.2-5.3', 'M4.5 4.5v3.7h3.7', 'M12 8.5V12l2.5 1.5'],
  lock: ['M6.5 11h11v8.5h-11z', 'M8.5 11V8.5a3.5 3.5 0 0 1 7 0V11'],
  flag: ['M6 20V4.5', 'M6 5h11l-2.2 3.5L17 12H6'],
  list: ['M9 7h10', 'M9 12h10', 'M9 17h10', 'M5 7h.01', 'M5 12h.01', 'M5 17h.01'],
  coin: [
    'M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z',
    'M14.5 9.3c-.5-.8-1.4-1.3-2.5-1.3-1.4 0-2.5.8-2.5 2s1.1 1.7 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2c-1.1 0-2-.5-2.5-1.3',
    'M12 6.5v1.5',
    'M12 16v1.5',
  ],
  arrowUp: ['M7 17 17 7', 'M9 7h8v8'],
  arrowDown: ['M7 7l10 10', 'M17 9v8H9'],
  globe: ['M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z', 'M4 12h16', 'M12 4c2.2 2.2 3.2 5 3.2 8s-1 5.8-3.2 8c-2.2-2.2-3.2-5-3.2-8s1-5.8 3.2-8Z'],
  dumbbell: ['M3.5 12h17', 'M6.5 8v8', 'M17.5 8v8', 'M4.5 9.5v5', 'M19.5 9.5v5', 'M8.8 10v4', 'M15.2 10v4'],
  bowl: ['M4 11.5h16a8 8 0 0 1-16 0Z', 'M9 19.5h6', 'M9.5 8.5c0-1.5 1-2 1-3.5', 'M13.5 8.5c0-1.5 1-2 1-3.5'],
  image: [
    'M5 5.5h14a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1Z',
    'M4.5 15.5l4.5-4.5 4 4 2.5-2.5 4 4',
    'M15.5 9.5h.01',
  ],
  camera: [
    'M4.5 8h3l1.5-2h6l1.5 2h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z',
    'M12 16.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  ],
  play: ['M8 5.5v13l10.5-6.5Z'],
  timer: ['M12 20.5a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z', 'M12 9v4l2.5 1.5', 'M10 3h4'],
  flower: [
    'M12 12m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0',
    'M12 10V4.5',
    'M12 14v5.5',
    'M10 12H4.5',
    'M14 12h5.5',
    'M10.6 10.6 6.7 6.7',
    'M13.4 13.4l3.9 3.9',
    'M13.4 10.6l3.9-3.9',
    'M10.6 13.4l-3.9 3.9',
  ],
};

export type IconName = keyof typeof paths | 'mark';

export function Icon({ name, size = 20, color, stroke = 1.5 }: { name: IconName; size?: number; color: string; stroke?: number }) {
  if (name === 'mark') return <Mark size={size} color={color} />;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {paths[name].map((d, i) => (
        <Path key={i} d={d} stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </Svg>
  );
}

/**
 * The MORROW symbol: one day split in two — today (the solid upper half) over tomorrow
 * (the lower half, still open, in ink outline). Works alone, at 16px and at app-icon size.
 */
/** The app symbol: the double-arch "m" from the app icon. `size` is its width; it sits in a square box so it lines up with icons. */
export function Mark({ size = 24, color }: { size?: number; color: string }) {
  const { x, y, w, h, d } = SYMBOL;
  return (
    <Svg width={size} height={size} viewBox={`${x} ${y - (w - h) / 2} ${w} ${w}`}>
      <Path d={d} fill={color} fillRule="evenodd" />
    </Svg>
  );
}
