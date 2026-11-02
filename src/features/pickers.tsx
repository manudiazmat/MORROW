import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View, type ScrollViewInstance } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { Icon } from '@/components/Icon';
import { Chip, IconButton, Press, Row, Txt, haptic } from '@/components/ui';
import { addDays, addMonths, dateKey, monthGrid, monthKey, parseDate, startOfMonth } from '@/lib/dates';
import { capitalize, dayInitial, longDate, monthLabel } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { useStore } from '@/store';
import { insetShadow, radius, space, usePalette } from '@/theme';

/** Month grid. `marks` maps date keys to up to 3 dot colours. */
export function MonthCalendar({
  month,
  onMonth,
  selected,
  onSelect,
  marks,
}: {
  month: Date;
  onMonth: (d: Date) => void;
  selected: string | null;
  onSelect: (key: string) => void;
  marks?: Record<string, string[]>;
}) {
  const p = usePalette();
  const { t, lang } = useT();
  const ws = useStore((s) => s.prefs.weekStartsOn);
  const days = monthGrid(month, ws);
  const today = dateKey(new Date());
  const m = month.getMonth();
  return (
    <View style={{ gap: space.m }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt v="section">{monthLabel(monthKey(month), lang)}</Txt>
        <Row gap={space.s}>
          <IconButton icon="left" flat label={t('a11y.back')} onPress={() => onMonth(addMonths(startOfMonth(month), -1))} size={40} />
          <IconButton icon="right" flat label={t('c.continue')} onPress={() => onMonth(addMonths(startOfMonth(month), 1))} size={40} />
        </Row>
      </Row>
      <View style={{ flexDirection: 'row' }}>
        {Array.from({ length: 7 }, (_, i) => (
          <Txt key={i} v="meta" muted center style={{ flex: 1 }}>
            {dayInitial(lang, (i + ws) % 7)}
          </Txt>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {days.map((d) => {
          const k = dateKey(d);
          const inMonth = d.getMonth() === m;
          const sel = k === selected;
          const isToday = k === today;
          return (
            <Pressable
              key={k}
              onPress={() => {
                haptic('select');
                onSelect(k);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: sel }}
              accessibilityLabel={longDate(d, lang)}
              style={{ width: `${100 / 7}%`, height: 46, alignItems: 'center', justifyContent: 'center' }}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: sel ? p.primary : 'transparent',
                }}
              >
                <Txt
                  num
                  v="label"
                  weight={isToday || sel ? 'bold' : 'regular'}
                  color={sel ? p.onPrimary : inMonth ? p.text : p.muted}
                  style={{ opacity: inMonth ? 1 : 0.55 }}
                >
                  {d.getDate()}
                </Txt>
                <View style={{ position: 'absolute', bottom: 4, flexDirection: 'row', gap: 2 }}>
                  {(marks?.[k] ?? []).slice(0, 3).map((c, i) => (
                    <View key={i} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: sel ? p.onPrimary : c }} />
                  ))}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** A labelled date value that expands an inline calendar. */
export function DateField({
  label,
  value,
  onChange,
  allowEmpty,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  allowEmpty?: boolean;
}) {
  const p = usePalette();
  const { t, lang } = useT();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => (value ? parseDate(value) : new Date()));
  const today = dateKey(new Date());
  const tomorrow = dateKey(addDays(new Date(), 1));
  return (
    <Animated.View layout={LinearTransition.duration(220)} style={{ gap: space.s }}>
      <Txt v="label" muted>
        {label}
      </Txt>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: space.s, paddingVertical: 8, paddingHorizontal: 2 }}
        style={{ marginVertical: -8 }}
      >
        <Chip label={t('c.today')} selected={value === today} onPress={() => onChange(today)} />
        <Chip label={t('c.tomorrow')} selected={value === tomorrow} onPress={() => onChange(tomorrow)} />
        <Chip
          label={value && value !== today && value !== tomorrow ? capitalize(longDate(parseDate(value), lang)) : t('c.date') + '…'}
          selected={!!value && value !== today && value !== tomorrow}
          icon="plan"
          onPress={() => setOpen((o) => !o)}
        />
        {allowEmpty && <Chip label={t('ed.noDue')} selected={!value} onPress={() => onChange(null)} />}
      </ScrollView>
      {open && (
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(120)}
          style={{ backgroundColor: p.panel, borderRadius: radius.panel, padding: space.m }}
        >
          <MonthCalendar
            month={month}
            onMonth={setMonth}
            selected={value ?? null}
            onSelect={(k) => {
              onChange(k);
              setOpen(false);
            }}
          />
        </Animated.View>
      )}
    </Animated.View>
  );
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];
const pad = (n: number) => String(n).padStart(2, '0');

/** Time as two rows of chips: hours, then quarter hours. Scrolls the chosen hour into view. */
export function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const p = usePalette();
  const [h, m] = value.split(':').map(Number);
  const ref = useRef<ScrollViewInstance>(null);
  useEffect(() => {
    const id = setTimeout(() => ref.current?.scrollTo({ x: Math.max(0, h * 52 - 80), animated: false }), 50);
    return () => clearTimeout(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={{ gap: space.s }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt v="label" muted>
          {label}
        </Txt>
        <Txt v="section" num>
          {pad(h)}:{pad(m)}
        </Txt>
      </Row>
      <View style={{ backgroundColor: p.well, borderRadius: radius.control + 4, boxShadow: insetShadow(p), paddingVertical: 6, gap: 2 }}>
        <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 6, gap: 4 }}>
          {HOURS.map((hh) => (
            <TimeCell key={hh} label={pad(hh)} selected={hh === h} onPress={() => onChange(`${pad(hh)}:${pad(m)}`)} />
          ))}
        </ScrollView>
        <Row gap={4} style={{ paddingHorizontal: 6 }}>
          {MINUTES.map((mm) => (
            <TimeCell key={mm} label={`:${pad(mm)}`} selected={mm === m} onPress={() => onChange(`${pad(h)}:${pad(mm)}`)} flex />
          ))}
        </Row>
      </View>
    </View>
  );
}

function TimeCell({ label, selected, onPress, flex }: { label: string; selected: boolean; onPress: () => void; flex?: boolean }) {
  const p = usePalette();
  return (
    <Press
      onPress={() => {
        haptic('select');
        onPress();
      }}
      accessibilityState={{ selected }}
      style={[
        {
          height: 40,
          minWidth: 48,
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: selected ? p.primary : 'transparent',
        },
        flex && { flex: 1 },
      ]}
    >
      <Txt num v="label" color={selected ? p.onPrimary : p.text}>
        {label}
      </Txt>
    </Press>
  );
}

/** Generic single-choice chips. */
export function ChoiceField<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string; color?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={{ gap: space.s }}>
      <Txt v="label" muted>
        {label}
      </Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s }}>
        {options.map((o) => (
          <Chip key={String(o.value)} label={o.label} selected={o.value === value} onPress={() => onChange(o.value)} />
        ))}
      </View>
    </View>
  );
}

export function Disclosure({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) {
  const p = usePalette();
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      hitSlop={10}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
    >
      <Txt v="label" color={p.muted}>
        {label}
      </Txt>
      <Icon name={open ? 'up' : 'down'} size={16} color={p.muted} />
    </Pressable>
  );
}
