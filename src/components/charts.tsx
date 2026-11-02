import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { ease } from '@/theme/motion';
import { font, usePalette } from '@/theme';

const APath = Animated.createAnimatedComponent(Path);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

/**
 * One-series line chart: a 2px straight line in the data hue, a faint zero/baseline,
 * 3 x-labels, the last point marked with its value. Draws in (stroke offset) once.
 */
export function LineChart({
  points,
  labels,
  height = 160,
  format,
}: {
  points: number[];
  labels: string[];
  height?: number;
  format: (v: number) => string;
}) {
  const p = usePalette();
  const [w, setW] = useState(0);
  const reduce = useReducedMotion();
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = 0;
    progress.value = reduce ? 1 : withTiming(1, { duration: 900, easing: ease.out });
  }, [points.join(','), reduce]); // eslint-disable-line react-hooks/exhaustive-deps

  const padL = 4;
  const padR = 8;
  const padT = 24;
  const padB = 24;
  const min = Math.min(0, ...points);
  const max = Math.max(...points, min + 1);
  const x = (i: number) => padL + (i * (w - padL - padR)) / Math.max(1, points.length - 1);
  const y = (v: number) => padT + (1 - (v - min) / (max - min)) * (height - padT - padB);
  const d = points.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  let len = 0;
  for (let i = 1; i < points.length; i++) len += Math.hypot(x(i) - x(i - 1), y(points[i]) - y(points[i - 1]));
  const ap = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - progress.value) }));
  const last = points.length - 1;
  const labelIdx = points.length <= 3 ? points.map((_, i) => i) : [0, Math.floor(last / 2), last];

  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={{ height }}
      accessibilityRole="image"
      accessibilityLabel={points.map((v, i) => `${labels[i]} ${format(v)}`).join(', ')}
    >
      {w > 0 && (
        <Svg width={w} height={height}>
          {min < 0 && <Line x1={padL} x2={w - padR} y1={y(0)} y2={y(0)} stroke={p.panelStrong} strokeWidth={1} />}
          <Line x1={padL} x2={w - padR} y1={height - padB} y2={height - padB} stroke={p.panelStrong} strokeWidth={1} />
          <APath
            d={d}
            stroke={p.accent}
            strokeWidth={2}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={`${len} ${len}`}
            animatedProps={ap}
          />
          <Circle cx={x(last)} cy={y(points[last])} r={4} fill={p.accent} />
          <SvgText
            x={Math.min(x(last), w - padR)}
            y={y(points[last]) - 10}
            fill={p.text}
            fontSize={12}
            fontFamily={font.semibold}
            textAnchor="end"
          >
            {format(points[last])}
          </SvgText>
          {labelIdx.map((i) => (
            <SvgText
              key={i}
              x={x(i)}
              y={height - 6}
              fill={p.muted}
              fontSize={11}
              fontFamily={font.regular}
              textAnchor={i === 0 ? 'start' : i === last ? 'end' : 'middle'}
            >
              {labels[i]}
            </SvgText>
          ))}
        </Svg>
      )}
    </View>
  );
}

/** Horizontal bar list: label, value, a bar at the true ratio of the largest row. */
export function BarList({ rows, format }: { rows: { label: string; value: number }[]; format: (v: number) => string }) {
  const p = usePalette();
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <View style={{ gap: 14 }}>
      {rows.map((r, i) => (
        <BarRow
          key={r.label}
          label={r.label}
          value={format(r.value)}
          ratio={r.value / max}
          color={i === 0 ? p.accent : p.faint}
          index={i}
        />
      ))}
    </View>
  );
}

function BarRow({ label, value, ratio, color, index }: { label: string; value: string; ratio: number; color: string; index: number }) {
  const p = usePalette();
  const reduce = useReducedMotion();
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = reduce ? ratio : withTiming(ratio, { duration: 600 + index * 60, easing: ease.out });
  }, [ratio, reduce, index, v]);
  const [w, setW] = useState(0);
  const ap = useAnimatedProps(() => ({ width: Math.max(4, v.value * w) }));
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Animated.Text style={{ fontFamily: font.regular, fontSize: 14, color: p.text }}>{label}</Animated.Text>
        <Animated.Text style={{ fontFamily: font.medium, fontSize: 14, color: p.text, fontVariant: ['tabular-nums'] }}>
          {value}
        </Animated.Text>
      </View>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: 6 }}>
        {w > 0 && (
          <Svg width={w} height={6}>
            <AnimatedRect x={0} y={0} height={6} rx={3} fill={color} animatedProps={ap} />
          </Svg>
        )}
      </View>
    </View>
  );
}
