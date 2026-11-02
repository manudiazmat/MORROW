import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { Easing, FadeInDown, FadeOut, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Sheet } from '@/components/Sheet';
import { Button, Chip, Field, IconButton, Panel, Row, Txt, haptic } from '@/components/ui';
import { confirmDestructive } from '@/lib/confirm';
import { todayKey } from '@/lib/dates';
import { useT } from '@/lib/i18n';
import { useStore } from '@/store';
import { useUI } from '@/store/ui';
import { layout, radius, space, usePalette } from '@/theme';
import type { WorkoutLog } from '@/types/models';

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** A set dot: fills with a spring when ticked. */
function SetDot({ n, done, onPress, label }: { n: number; done: boolean; onPress: () => void; label: string }) {
  const p = usePalette();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={label}
      hitSlop={4}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: done ? p.accent : p.well,
        boxShadow: done ? undefined : `inset 2px 2px 5px ${p.insetDark}, inset -2px -2px 5px ${p.insetLight}`,
      }}
    >
      {done ? (
        <Icon name="check" size={18} color={p.name === 'dark' ? p.ground : '#FBFAF7'} stroke={2} />
      ) : (
        <Txt v="label" num muted>
          {n}
        </Txt>
      )}
    </Pressable>
  );
}

/** Rest countdown: a linear bar (constant motion) and the seconds left. */
function RestBar({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const p = usePalette();
  const { t } = useT();
  const [left, setLeft] = useState(seconds);
  const w = useSharedValue(1);
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);
  useEffect(() => {
    w.set(withTiming(0, { duration: seconds * 1000, easing: Easing.linear }));
    const started = Date.now();
    const id = setInterval(() => {
      const l = Math.max(0, seconds - Math.floor((Date.now() - started) / 1000));
      setLeft(l);
      if (l === 0) {
        clearInterval(id);
        haptic('success');
        doneRef.current();
      }
    }, 250);
    return () => clearInterval(id);
  }, [seconds, w]);
  const bar = useAnimatedStyle(() => ({ transform: [{ scaleX: w.get() }] }));
  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOut.duration(140)}
      style={{ backgroundColor: p.primary, borderRadius: radius.row, padding: space.l, gap: space.s }}
    >
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt v="label" color={p.onPrimary}>
          {t('ss.rest')} ·{' '}
          <Txt v="label" num color={p.onPrimary}>
            {mmss(left)}
          </Txt>
        </Txt>
        <Pressable onPress={onDone} hitSlop={10} accessibilityRole="button">
          <Txt v="label" weight="bold" color={p.onPrimary}>
            {t('ss.skipRest')}
          </Txt>
        </Pressable>
      </Row>
      <View style={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(127,127,127,0.35)', overflow: 'hidden' }}>
        <Animated.View style={[{ height: 4, borderRadius: 2, backgroundColor: p.onPrimary, transformOrigin: 'left' }, bar]} />
      </View>
    </Animated.View>
  );
}

export default function Session() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = usePalette();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const routine = useStore((s) => s.routines.find((r) => r.id === id && !r.deletedAt));
  const create = useStore((s) => s.create);
  const toast = useUI((s) => s.showToast);
  const free = !routine;
  const [startedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState<Record<string, number>>({});
  const [weights, setWeights] = useState<Record<string, string>>(() =>
    Object.fromEntries((routine?.exercises ?? []).map((e) => [e.id, e.weightKg == null ? '' : String(e.weightKg)])),
  );
  const [rest, setRest] = useState<{ key: number; sec: number } | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [effort, setEffort] = useState<WorkoutLog['effort']>(3);
  const [notes, setNotes] = useState('');
  const [freeName, setFreeName] = useState('');
  const [freeMin, setFreeMin] = useState('45');

  useEffect(() => {
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [startedAt]);

  const totalSets = (routine?.exercises ?? []).reduce((s, e) => s + e.sets, 0);
  const doneSets = Object.values(done).reduce((a, b) => a + b, 0);

  const tick = (exId: string, idx: number, sets: number, restSec?: number | null) => {
    const cur = done[exId] ?? 0;
    const next = idx < cur ? idx : Math.min(sets, idx + 1);
    setDone((d) => ({ ...d, [exId]: next }));
    haptic(next > cur ? 'success' : 'light');
    if (next > cur && restSec) setRest((r) => ({ key: (r?.key ?? 0) + 1, sec: restSec }));
  };

  const save = () => {
    const minutes = free ? Math.max(1, Math.round(Number(freeMin.replace(',', '.')) || 0)) : Math.max(1, Math.round(elapsed / 60));
    create('workout_logs', {
      routineId: routine?.id ?? null,
      name: free ? freeName.trim() || t('ss.title') : routine!.name,
      date: todayKey(),
      durationMin: minutes,
      exercises: (routine?.exercises ?? []).map((e) => ({
        exerciseId: e.id,
        name: e.name,
        setsDone: done[e.id] ?? 0,
        setsPlanned: e.sets,
        weightKg: weights[e.id] ? Number(weights[e.id].replace(',', '.')) || null : null,
      })),
      effort,
      notes,
    });
    setFinishing(false);
    toast(t('ss.saved'));
    router.back();
  };

  const leave = async () => {
    if (doneSets > 0) {
      const ok = await confirmDestructive(t('ss.discard'), t('ss.discardBody'), t('ss.discard'), t('c.cancel'));
      if (!ok) return;
    }
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: p.ground }}>
      <View
        style={{
          paddingTop: insets.top + space.s,
          paddingHorizontal: layout.gutter,
          paddingBottom: space.m,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.m,
          width: '100%',
          maxWidth: layout.maxWidth,
          alignSelf: 'center',
        }}
      >
        <IconButton icon="close" label={t('a11y.close')} onPress={() => void leave()} />
        <View style={{ flex: 1 }}>
          <Txt v="title" numberOfLines={1}>
            {routine?.name ?? t('hl.logFree')}
          </Txt>
          {!free && (
            <Txt v="meta" muted num>
              {t('ss.elapsed')} {mmss(elapsed)} · {t('ss.done', { done: doneSets, n: totalSets })}
            </Txt>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingBottom: insets.bottom + 180,
          gap: space.l,
          width: '100%',
          maxWidth: layout.maxWidth,
          alignSelf: 'center',
        }}
      >
        {free ? (
          <View style={{ gap: space.l }}>
            <Field label={t('ed.name')} value={freeName} onChangeText={setFreeName} placeholder={t('hl.focus.cardio')} autoFocus />
            <Field label={t('ed.durationMin')} value={freeMin} onChangeText={setFreeMin} keyboardType="number-pad" />
          </View>
        ) : (
          routine!.exercises.map((e) => {
            const d = done[e.id] ?? 0;
            return (
              <Panel key={e.id} style={{ gap: space.m, opacity: d >= e.sets ? 0.75 : 1 }}>
                <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }} gap={space.m}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt v="section">{e.name}</Txt>
                    <Txt v="meta" muted num>
                      {e.sets} × {e.reps}
                      {e.restSec ? ` · ${t('ss.rest').toLowerCase()} ${e.restSec} s` : ''}
                    </Txt>
                  </View>
                  <View style={{ width: 96 }}>
                    <Field
                      value={weights[e.id] ?? ''}
                      onChangeText={(v) => setWeights((w) => ({ ...w, [e.id]: v }))}
                      keyboardType="decimal-pad"
                      placeholder="kg"
                      accessibilityLabel={`${t('ed.weight')} ${e.name}`}
                    />
                  </View>
                </Row>
                <Row gap={space.s} style={{ flexWrap: 'wrap' }}>
                  {Array.from({ length: e.sets }, (_, i) => (
                    <SetDot
                      key={i}
                      n={i + 1}
                      done={i < d}
                      label={`${e.name}, ${t('ss.set', { n: i + 1 })}`}
                      onPress={() => tick(e.id, i, e.sets, e.restSec)}
                    />
                  ))}
                </Row>
              </Panel>
            );
          })
        )}
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: Math.max(insets.bottom, 12) + 8,
          alignItems: 'center',
          paddingHorizontal: layout.gutter,
        }}
      >
        <View style={{ width: '100%', maxWidth: layout.maxWidth - layout.gutter * 2, gap: space.m }}>
          {rest && <RestBar key={rest.key} seconds={rest.sec} onDone={() => setRest(null)} />}
          <Button label={t('ss.finish')} icon="check" onPress={() => setFinishing(true)} />
        </View>
      </View>

      <Sheet open={finishing} onClose={() => setFinishing(false)}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingBottom: space.l, gap: space.l }}
        >
          <Txt v="title">{t('ss.effort')}</Txt>
          <Row gap={space.s} style={{ flexWrap: 'wrap' }}>
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <Chip key={n} label={t(`ss.effort.${n}`)} selected={effort === n} onPress={() => setEffort(n)} />
            ))}
          </Row>
          <Field label={`${t('c.notes')} (${t('c.optional')})`} value={notes} onChangeText={setNotes} multiline />
          <Button label={t('c.save')} onPress={save} />
        </ScrollView>
      </Sheet>
    </View>
  );
}
