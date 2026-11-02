import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { Icon } from '@/components/Icon';
import { Sheet } from '@/components/Sheet';
import { Chip, Field, IconButton, Panel, Press, Row, Toggle, Txt } from '@/components/ui';
import { useLive } from '@/hooks/useData';
import { addDays, dateKey, dateTimeKey, parseDateTime, startOfDay } from '@/lib/dates';
import { MEALS } from '@/lib/domain/health';
import { dayInitial } from '@/lib/format';
import { uid } from '@/lib/id';
import { cameraAvailable, deleteImage, pickImages, type ImageSource } from '@/lib/images';
import { useT } from '@/lib/i18n';
import { useStore } from '@/store';
import { useUI } from '@/store/ui';
import { layout, radius, space, usePalette } from '@/theme';
import type { DietWeek, Exercise, Ingredient, MealItem, MealType, WorkoutFocus } from '@/types/models';
import { ChoiceField, TimeField } from '../pickers';
import { ImageGrid, Thumb } from '../health/images';
import { EditorScaffold } from './Scaffold';

const spring = LinearTransition.springify().damping(20).stiffness(220);
const FOCUS: WorkoutFocus[] = ['strength', 'cardio', 'mobility', 'mixed'];
const num = (v: string) => {
  const n = Number(v.replace(',', '.'));
  return v.trim() === '' || !isFinite(n) ? null : n;
};
const str = (n: number | null | undefined) => (n == null ? '' : String(n));

/* ---------------------------------------------------------------- Routine */

export function RoutineEditor({ id }: { id?: string }) {
  const { t, lang } = useT();
  const p = usePalette();
  const existing = useStore((s) => s.routines.find((x) => x.id === id));
  const wsPref = useStore((s) => s.prefs.weekStartsOn);
  const st = useStore();
  const [name, setName] = useState(existing?.name ?? '');
  const [focus, setFocus] = useState<WorkoutFocus>(existing?.focus ?? 'strength');
  const [days, setDays] = useState<number[]>(existing?.days ?? []);
  const [duration, setDuration] = useState(str(existing?.durationMin ?? 60));
  const [schedule, setSchedule] = useState(existing ? existing.eventIds.length > 0 : true);
  const [time, setTime] = useState(existing?.time ?? '19:00');
  const [exercises, setExercises] = useState<Exercise[]>(existing?.exercises ?? []);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [error, setError] = useState<string | null>(null);

  const patchEx = (exId: string, patch: Partial<Exercise>) =>
    setExercises((all) => all.map((e) => (e.id === exId ? { ...e, ...patch } : e)));

  const save = () => {
    if (!name.trim()) {
      setError(t('c.required'));
      return false;
    }
    const dur = Math.max(10, Math.round(num(duration) ?? 60));
    const clean = exercises
      .filter((e) => e.name.trim())
      .map((e) => ({ ...e, name: e.name.trim(), sets: Math.max(1, Math.round(e.sets || 1)) }));
    // calendar: replace this routine's weekly events
    for (const evId of existing?.eventIds ?? []) st.remove('events', evId);
    const eventIds: string[] = [];
    if (schedule && days.length) {
      for (const d of days) {
        let first = startOfDay(new Date());
        while (first.getDay() !== d) first = addDays(first, 1);
        const start = parseDateTime(`${dateKey(first)}T${time}`);
        const end = new Date(start.getTime() + dur * 60000);
        const ev = st.create('events', {
          title: name.trim(),
          category: 'sport',
          start: dateTimeKey(start),
          end: dateKey(end) === dateKey(start) ? dateTimeKey(end) : `${dateKey(start)}T23:59`,
          allDay: false,
          location: '',
          notes: '',
          recurrence: 'weekly',
          reminderMinutes: null,
          goalId: null,
          exceptions: [],
        });
        eventIds.push(ev.id);
      }
    }
    const data = { name: name.trim(), focus, days, time: schedule ? time : null, durationMin: dur, exercises: clean, notes, eventIds };
    if (existing) st.update('routines', existing.id, data);
    else st.create('routines', data);
  };

  return (
    <EditorScaffold
      title={existing ? t('ed.editRoutine') : t('ed.newRoutine')}
      onSave={save}
      onDelete={
        existing
          ? () => {
              for (const evId of existing.eventIds) st.remove('events', evId);
              st.remove('routines', existing.id);
            }
          : undefined
      }
      deleteName={existing?.name}
    >
      <Field
        label={t('ed.name')}
        value={name}
        onChangeText={(v) => {
          setName(v);
          setError(null);
        }}
        error={error}
        autoFocus={!existing}
        placeholder={t('ed.routinePh')}
      />
      <ChoiceField
        label={t('ed.focus')}
        value={focus}
        onChange={setFocus}
        options={FOCUS.map((f) => ({ value: f, label: t(`hl.focus.${f}`) }))}
      />
      <View style={{ gap: space.s }}>
        <Txt v="label" muted>
          {t('ed.days')}
        </Txt>
        <Row gap={space.s} style={{ flexWrap: 'wrap' }}>
          {Array.from({ length: 7 }, (_, i) => (i + wsPref) % 7).map((d) => (
            <Chip
              key={d}
              label={dayInitial(lang, d)}
              selected={days.includes(d)}
              onPress={() => setDays((x) => (x.includes(d) ? x.filter((y) => y !== d) : [...x, d]))}
            />
          ))}
        </Row>
      </View>
      <Field label={t('ed.durationMin')} value={duration} onChangeText={setDuration} keyboardType="number-pad" />
      <Row style={{ justifyContent: 'space-between' }} gap={space.l}>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt v="label">{t('ed.schedule')}</Txt>
          <Txt v="meta" muted>
            {t('ed.scheduleSub')}
          </Txt>
        </View>
        <Toggle value={schedule} onChange={setSchedule} label={t('ed.schedule')} />
      </Row>
      {schedule && (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
          <TimeField label={t('c.time')} value={time} onChange={setTime} />
        </Animated.View>
      )}

      <View style={{ gap: space.m }}>
        <Txt v="section">{t('ed.exercises')}</Txt>
        <Animated.View layout={spring} style={{ gap: space.m }}>
          {exercises.map((e, i) => (
            <Animated.View key={e.id} entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)} layout={spring}>
              <Panel style={{ gap: space.m, padding: space.l }}>
                <Row gap={space.s}>
                  <Txt v="meta" muted num style={{ width: 18 }}>
                    {i + 1}
                  </Txt>
                  <View style={{ flex: 1 }}>
                    <Field placeholder={t('ed.exerciseName')} value={e.name} onChangeText={(v) => patchEx(e.id, { name: v })} />
                  </View>
                  <IconButton
                    icon="close"
                    flat
                    size={40}
                    color={p.muted}
                    label={t('c.delete')}
                    onPress={() => setExercises((all) => all.filter((x) => x.id !== e.id))}
                  />
                </Row>
                <Row gap={space.s}>
                  <View style={{ flex: 1 }}>
                    <Field
                      label={t('ed.sets')}
                      value={str(e.sets)}
                      onChangeText={(v) => patchEx(e.id, { sets: num(v) ?? 0 })}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label={t('ed.reps')} value={e.reps} onChangeText={(v) => patchEx(e.id, { reps: v })} placeholder="8-12" />
                  </View>
                </Row>
                <Row gap={space.s}>
                  <View style={{ flex: 1 }}>
                    <Field
                      label={t('ed.weight')}
                      value={str(e.weightKg)}
                      onChangeText={(v) => patchEx(e.id, { weightKg: num(v) })}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field
                      label={t('ed.restSec')}
                      value={str(e.restSec)}
                      onChangeText={(v) => patchEx(e.id, { restSec: num(v) })}
                      keyboardType="number-pad"
                    />
                  </View>
                </Row>
              </Panel>
            </Animated.View>
          ))}
        </Animated.View>
        <Press
          onPress={() => setExercises((all) => [...all, { id: uid(), name: '', sets: 3, reps: '10', weightKg: null, restSec: 90 }])}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            minHeight: 48,
            paddingHorizontal: space.l,
            borderRadius: radius.pill,
            backgroundColor: p.panel,
            alignSelf: 'flex-start',
          }}
        >
          <Icon name="plus" size={18} color={p.text} />
          <Txt v="label">{t('ed.addExercise')}</Txt>
        </Press>
      </View>
      <Field label={`${t('c.notes')} (${t('c.optional')})`} value={notes} onChangeText={setNotes} multiline />
    </EditorScaffold>
  );
}

/* ----------------------------------------------------------------- Recipe */

export function RecipeEditor({ id, meal }: { id?: string; meal?: MealType }) {
  const { t } = useT();
  const p = usePalette();
  const existing = useStore((s) => s.recipes.find((x) => x.id === id));
  const st = useStore();
  const toast = useUI((s) => s.showToast);
  const [name, setName] = useState(existing?.name ?? '');
  const [mealType, setMealType] = useState<MealType>(existing?.mealType ?? meal ?? 'lunch');
  const [servings, setServings] = useState(str(existing?.servings ?? 2));
  const [prep, setPrep] = useState(str(existing?.prepMin));
  const [image, setImage] = useState<string | null>(existing?.image ?? null);
  const [ingredients, setIngredients] = useState<Ingredient[]>(existing?.ingredients ?? []);
  const [steps, setSteps] = useState<{ id: string; text: string }[]>((existing?.steps ?? []).map((text) => ({ id: uid(), text })));
  const [kcal, setKcal] = useState(str(existing?.kcal));
  const [protein, setProtein] = useState(str(existing?.proteinG));
  const [carbs, setCarbs] = useState(str(existing?.carbsG));
  const [fat, setFat] = useState(str(existing?.fatG));
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (source: ImageSource) => {
    if (busy) return;
    setBusy(true);
    try {
      const [uri] = await pickImages(source);
      if (uri) {
        if (image && image !== existing?.image) deleteImage(image);
        setImage(uri);
      }
    } catch (e) {
      toast(e instanceof Error && e.message === 'camera-denied' ? t('ed.cameraDenied') : t('ed.imageError'));
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    if (!name.trim()) {
      setError(t('c.required'));
      return false;
    }
    if (existing?.image && existing.image !== image) deleteImage(existing.image);
    const data = {
      name: name.trim(),
      mealType,
      servings: Math.max(1, Math.round(num(servings) ?? 1)),
      prepMin: num(prep),
      image,
      ingredients: ingredients.filter((i) => i.name.trim()),
      steps: steps.map((s) => s.text.trim()).filter(Boolean),
      kcal: num(kcal),
      proteinG: num(protein),
      carbsG: num(carbs),
      fatG: num(fat),
      notes,
    };
    if (existing) st.update('recipes', existing.id, data);
    else st.create('recipes', data);
  };

  return (
    <EditorScaffold
      title={existing ? t('ed.editRecipe') : t('ed.newRecipe')}
      onSave={save}
      onDelete={
        existing
          ? () => {
              if (existing.image) deleteImage(existing.image);
              st.remove('recipes', existing.id);
            }
          : undefined
      }
      deleteName={existing?.name}
    >
      <View style={{ gap: space.m }}>
        <Thumb uri={image} icon="bowl" style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: radius.panel }} />
        <Row gap={space.s} style={{ flexWrap: 'wrap' }}>
          <Chip label={image ? t('ed.changePhoto') : t('ed.addPhoto')} icon="image" onPress={() => void pick('library')} />
          {cameraAvailable && <Chip label={t('ed.takePhoto')} icon="camera" onPress={() => void pick('camera')} />}
          {image && <Chip label={t('ed.removePhoto')} onPress={() => setImage(null)} />}
        </Row>
      </View>
      <Field
        label={t('ed.name')}
        value={name}
        onChangeText={(v) => {
          setName(v);
          setError(null);
        }}
        error={error}
        autoFocus={!existing}
        placeholder={t('ed.recipePh')}
      />
      <ChoiceField
        label={t('ed.mealType')}
        value={mealType}
        onChange={setMealType}
        options={MEALS.map((m) => ({ value: m, label: t(`meal.${m}`) }))}
      />
      <Row gap={space.s}>
        <View style={{ flex: 1 }}>
          <Field label={t('rc.servings')} value={servings} onChangeText={setServings} keyboardType="number-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label={`${t('ed.durationMin')}`} value={prep} onChangeText={setPrep} keyboardType="number-pad" />
        </View>
      </Row>

      <View style={{ gap: space.s }}>
        <Txt v="section">{t('rc.ingredients')}</Txt>
        <Animated.View layout={spring} style={{ gap: space.s }}>
          {ingredients.map((ing) => (
            <Animated.View
              key={ing.id}
              entering={FadeIn.duration(160)}
              exiting={FadeOut.duration(120)}
              layout={spring}
              style={{ flexDirection: 'row', gap: space.s, alignItems: 'center' }}
            >
              <View style={{ flex: 2 }}>
                <Field
                  placeholder={t('ed.ingredientPh')}
                  value={ing.name}
                  onChangeText={(v) => setIngredients((all) => all.map((x) => (x.id === ing.id ? { ...x, name: v } : x)))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  placeholder={t('ed.qtyPh')}
                  value={ing.quantity}
                  onChangeText={(v) => setIngredients((all) => all.map((x) => (x.id === ing.id ? { ...x, quantity: v } : x)))}
                />
              </View>
              <IconButton
                icon="close"
                flat
                size={40}
                color={p.muted}
                label={t('c.delete')}
                onPress={() => setIngredients((all) => all.filter((x) => x.id !== ing.id))}
              />
            </Animated.View>
          ))}
        </Animated.View>
        <AddRow label={t('ed.addIngredient')} onPress={() => setIngredients((all) => [...all, { id: uid(), name: '', quantity: '' }])} />
      </View>

      <View style={{ gap: space.s }}>
        <Txt v="section">{t('rc.steps')}</Txt>
        <Animated.View layout={spring} style={{ gap: space.s }}>
          {steps.map((s, i) => (
            <Animated.View
              key={s.id}
              entering={FadeIn.duration(160)}
              exiting={FadeOut.duration(120)}
              layout={spring}
              style={{ flexDirection: 'row', gap: space.s, alignItems: 'flex-start' }}
            >
              <Txt v="label" muted num style={{ width: 18, paddingTop: 16 }}>
                {i + 1}
              </Txt>
              <View style={{ flex: 1 }}>
                <Field
                  placeholder={t('ed.stepPh')}
                  value={s.text}
                  multiline
                  onChangeText={(v) => setSteps((all) => all.map((x) => (x.id === s.id ? { ...x, text: v } : x)))}
                />
              </View>
              <IconButton
                icon="close"
                flat
                size={40}
                color={p.muted}
                label={t('c.delete')}
                onPress={() => setSteps((all) => all.filter((x) => x.id !== s.id))}
              />
            </Animated.View>
          ))}
        </Animated.View>
        <AddRow label={t('ed.addStep')} onPress={() => setSteps((all) => [...all, { id: uid(), text: '' }])} />
      </View>

      <View style={{ gap: space.s }}>
        <Txt v="section">{t('ed.nutrition')}</Txt>
        <Row gap={space.s}>
          <View style={{ flex: 1 }}>
            <Field label={t('rc.kcal')} value={kcal} onChangeText={setKcal} keyboardType="number-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label={`${t('rc.protein')} (g)`} value={protein} onChangeText={setProtein} keyboardType="decimal-pad" />
          </View>
        </Row>
        <Row gap={space.s}>
          <View style={{ flex: 1 }}>
            <Field label={`${t('rc.carbs')} (g)`} value={carbs} onChangeText={setCarbs} keyboardType="decimal-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label={`${t('rc.fat')} (g)`} value={fat} onChangeText={setFat} keyboardType="decimal-pad" />
          </View>
        </Row>
      </View>
      <Field label={`${t('c.notes')} (${t('c.optional')})`} value={notes} onChangeText={setNotes} multiline />
    </EditorScaffold>
  );
}

function AddRow({ label, onPress }: { label: string; onPress: () => void }) {
  const p = usePalette();
  return (
    <Press
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, alignSelf: 'flex-start', paddingHorizontal: 4 }}
    >
      <Icon name="plus" size={18} color={p.muted} />
      <Txt v="label" color={p.muted}>
        {label}
      </Txt>
    </Press>
  );
}

/* ------------------------------------------------------------------- Diet */

export function DietEditor({ id }: { id?: string }) {
  const { t, lang } = useT();
  const p = usePalette();
  const existing = useStore((s) => s.diets.find((x) => x.id === id));
  const anyActive = useStore((s) => s.diets.some((d) => !d.deletedAt && d.active));
  const wsPref = useStore((s) => s.prefs.weekStartsOn);
  const recipes = useLive('recipes');
  const st = useStore();
  const toast = useUI((s) => s.showToast);
  const [name, setName] = useState(existing?.name ?? '');
  const [goal, setGoal] = useState(existing?.goal ?? '');
  const [kcal, setKcal] = useState(str(existing?.kcalTarget));
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [week, setWeek] = useState<DietWeek>(existing?.week ?? {});
  const [images, setImages] = useState<string[]>(existing?.images ?? []);
  const [active, setActive] = useState(existing?.active ?? !anyActive);
  const [day, setDay] = useState(new Date().getDay());
  const [drafts, setDrafts] = useState<Partial<Record<MealType, string>>>({});
  const [picking, setPicking] = useState<MealType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dayMeals = week[String(day)] ?? {};
  const setMeals = (meal: MealType, items: MealItem[]) =>
    setWeek((w) => ({ ...w, [String(day)]: { ...(w[String(day)] ?? {}), [meal]: items } }));
  const addText = (meal: MealType) => {
    const text = (drafts[meal] ?? '').trim();
    if (!text) return;
    setMeals(meal, [...(dayMeals[meal] ?? []), { id: uid(), text }]);
    setDrafts((d) => ({ ...d, [meal]: '' }));
  };

  const save = () => {
    if (!name.trim()) {
      setError(t('c.required'));
      return false;
    }
    for (const uri of existing?.images ?? []) if (!images.includes(uri)) deleteImage(uri);
    const data = { name: name.trim(), goal, kcalTarget: num(kcal), notes, week, images, active, log: existing?.log ?? [] };
    let savedId = existing?.id;
    if (existing) st.update('diets', existing.id, data);
    else savedId = st.create('diets', data).id;
    if (active && savedId) st.setActiveDiet(savedId);
  };

  return (
    <EditorScaffold
      title={existing ? t('ed.editDiet') : t('ed.newDiet')}
      onSave={save}
      onDelete={
        existing
          ? () => {
              for (const uri of existing.images) deleteImage(uri);
              st.remove('diets', existing.id);
            }
          : undefined
      }
      deleteName={existing?.name}
    >
      <Field
        label={t('ed.name')}
        value={name}
        onChangeText={(v) => {
          setName(v);
          setError(null);
        }}
        error={error}
        autoFocus={!existing}
        placeholder={t('ed.dietPh')}
      />
      <Field label={`${t('ed.dietGoal')} (${t('c.optional')})`} value={goal} onChangeText={setGoal} />
      <Field label={t('ed.kcal')} value={kcal} onChangeText={setKcal} keyboardType="number-pad" />
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt v="label">{t('hl.activeDiet')}</Txt>
        <Toggle value={active} onChange={setActive} label={t('hl.activeDiet')} />
      </Row>

      <View style={{ gap: space.m }}>
        <Txt v="section">{t('ed.week')}</Txt>
        <Row gap={0} style={{ justifyContent: 'space-between' }}>
          {Array.from({ length: 7 }, (_, i) => (i + wsPref) % 7).map((d) => {
            const on = d === day;
            const has = MEALS.some((m) => week[String(d)]?.[m]?.length);
            return (
              <Pressable
                key={d}
                onPress={() => setDay(d)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={{
                  width: 44,
                  height: 52,
                  borderRadius: radius.pill,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  backgroundColor: on ? p.primary : 'transparent',
                }}
              >
                <Txt v="label" color={on ? p.onPrimary : p.text} weight={on ? 'bold' : 'regular'}>
                  {dayInitial(lang, d)}
                </Txt>
                <View
                  style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: has ? (on ? p.onPrimary : p.accent) : 'transparent' }}
                />
              </Pressable>
            );
          })}
        </Row>
        <Animated.View key={day} entering={FadeIn.duration(160)} style={{ gap: space.m }}>
          {MEALS.map((m) => (
            <Panel key={m} style={{ gap: space.s, padding: space.l }}>
              <Txt v="label">{t(`meal.${m}`)}</Txt>
              {(dayMeals[m] ?? []).map((item) => {
                const rc = item.recipeId ? recipes.find((r) => r.id === item.recipeId) : undefined;
                return (
                  <Animated.View
                    key={item.id}
                    entering={FadeIn.duration(160)}
                    exiting={FadeOut.duration(120)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: space.s, minHeight: 40 }}
                  >
                    {rc ? <Thumb uri={rc.image} size={32} icon="bowl" /> : null}
                    <Txt style={{ flex: 1 }}>{rc ? rc.name : item.text}</Txt>
                    <IconButton
                      icon="close"
                      flat
                      size={36}
                      color={p.muted}
                      label={t('c.delete')}
                      onPress={() =>
                        setMeals(
                          m,
                          (dayMeals[m] ?? []).filter((x) => x.id !== item.id),
                        )
                      }
                    />
                  </Animated.View>
                );
              })}
              <Row gap={space.s}>
                <View style={{ flex: 1 }}>
                  <Field
                    placeholder={t('ed.mealPh')}
                    value={drafts[m] ?? ''}
                    onChangeText={(v) => setDrafts((d) => ({ ...d, [m]: v }))}
                    onSubmitEditing={() => addText(m)}
                    submitBehavior="submit"
                  />
                </View>
                <IconButton icon="plus" label={t('ed.addMeal')} onPress={() => addText(m)} />
                {recipes.length > 0 && <IconButton icon="bowl" label={t('ed.fromRecipe')} onPress={() => setPicking(m)} />}
              </Row>
            </Panel>
          ))}
          <Press
            onPress={() => {
              const src = week[String(day)] ?? {};
              const copy = (): Partial<Record<MealType, MealItem[]>> =>
                Object.fromEntries(Object.entries(src).map(([k, items]) => [k, (items ?? []).map((it) => ({ ...it, id: uid() }))]));
              setWeek(Object.fromEntries(Array.from({ length: 7 }, (_, d) => [String(d), d === day ? src : copy()])));
              toast(t('ed.copied'));
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, alignSelf: 'flex-start' }}
          >
            <Icon name="repeat" size={18} color={p.muted} />
            <Txt v="label" color={p.muted}>
              {t('ed.copyDay')}
            </Txt>
          </Press>
        </Animated.View>
      </View>

      <View style={{ gap: space.s }}>
        <Txt v="section">{t('ed.images')}</Txt>
        <Txt v="meta" muted>
          {t('ed.imagesSub')}
        </Txt>
        <ImageGrid images={images} onChange={setImages} />
      </View>
      <Field label={`${t('c.notes')} (${t('c.optional')})`} value={notes} onChangeText={setNotes} multiline />

      <Sheet open={!!picking} onClose={() => setPicking(null)}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingBottom: space.l, gap: space.s }}>
          <Txt v="title">{t('ed.chooseRecipe')}</Txt>
          {[...recipes]
            .sort((a, b) => Number(b.mealType === picking) - Number(a.mealType === picking) || a.name.localeCompare(b.name))
            .map((r) => (
              <Press
                key={r.id}
                onPress={() => {
                  if (picking) setMeals(picking, [...(dayMeals[picking] ?? []), { id: uid(), recipeId: r.id }]);
                  setPicking(null);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 56 }}
              >
                <Thumb uri={r.image} size={44} icon="bowl" />
                <View style={{ flex: 1 }}>
                  <Txt>{r.name}</Txt>
                  <Txt v="meta" muted>
                    {t(`meal.${r.mealType}`)}
                  </Txt>
                </View>
              </Press>
            ))}
        </ScrollView>
      </Sheet>
    </EditorScaffold>
  );
}
