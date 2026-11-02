import * as Haptics from 'expo-haptics';
import { forwardRef, useEffect, useState, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
  type LayoutChangeEvent,
  type TextInputInstance,
  type ViewInstance,
} from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { dur, ease, PRESS_SCALE, spring } from '@/theme/motion';
import { font, insetShadow, radius, raisedShadow, size, space, usePalette } from '@/theme';
import { Icon, type IconName } from './Icon';

export function haptic(kind: 'light' | 'select' | 'success' = 'light') {
  if (Platform.OS === 'web') return;
  if (kind === 'select') Haptics.selectionAsync().catch(() => {});
  else if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/* ------------------------------------------------------------------ Text */

type Variant = 'h1' | 'title' | 'section' | 'body' | 'bodyL' | 'meta' | 'figure' | 'display' | 'label';

const variantStyle: Record<Variant, TextStyle> = {
  display: { fontFamily: font.regular, fontSize: size.display, lineHeight: 40, letterSpacing: -0.8 },
  h1: { fontFamily: font.medium, fontSize: size.h1, lineHeight: 33, letterSpacing: -0.5 },
  figure: { fontFamily: font.regular, fontSize: size.figure, lineHeight: 36, letterSpacing: -0.6 },
  title: { fontFamily: font.semibold, fontSize: size.title, lineHeight: 26, letterSpacing: -0.2 },
  section: { fontFamily: font.semibold, fontSize: size.bodyL, lineHeight: 22 },
  bodyL: { fontFamily: font.regular, fontSize: size.bodyL, lineHeight: 24 },
  body: { fontFamily: font.regular, fontSize: size.body, lineHeight: 20 },
  label: { fontFamily: font.medium, fontSize: size.body, lineHeight: 20 },
  meta: { fontFamily: font.regular, fontSize: size.meta, lineHeight: 16 },
};

export function Txt({
  v = 'body',
  muted,
  color,
  num,
  style,
  children,
  numberOfLines,
  center,
  weight,
  accessibilityRole,
}: {
  v?: Variant;
  muted?: boolean;
  color?: string;
  num?: boolean;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
  numberOfLines?: number;
  center?: boolean;
  weight?: keyof typeof font;
  accessibilityRole?: 'header' | 'text';
}) {
  const p = usePalette();
  return (
    <Text
      numberOfLines={numberOfLines}
      accessibilityRole={accessibilityRole ?? (v === 'h1' || v === 'title' || v === 'section' ? 'header' : undefined)}
      aria-level={v === 'h1' ? 1 : v === 'title' ? 2 : v === 'section' ? 3 : undefined}
      maxFontSizeMultiplier={1.6}
      style={[
        variantStyle[v],
        { color: color ?? (muted ? p.muted : p.text) },
        num && { fontVariant: ['tabular-nums'] },
        center && { textAlign: 'center' },
        weight && { fontFamily: font[weight] },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/* ----------------------------------------------------------------- Press */

const APressable = Animated.createAnimatedComponent(Pressable);

/** Pressable with a 0.97 press scale (ease-out in 120ms, release in 220ms). */
export const Press = forwardRef<ViewInstance, PressableProps & { style?: StyleProp<ViewStyle>; scaleTo?: number; haptics?: boolean }>(
  function Press({ style, scaleTo = PRESS_SCALE, onPressIn, onPressOut, onPress, haptics, ...rest }, ref) {
    const s = useSharedValue(1);
    const reduce = useReducedMotion();
    const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
    return (
      <APressable
        ref={ref}
        accessibilityRole="button"
        {...rest}
        onPress={(e) => {
          if (haptics) haptic('select');
          onPress?.(e);
        }}
        onPressIn={(e) => {
          if (!reduce) s.set(withTiming(scaleTo, { duration: dur.press, easing: ease.out }));
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          s.set(withTiming(1, { duration: dur.release, easing: ease.out }));
          onPressOut?.(e);
        }}
        style={[style, a]}
      />
    );
  },
);

/* --------------------------------------------------------------- Surfaces */

/** Flat tonal panel (content). No shadow: tone step only. */
export function Panel({
  children,
  style,
  tone = 'panel',
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'panel' | 'strong' | 'ground';
}) {
  const p = usePalette();
  const bg = tone === 'panel' ? p.panel : tone === 'strong' ? p.panelStrong : p.ground;
  return <View style={[{ backgroundColor: bg, borderRadius: radius.panel, padding: space.xl }, style]}>{children}</View>;
}

/** Pressable panel that opens a detail. */
export function PanelLink({
  children,
  onPress,
  style,
  label,
}: {
  children: ReactNode;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  label: string;
}) {
  const p = usePalette();
  return (
    <Press
      onPress={onPress}
      scaleTo={0.985}
      accessibilityLabel={label}
      style={[{ backgroundColor: p.panel, borderRadius: radius.panel, padding: space.xl }, style]}
    >
      {children}
    </Press>
  );
}

/* ---------------------------------------------------------------- Buttons */

export function Button({
  label,
  onPress,
  kind = 'primary',
  icon,
  disabled,
  style,
  compact,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'raised' | 'ghost' | 'danger';
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
  accessibilityLabel?: string;
}) {
  const p = usePalette();
  const bg = kind === 'primary' ? p.primary : kind === 'raised' ? p.raised : 'transparent';
  const fg = kind === 'primary' ? p.onPrimary : kind === 'danger' ? p.negative : p.text;
  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      style={[
        {
          height: compact ? 40 : 50,
          paddingHorizontal: compact ? space.l : space.xl,
          borderRadius: radius.pill,
          backgroundColor: bg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: space.s,
          opacity: disabled ? 0.45 : 1,
        },
        kind === 'raised' && { boxShadow: raisedShadow(p) },
        kind === 'primary' && { boxShadow: raisedShadow(p) },
        style,
      ]}
    >
      {icon && <Icon name={icon} size={18} color={fg} />}
      <Txt v="label" color={fg}>
        {label}
      </Txt>
    </Press>
  );
}

/** Round raised icon button (44pt target). */
export function IconButton({
  icon,
  onPress,
  label,
  size: s = 44,
  flat,
  color,
  style,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  size?: number;
  flat?: boolean;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const p = usePalette();
  return (
    <Press
      onPress={onPress}
      accessibilityLabel={label}
      hitSlop={6}
      style={[
        {
          width: s,
          height: s,
          borderRadius: s / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: flat ? 'transparent' : p.raised,
        },
        !flat && { boxShadow: raisedShadow(p) },
        style,
      ]}
    >
      <Icon name={icon} size={20} color={color ?? p.text} />
    </Press>
  );
}

/* ------------------------------------------------------------- Segmented */

/** Segmented control: the thumb is a raised pill that springs between options. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  style,
  small,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const p = usePalette();
  const [w, setW] = useState(0);
  const idx = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const x = useSharedValue(0);
  const reduce = useReducedMotion();
  const seg = w / options.length;
  useEffect(() => {
    x.value = reduce ? idx * seg : withSpring(idx * seg, spring.snap);
  }, [idx, seg, reduce, x]);
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const h = small ? 38 : 44;
  return (
    <View
      accessibilityRole="tablist"
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width - 8)}
      style={[
        { height: h + 8, borderRadius: radius.pill, backgroundColor: p.well, padding: 4, flexDirection: 'row', boxShadow: insetShadow(p) },
        style,
      ]}
    >
      {w > 0 && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 4,
              left: 4,
              width: seg,
              height: h,
              borderRadius: radius.pill,
              backgroundColor: p.raised,
              boxShadow: raisedShadow(p),
            },
            thumb,
          ]}
        />
      )}
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (!active) haptic('select');
              onChange(o.value);
            }}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <Txt v={small ? 'meta' : 'label'} color={active ? p.text : p.muted} weight={active ? 'semibold' : 'medium'} numberOfLines={1}>
              {o.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------------------------------------------------------------- Toggle */

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  const p = usePalette();
  const t = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    t.value = withSpring(value ? 1 : 0, spring.snap);
  }, [value, t]);
  const track = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(t.value, [0, 1], [p.well, p.accent]) }));
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: t.value * 20 }] }));
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => {
        haptic('select');
        onChange(!value);
      }}
      hitSlop={10}
    >
      <Animated.View style={[{ width: 50, height: 30, borderRadius: 15, padding: 3, boxShadow: insetShadow(p) }, track]}>
        <Animated.View
          style={[
            {
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: p.name === 'dark' ? p.text : '#FBFAF7',
              boxShadow: '0px 2px 5px rgba(0,0,0,0.18)',
            },
            knob,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ Chip */

export function Chip({ label, selected, onPress, icon }: { label: string; selected?: boolean; onPress: () => void; icon?: IconName }) {
  const p = usePalette();
  return (
    <Press
      onPress={() => {
        haptic('select');
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={{
        minHeight: 38,
        paddingHorizontal: 14,
        borderRadius: radius.pill,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: selected ? p.primary : p.raised,
        boxShadow: selected ? undefined : raisedShadow(p),
      }}
    >
      {icon && <Icon name={icon} size={16} color={selected ? p.onPrimary : p.muted} />}
      <Txt v="label" color={selected ? p.onPrimary : p.text}>
        {label}
      </Txt>
    </Press>
  );
}

export function ChipRow({ children, wrap }: { children: ReactNode; wrap?: boolean }) {
  if (wrap) return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s }}>{children}</View>;
  return (
    <Animated.ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: space.s, paddingVertical: 8, paddingHorizontal: 2 }}
      style={{ marginVertical: -8, overflow: 'visible' }}
    >
      {children}
    </Animated.ScrollView>
  );
}

/* ----------------------------------------------------------------- Field */

/** Inset well input, like the reference fields. */
export const Field = forwardRef<
  TextInputInstance,
  TextInputProps & { label?: string; hint?: string; error?: string | null; prefix?: string; large?: boolean }
>(function Field({ label, hint, error, style, prefix, large, ...rest }, ref) {
  const p = usePalette();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      {label && (
        <Txt v="label" muted>
          {label}
        </Txt>
      )}
      <View
        style={{
          minHeight: large ? 64 : 52,
          borderRadius: radius.control + 4,
          backgroundColor: p.well,
          boxShadow: insetShadow(p),
          paddingHorizontal: space.l,
          flexDirection: 'row',
          alignItems: rest.multiline ? 'flex-start' : 'center',
          outlineColor: focused ? p.accent : 'transparent',
          outlineWidth: focused ? 1.5 : 0,
          outlineStyle: 'solid',
        }}
      >
        {prefix && (
          <Txt v={large ? 'figure' : 'bodyL'} muted style={{ marginRight: 6 }}>
            {prefix}
          </Txt>
        )}
        <TextInput
          ref={ref}
          placeholderTextColor={p.muted}
          selectionColor={p.accent}
          cursorColor={p.text}
          maxFontSizeMultiplier={1.5}
          accessibilityLabel={label ?? rest.placeholder}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          {...rest}
          style={[
            {
              flex: 1,
              color: p.text,
              fontFamily: large ? font.regular : font.regular,
              fontSize: large ? size.figure : size.bodyL,
              paddingVertical: rest.multiline ? 14 : 0,
              minHeight: rest.multiline ? 88 : undefined,
              textAlignVertical: rest.multiline ? 'top' : 'center',
              outlineStyle: 'none',
              fontVariant: large ? ['tabular-nums'] : undefined,
            } as unknown as TextStyle,
            style,
          ]}
        />
      </View>
      {error ? (
        <Txt v="meta" color={p.negative} accessibilityRole="text">
          {error}
        </Txt>
      ) : hint ? (
        <Txt v="meta" muted>
          {hint}
        </Txt>
      ) : null}
    </View>
  );
});

/* -------------------------------------------------------------- Progress */

export function Progress({ value, color, track, height = 8 }: { value: number; color?: string; track?: string; height?: number }) {
  const p = usePalette();
  const [w, setW] = useState(0);
  const v = useSharedValue(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    const target = Math.max(0, Math.min(1, value));
    v.value = reduce ? target : withSpring(target, spring.organic);
  }, [value, v, reduce]);
  const bar = useAnimatedStyle(() => ({ transform: [{ translateX: -w + v.value * w }] }));
  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      style={{ height, borderRadius: height / 2, backgroundColor: track ?? p.panelStrong, overflow: 'hidden' }}
    >
      <Animated.View style={[{ height, width: '100%', borderRadius: height / 2, backgroundColor: color ?? p.accent }, bar]} />
    </View>
  );
}

/* --------------------------------------------------------------- Checkbox */

export function Check({ done, onPress, label }: { done: boolean; onPress: () => void; label: string }) {
  const p = usePalette();
  const t = useSharedValue(done ? 1 : 0);
  useEffect(() => {
    t.value = withSpring(done ? 1 : 0, spring.lift);
  }, [done, t]);
  const fill = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ scale: 0.6 + 0.4 * t.value }],
  }));
  return (
    <Pressable
      onPress={() => {
        haptic(done ? 'light' : 'success');
        onPress();
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={label}
      hitSlop={12}
      style={{
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: p.well,
        boxShadow: insetShadow(p),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: 13, backgroundColor: p.accent, alignItems: 'center', justifyContent: 'center' },
          fill,
        ]}
      >
        <Icon name="check" size={16} color={p.name === 'dark' ? p.ground : '#FBFAF7'} stroke={2} />
      </Animated.View>
    </Pressable>
  );
}

/* --------------------------------------------------------- Layout helpers */

export function SectionHead({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 28 }}>
      <Txt v="section">{title}</Txt>
      {action && onAction && (
        <Pressable onPress={onAction} hitSlop={12} accessibilityRole="button">
          <Txt v="label" color={p.muted}>
            {action}
          </Txt>
        </Pressable>
      )}
    </View>
  );
}

/** Empty state: keeps the frame, one sentence, and the first action. */
export function Empty({ text, action, onAction, icon }: { text: string; action?: string; onAction?: () => void; icon?: IconName }) {
  const p = usePalette();
  return (
    <View style={{ gap: space.m, alignItems: 'flex-start', paddingVertical: space.s }}>
      <View style={{ flexDirection: 'row', gap: space.m, alignItems: 'flex-start' }}>
        {icon && <Icon name={icon} size={18} color={p.faint} />}
        <Txt muted style={{ flex: 1 }}>
          {text}
        </Txt>
      </View>
      {action && onAction && <Button label={action} onPress={onAction} kind="raised" compact icon="plus" />}
    </View>
  );
}

export function Row({ children, style, gap = space.m }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Gap({ h = space.l }: { h?: number }) {
  return <View style={{ height: h }} />;
}

/** Small category dot: identity tint, not data. */
export function Dot({ color, size: s = 8 }: { color: string; size?: number }) {
  return <View style={{ width: s, height: s, borderRadius: s / 2, backgroundColor: color }} />;
}
