import { Easing } from 'react-native-reanimated';

/**
 * Motion system (Emil Kowalski principles):
 * - UI motion stays under 300ms; enter uses strong ease-out, on-screen moves use ease-in-out.
 * - Springs for anything interruptible or gesture-driven (nav pill, petals, sheets).
 * - Nothing animates from scale(0); presses scale to 0.97.
 * - Exits are faster than entrances.
 * - Reduce Motion keeps opacity, drops travel.
 */
export const ease = {
  out: Easing.bezier(0.23, 1, 0.32, 1),
  inOut: Easing.bezier(0.77, 0, 0.175, 1),
  drawer: Easing.bezier(0.32, 0.72, 0, 1),
  hover: Easing.bezier(0.25, 0.1, 0.25, 1),
};

export const dur = {
  press: 120,
  release: 220,
  fast: 160,
  base: 220,
  sheetIn: 380,
  sheetOut: 220,
  stagger: 45,
};

/** Spring presets (duration/dampingRatio form keeps them easy to reason about). */
export const spring = {
  /** nav pill, segmented thumbs: crisp, no visible overshoot */
  snap: { duration: 420, dampingRatio: 0.86 },
  /** petals growing, progress fills: organic, a hair of bounce */
  organic: { duration: 700, dampingRatio: 0.72 },
  /** selection lift */
  lift: { duration: 380, dampingRatio: 0.7 },
  /** sheet settle after a drag */
  sheet: { duration: 420, dampingRatio: 0.9 },
};

export const PRESS_SCALE = 0.97;
