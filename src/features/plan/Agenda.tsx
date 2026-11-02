import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { Icon } from '@/components/Icon';
import { Button, Empty, Panel, Press, Row, Segmented, Txt, haptic } from '@/components/ui';
import { MonthCalendar } from '@/features/pickers';
import { useLive } from '@/hooks/useData';
import { addDays, dateKey, monthGrid, parseDate, startOfDay, startOfWeek, weekDays } from '@/lib/dates';
import { capitalize, dayAbbr, durationLabel, longDate, monthShort } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { conflicts, freeMinutes, occurrences, type Occurrence } from '@/lib/recurrence';
import { useStore } from '@/store';
import { useUI } from '@/store/ui';
import { catColor, radius, space, usePalette } from '@/theme';
import { EventRow } from './EventRow';

type View3 = 'day' | 'week' | 'month';

function conflictMap(occ: Occurrence[]) {
  const map = new Map<string, string>();
  for (const [a, b] of conflicts(occ)) {
    map.set(a.event.id + a.day, b.event.title);
    map.set(b.event.id + b.day, a.event.title);
  }
  return map;
}

export function Agenda() {
  const p = usePalette();
  const { t, lang } = useT();
  const prefs = useStore((s) => s.prefs);
  const events = useLive('events');
  const [mode, setMode] = useState<View3>('day');
  const [selected, setSelected] = useState(dateKey(new Date()));
  const [month, setMonth] = useState(new Date());

  const sel = parseDate(selected);
  const ws = startOfWeek(sel, prefs.weekStartsOn);
  const wsKey = dateKey(ws);
  const weekOcc = (() => {
    const w = parseDate(wsKey);
    return occurrences(events, w, addDays(w, 7));
  })();
  const dayOcc = weekOcc.filter((o) => o.day === selected);
  const cmap = conflictMap(weekOcc);
  const free = freeMinutes(dayOcc, sel, prefs.dayStartHour, prefs.dayEndHour);

  const monthMarks = (() => {
    const grid = monthGrid(month, prefs.weekStartsOn);
    const occ = occurrences(events, grid[0], addDays(grid[41], 1));
    const marks: Record<string, string[]> = {};
    for (const o of occ) {
      const c = catColor(p, o.event.category);
      marks[o.day] = marks[o.day] ?? [];
      if (!marks[o.day].includes(c)) marks[o.day].push(c);
    }
    return marks;
  })();

  const addEvent = () => router.push(`/edit/event?date=${selected}`);
  const nConflicts = conflicts(weekOcc).length;

  return (
    <View style={{ gap: space.xl }}>
      <Segmented
        small
        value={mode}
        onChange={setMode}
        options={[
          { value: 'day', label: t('plan.day') },
          { value: 'week', label: t('plan.week') },
          { value: 'month', label: t('plan.month') },
        ]}
      />

      {mode !== 'month' && (
        <Row gap={0} style={{ justifyContent: 'space-between' }}>
          {weekDays(ws).map((d) => {
            const k = dateKey(d);
            const active = k === selected;
            const isToday = k === dateKey(new Date());
            const has = weekOcc.some((o) => o.day === k);
            return (
              <Press
                key={k}
                onPress={() => {
                  haptic('select');
                  setSelected(k);
                }}
                accessibilityLabel={longDate(d, lang)}
                accessibilityState={{ selected: active }}
                style={{
                  width: 44,
                  paddingVertical: 8,
                  borderRadius: radius.pill,
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: active ? p.primary : 'transparent',
                }}
              >
                <Txt v="meta" color={active ? p.onPrimary : p.muted}>
                  {dayAbbr(lang, d.getDay())}
                </Txt>
                <Txt v="label" num weight={isToday || active ? 'bold' : 'regular'} color={active ? p.onPrimary : p.text}>
                  {d.getDate()}
                </Txt>
                <View
                  style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: has ? (active ? p.onPrimary : p.accent) : 'transparent' }}
                />
              </Press>
            );
          })}
        </Row>
      )}

      {mode !== 'month' && (
        <Row style={{ justifyContent: 'space-between' }}>
          <IconStep icon="left" label={t('a11y.back')} onPress={() => setSelected(dateKey(addDays(sel, mode === 'week' ? -7 : -1)))} />
          <Txt v="label" muted center style={{ flex: 1 }}>
            {mode === 'day'
              ? capitalize(longDate(sel, lang))
              : `${ws.getDate()} ${monthShort(lang, ws.getMonth())} – ${addDays(ws, 6).getDate()} ${monthShort(lang, addDays(ws, 6).getMonth())}`}
          </Txt>
          <IconStep icon="right" label={t('c.continue')} onPress={() => setSelected(dateKey(addDays(sel, mode === 'week' ? 7 : 1)))} />
        </Row>
      )}

      {mode === 'day' && (
        <Animated.View key={selected} entering={FadeIn.duration(180)} style={{ gap: space.m }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt v="meta" muted num>
              {t('plan.freeTime', { t: durationLabel(free, lang) })} · {prefs.dayStartHour}:00–{prefs.dayEndHour}:00
            </Txt>
          </Row>
          {dayOcc.length ? (
            dayOcc.map((o) => <EventRow key={o.event.id + o.day} o={o} conflictWith={cmap.get(o.event.id + o.day)} />)
          ) : (
            <Panel>
              <Empty text={t('plan.noEventsDay')} action={t('plan.addEvent')} onAction={addEvent} />
            </Panel>
          )}
          {dayOcc.length > 0 && (
            <Button label={t('plan.addEvent')} kind="raised" icon="plus" compact onPress={addEvent} style={{ alignSelf: 'flex-start' }} />
          )}
        </Animated.View>
      )}

      {mode === 'week' && (
        <Animated.View key={dateKey(ws)} entering={FadeIn.duration(180)} style={{ gap: space.l }}>
          {nConflicts > 0 && (
            <Press
              onPress={() => {
                useUI.getState().setAssistantContext('plan');
                router.push('/assistant');
              }}
              style={{
                flexDirection: 'row',
                gap: space.m,
                alignItems: 'center',
                padding: space.l,
                borderRadius: radius.row,
                backgroundColor: p.negativeSoft,
              }}
            >
              <Icon name="info" size={18} color={p.negative} />
              <Txt style={{ flex: 1 }} color={p.text}>
                {t('plan.conflicts', { n: nConflicts })}
              </Txt>
              <Txt v="label" color={p.muted}>
                {t('as.ask')}
              </Txt>
            </Press>
          )}
          {weekDays(ws).map((d) => {
            const k = dateKey(d);
            const occ = weekOcc.filter((o) => o.day === k);
            const fm = freeMinutes(occ, d, prefs.dayStartHour, prefs.dayEndHour);
            const isToday = k === dateKey(new Date());
            return (
              <View key={k} style={{ gap: space.s }}>
                <Press
                  onPress={() => {
                    setSelected(k);
                    setMode('day');
                  }}
                  scaleTo={0.99}
                  style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}
                >
                  <Txt v="label" weight={isToday ? 'bold' : 'semibold'}>
                    {capitalize(longDate(d, lang))}
                  </Txt>
                  <Txt v="meta" muted num>
                    {t('plan.freeTime', { t: durationLabel(fm, lang) })}
                  </Txt>
                </Press>
                {occ.length ? (
                  occ.map((o) => <EventRow key={o.event.id + o.day} o={o} compact conflictWith={cmap.get(o.event.id + o.day)} />)
                ) : (
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: p.panel }} />
                )}
              </View>
            );
          })}
        </Animated.View>
      )}

      {mode === 'month' && (
        <Animated.View entering={FadeIn.duration(180)} layout={LinearTransition.duration(200)} style={{ gap: space.l }}>
          <Panel style={{ padding: space.m }}>
            <MonthCalendar month={month} onMonth={setMonth} selected={selected} onSelect={setSelected} marks={monthMarks} />
          </Panel>
          <Txt v="label" muted>
            {capitalize(longDate(sel, lang))}
          </Txt>
          <MonthDayList day={selected} onAdd={addEvent} />
        </Animated.View>
      )}
    </View>
  );
}

function MonthDayList({ day, onAdd }: { day: string; onAdd: () => void }) {
  const { t } = useT();
  const events = useLive('events');
  const occ = (() => {
    const dd = startOfDay(parseDate(day));
    return occurrences(events, dd, addDays(dd, 1));
  })();
  if (!occ.length)
    return (
      <Panel>
        <Empty text={t('plan.noEventsDay')} action={t('plan.addEvent')} onAction={onAdd} />
      </Panel>
    );
  return (
    <View style={{ gap: space.s }}>
      {occ.map((o) => (
        <EventRow key={o.event.id} o={o} />
      ))}
    </View>
  );
}

function IconStep({ icon, label, onPress }: { icon: 'left' | 'right'; label: string; onPress: () => void }) {
  const p = usePalette();
  return (
    <Press
      onPress={onPress}
      accessibilityLabel={label}
      hitSlop={8}
      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
    >
      <Icon name={icon} size={20} color={p.muted} />
    </Press>
  );
}
