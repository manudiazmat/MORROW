/**
 * MORROW design tokens.
 * Light and dark are authored separately (dark is not an inversion of light).
 * Depth rule: only interactive elements are raised (soft dual shadow) or sunken (inset well).
 * Content panels are flat tone steps.
 */

export type ThemeName = 'light' | 'dark';

export interface Palette {
  name: ThemeName;
  ground: string; // screen background
  panel: string; // tonal panel, one step off ground
  panelStrong: string; // second step (selected rows, tracks)
  well: string; // sunken inputs
  raised: string; // raised controls (same family as ground)
  text: string;
  muted: string; // secondary text ≥ 4.5:1 on ground and panel
  faint: string; // icons, non-text marks only
  primary: string; // near-black (light) / ivory (dark) fill for the one primary action
  onPrimary: string;
  accent: string; // the one data hue (sage family)
  accentSoft: string;
  accentInk: string; // text on accentSoft
  positive: string;
  negative: string;
  negativeSoft: string;
  petalTrack: string; // outer petal (max)
  petalFill: string; // inner petal (achieved)
  petalFillSelf: string; // achieved, self-rated only
  scrim: string;
  shadowDark: string;
  shadowLight: string;
  insetDark: string;
  insetLight: string;
  statusBar: 'dark' | 'light';
}

export const light: Palette = {
  name: 'light',
  ground: '#F2F0EA', // Ivory
  panel: '#E9E6DE',
  panelStrong: '#E1DDD2',
  well: '#E6E2D9', // Sand
  raised: '#F2F0EA',
  text: '#373A35', // Ink
  muted: '#5F635A',
  faint: '#858A7D', // Olive
  primary: '#373A35',
  onPrimary: '#F2F0EA',
  accent: '#6E7A5B',
  accentSoft: '#C5C9B8', // Sage
  accentInk: '#2F3529',
  positive: '#4E6B45',
  negative: '#8E3F45',
  negativeSoft: '#EAD9D6',
  petalTrack: '#E2DED4',
  petalFill: '#C5C9B8',
  petalFillSelf: '#D6D8CB',
  scrim: 'rgba(42,44,40,0.32)',
  shadowDark: 'rgba(120,116,100,0.26)',
  shadowLight: 'rgba(255,255,255,0.92)',
  insetDark: 'rgba(120,116,100,0.22)',
  insetLight: 'rgba(255,255,255,0.85)',
  statusBar: 'dark',
};

export const dark: Palette = {
  name: 'dark',
  ground: '#20211F',
  panel: '#292B28',
  panelStrong: '#30332F',
  well: '#1B1C1A',
  raised: '#2A2C29',
  text: '#F0EEE8',
  muted: '#AAA99F',
  faint: '#7F8974',
  primary: '#F0EEE8',
  onPrimary: '#20211F',
  accent: '#AEB69D',
  accentSoft: '#3A3F35',
  accentInk: '#DDE2CF',
  positive: '#9DBB8E',
  negative: '#D4918C',
  negativeSoft: '#3A2A29',
  petalTrack: '#30332F',
  petalFill: '#AEB69D',
  petalFillSelf: '#7F8974',
  scrim: 'rgba(0,0,0,0.5)',
  shadowDark: 'rgba(0,0,0,0.5)',
  shadowLight: 'rgba(255,255,255,0.045)',
  insetDark: 'rgba(0,0,0,0.55)',
  insetLight: 'rgba(255,255,255,0.04)',
  statusBar: 'light',
};

/** Type scale (taste app scale 12/14/16/20/26, one display moment at 34 for the flower score). */
export const font = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
};

export const size = {
  meta: 12,
  body: 14,
  bodyL: 16,
  title: 20,
  h1: 26,
  figure: 30,
  display: 34,
};

export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 20, xxl: 28, section: 32 };

/** Soft radius family, chosen once: panels 22, controls 14 / pill, chips pill. */
export const radius = { panel: 22, row: 16, control: 14, pill: 999 };

export const layout = { gutter: 20, tabBarHeight: 64, tabBarBottom: 12, maxWidth: 640 };

export function raisedShadow(p: Palette, strength: 1 | 2 = 1) {
  const d = strength === 1 ? 6 : 10;
  return `${-d * 0.66}px ${-d * 0.66}px ${d * 1.6}px ${p.shadowLight}, ${d * 0.8}px ${d}px ${d * 2.2}px ${p.shadowDark}`;
}

export function insetShadow(p: Palette) {
  return `inset 3px 3px 6px ${p.insetDark}, inset -3px -3px 6px ${p.insetLight}`;
}

/** Stable identity tints for plan categories (dots and calendar bars only, never text). */
const catLight = { work: '#7D8B99', sport: '#6F8F6A', learning: '#A08A5C', personal: '#8E8478', social: '#A27D72', leisure: '#5F8C88' };
const catDark = { work: '#9AA8B5', sport: '#93B08D', learning: '#C2AB7C', personal: '#B2A89C', social: '#C49D92', leisure: '#86B0AB' };
export function catColor(p: Palette, cat: keyof typeof catLight): string {
  return (p.name === 'dark' ? catDark : catLight)[cat];
}

/**
 * Accent presets. Only the accent family changes (data marks, checks, toggles, petals, the logo's half);
 * grounds, panels, text and the near-black primary stay fixed in each mode.
 * Every pair was checked: accent ≥ 3:1 on ground and panel, check-mark ink ≥ 4.5:1 on the accent,
 * accentInk ≥ 4.5:1 on accentSoft, petal labels ≥ 4.5:1 on the fill.
 */
type AccentSet = Pick<Palette, 'accent' | 'accentSoft' | 'accentInk' | 'petalFill' | 'petalFillSelf'>;
const set = (accent: string, accentSoft: string, accentInk: string, petalFill: string, petalFillSelf: string): AccentSet => ({
  accent,
  accentSoft,
  accentInk,
  petalFill,
  petalFillSelf,
});

export const ACCENTS: Record<string, { light: AccentSet; dark: AccentSet }> = {
  sage: {
    light: set('#6E7A5B', '#C5C9B8', '#2F3529', '#C5C9B8', '#D6D8CB'),
    dark: set('#AEB69D', '#3A3F35', '#DDE2CF', '#AEB69D', '#7F8974'),
  },
  ocean: {
    light: set('#3F6F7C', '#C2D3D6', '#1F3940', '#BCCFD3', '#D3DFE1'),
    dark: set('#8EB6C1', '#2D3D41', '#D3E5EA', '#8EB6C1', '#5F7F88'),
  },
  blue: {
    light: set('#45649A', '#C9D2E3', '#222F48', '#C3CDE0', '#D7DDEA'),
    dark: set('#9DB2D9', '#2F3646', '#DBE3F3', '#9DB2D9', '#66789C'),
  },
  lavender: {
    light: set('#76668F', '#D3CCDF', '#352C44', '#CEC6DC', '#DDD8E6'),
    dark: set('#B6A8CC', '#383343', '#E7E0F1', '#B6A8CC', '#7F7393'),
  },
  rose: {
    light: set('#9A5A6C', '#E3CCD2', '#47252F', '#DDC4CB', '#E7D7DB'),
    dark: set('#D7A4B2', '#41313A', '#F3DDE3', '#D7A4B2', '#99707C'),
  },
  clay: {
    light: set('#9A5E46', '#E3CDC2', '#45271B', '#DCC3B7', '#E7D6CE'),
    dark: set('#D2A089', '#41332D', '#F2DED4', '#D2A089', '#977060'),
  },
  amber: {
    light: set('#8A6A22', '#E3D6B6', '#3D2F0E', '#DCCDA6', '#E6DCC3'),
    dark: set('#D2B26B', '#403A2B', '#F1E5C7', '#D2B26B', '#977F4A'),
  },
  graphite: {
    light: set('#5B5F58', '#D2D2CC', '#2A2C28', '#CBCBC4', '#DCDCD6'),
    dark: set('#B5B5AD', '#363834', '#E8E8E2', '#B5B5AD', '#7E7F78'),
  },
};

export const ACCENT_ORDER = ['sage', 'ocean', 'blue', 'lavender', 'rose', 'clay', 'amber', 'graphite'] as const;

export function withAccent(base: Palette, accent: string | undefined): Palette {
  const a = ACCENTS[accent ?? 'sage'] ?? ACCENTS.sage;
  return { ...base, ...(base.name === 'dark' ? a.dark : a.light) };
}
