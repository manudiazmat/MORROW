import { memo, useEffect, useMemo } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedProps, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { G, Path, Text as SvgText } from 'react-native-svg';

import { MAX_SCORE } from '@/lib/domain/lifeBalance';
import { dur, ease, spring } from '@/theme/motion';
import { font, usePalette } from '@/theme';
import { haptic } from './ui';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * Rounded annular sector ("petal") between radius r0 and r, spanning [a0, a1] (radians, 0 = top, clockwise),
 * with parallel gaps of `gap` px to its neighbours and Bézier-rounded corners.
 */
export function petalPath(
  cx: number,
  cy: number,
  r0: number,
  r: number,
  a0: number,
  a1: number,
  gap: number,
  cInner: number,
  cOuter: number,
): string {
  'worklet';
  if (r - r0 < 2) return '';
  const half = gap / 2;
  const aL = (rho: number) => a0 + Math.asin(Math.min(1, half / rho));
  const aR = (rho: number) => a1 - Math.asin(Math.min(1, half / rho));
  const px = (rho: number, a: number) => cx + rho * Math.sin(a);
  const py = (rho: number, a: number) => cy - rho * Math.cos(a);
  const l0 = aL(r0);
  const r0a = aR(r0);
  const l1 = aL(r);
  const r1a = aR(r);
  if (r0a <= l0 || r1a <= l1) return '';
  const depth = r - r0;
  const c2 = Math.max(0.5, Math.min(cOuter, depth * 0.45, (r1a - l1) * r * 0.42));
  const c1 = Math.max(0.5, Math.min(cInner, depth * 0.45, (r0a - l0) * r0 * 0.42));
  // corners
  const p1x = px(r0, l0),
    p1y = py(r0, l0);
  const p2x = px(r, l1),
    p2y = py(r, l1);
  const p3x = px(r, r1a),
    p3y = py(r, r1a);
  const p4x = px(r0, r0a),
    p4y = py(r0, r0a);
  const lenL = Math.hypot(p2x - p1x, p2y - p1y);
  const ux = (p2x - p1x) / lenL,
    uy = (p2y - p1y) / lenL;
  const lenR = Math.hypot(p4x - p3x, p4y - p3y);
  const vx = (p4x - p3x) / lenR,
    vy = (p4y - p3y) / lenR;
  const f = (n: number) => n.toFixed(2);
  return (
    `M${f(p1x + ux * c1)} ${f(p1y + uy * c1)}` +
    ` L${f(p2x - ux * c2)} ${f(p2y - uy * c2)}` +
    ` Q${f(p2x)} ${f(p2y)} ${f(px(r, l1 + c2 / r))} ${f(py(r, l1 + c2 / r))}` +
    ` A${f(r)} ${f(r)} 0 0 1 ${f(px(r, r1a - c2 / r))} ${f(py(r, r1a - c2 / r))}` +
    ` Q${f(p3x)} ${f(p3y)} ${f(p3x + vx * c2)} ${f(p3y + vy * c2)}` +
    ` L${f(p4x - vx * c1)} ${f(p4y - vy * c1)}` +
    ` Q${f(p4x)} ${f(p4y)} ${f(px(r0, r0a - c1 / r0))} ${f(py(r0, r0a - c1 / r0))}` +
    ` A${f(r0)} ${f(r0)} 0 0 0 ${f(px(r0, l0 + c1 / r0))} ${f(py(r0, l0 + c1 / r0))}` +
    ` Q${f(p1x)} ${f(p1y)} ${f(p1x + ux * c1)} ${f(p1y + uy * c1)} Z`
  );
}

export interface FlowerDatum {
  key: string;
  label: string;
  value: number | null; // 0..12
  selfOnly?: boolean;
}

interface PetalProps {
  index: number;
  n: number;
  cx: number;
  cy: number;
  r0: number;
  R: number;
  gap: number;
  datum: FlowerDatum;
  selected: boolean;
  dimmed: boolean;
  showLabels: boolean;
  compact: boolean;
  onPress?: (key: string) => void;
}

const Petal = memo(function Petal({ index, n, cx, cy, r0, R, gap, datum, selected, dimmed, showLabels, compact, onPress }: PetalProps) {
  const p = usePalette();
  const reduce = useReducedMotion();
  const step = (Math.PI * 2) / n;
  const a0 = index * step - step / 2;
  const a1 = index * step + step / 2;
  const mid = index * step;
  const target = datum.value == null ? 0 : Math.max(0, Math.min(MAX_SCORE, datum.value));

  const v = useSharedValue(0);
  const lift = useSharedValue(0);
  const op = useSharedValue(1);

  useEffect(() => {
    v.value = reduce ? target : withDelay(index * 45, withSpring(target, spring.organic));
  }, [target, index, reduce, v]);
  useEffect(() => {
    lift.value = reduce ? (selected ? 1 : 0) : withSpring(selected ? 1 : 0, spring.lift);
    op.value = withTiming(dimmed ? 0.42 : 1, { duration: dur.base, easing: ease.out });
  }, [selected, dimmed, reduce, lift, op]);

  const cIn = compact ? 4 : 8;
  const cOut = compact ? 8 : 16;
  const LIFT = compact ? 2 : 5;

  const trackProps = useAnimatedProps(() => {
    const ox = Math.sin(mid) * LIFT * lift.value;
    const oy = -Math.cos(mid) * LIFT * lift.value;
    return { d: petalPath(cx + ox, cy + oy, r0, R, a0, a1, gap, cIn, cOut), opacity: op.value };
  });
  const fillProps = useAnimatedProps(() => {
    const ox = Math.sin(mid) * LIFT * lift.value;
    const oy = -Math.cos(mid) * LIFT * lift.value;
    const rr = r0 + ((R - r0) * v.value) / MAX_SCORE;
    return { d: petalPath(cx + ox, cy + oy, r0, rr, a0, a1, gap, cIn, cOut), opacity: op.value };
  });

  // Label placement: on the track when there is room above the fill, otherwise inside the fill,
  // so a label never straddles the edge (contrast stays clean in both themes).
  const depth = R - r0;
  const fillReach = r0 + (depth * target) / MAX_SCORE;
  const room = R - fillReach;
  const onFill = target > 0 && room < 40;
  const labelR = target === 0 ? r0 + depth * 0.62 : onFill ? Math.min(fillReach - 22, r0 + depth * 0.7) : fillReach + room / 2 + 3;
  const lx = cx + Math.sin(mid) * labelR;
  const ly = cy - Math.cos(mid) * labelR;
  const ink = p.name === 'dark' ? (onFill ? p.ground : p.text) : p.text;
  const subInk = p.name === 'dark' ? (onFill ? '#3A3D36' : p.muted) : p.muted;

  return (
    <G
      onPress={
        onPress
          ? () => {
              haptic('select');
              onPress(datum.key);
            }
          : undefined
      }
    >
      <AnimatedPath animatedProps={trackProps} fill={p.petalTrack} />
      <AnimatedPath animatedProps={fillProps} fill={datum.selfOnly ? p.petalFillSelf : p.petalFill} />
      {showLabels && (
        <G opacity={dimmed ? 0.45 : 1}>
          <SvgText x={lx} y={ly - 2} fill={ink} fontSize={18} fontFamily={font.medium} textAnchor="middle">
            {datum.value == null ? '–' : String(Math.round(datum.value))}
          </SvgText>
          <SvgText x={lx} y={ly + 13} fill={subInk} fontSize={11} fontFamily={font.medium} textAnchor="middle">
            {datum.label}
          </SvgText>
        </G>
      )}
    </G>
  );
});

/**
 * The Life Balance flower. Outer petals are the maximum (12); inner petals are what's been reached.
 * Generated from data, responsive to its width, each petal selectable.
 */
export function LifeBalanceFlower({
  data,
  size,
  selected,
  onSelect,
  showLabels = true,
}: {
  data: FlowerDatum[];
  size: number;
  selected?: string | null;
  onSelect?: (key: string) => void;
  showLabels?: boolean;
}) {
  const compact = size < 180;
  const geom = useMemo(() => {
    const pad = compact ? 3 : 8;
    const R = size / 2 - pad;
    return { cx: size / 2, cy: size / 2, R, r0: R * (compact ? 0.17 : 0.14), gap: compact ? 3 : 6 };
  }, [size, compact]);
  const n = Math.max(1, data.length);
  return (
    <View
      style={{ width: size, height: size }}
      accessibilityRole="image"
      accessibilityLabel={data.map((d) => `${d.label} ${d.value == null ? '—' : Math.round(d.value)} / 12`).join(', ')}
    >
      <Svg width={size} height={size}>
        {data.map((d, i) => (
          <Petal
            key={d.key}
            index={i}
            n={n}
            {...geom}
            datum={d}
            selected={selected === d.key}
            dimmed={!!selected && selected !== d.key}
            showLabels={showLabels && !compact}
            compact={compact}
            onPress={onSelect}
          />
        ))}
      </Svg>
    </View>
  );
}
