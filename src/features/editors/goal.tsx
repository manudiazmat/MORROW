import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { Check, Field, IconButton, Row, Segmented, Txt } from '@/components/ui';
import { useLive } from '@/hooks/useData';
import { todayKey } from '@/lib/dates';
import { uid } from '@/lib/id';
import { useT } from '@/lib/i18n';
import { useStore } from '@/store';
import { space, usePalette } from '@/theme';
import type { DimensionKey, GoalHorizon, GoalMilestone, GoalStatus, Priority } from '@/types/models';
import { DIMS, HORIZONS } from '../constants';
import { ChoiceField, DateField } from '../pickers';
import { EditorScaffold } from './Scaffold';

const spring = LinearTransition.springify().damping(20).stiffness(220);

export function GoalEditor({ id, title: initialTitle, dimension: initialDim }: { id?: string; title?: string; dimension?: DimensionKey }) {
  const { t } = useT();
  const p = usePalette();
  const existing = useStore((s) => s.personal_goals.find((x) => x.id === id));
  const savings = useLive('financial_goals');
  const create = useStore((s) => s.create);
  const update = useStore((s) => s.update);
  const remove = useStore((s) => s.remove);

  const [title, setTitle] = useState(existing?.title ?? initialTitle ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [dimension, setDimension] = useState<DimensionKey>(existing?.dimension ?? initialDim ?? 'purpose');
  const [horizon, setHorizon] = useState<GoalHorizon>(existing?.horizon ?? 'medium');
  const [startDate, setStartDate] = useState(existing?.startDate ?? todayKey());
  const [targetDate, setTargetDate] = useState<string | null>(existing?.targetDate ?? null);
  const [priority, setPriority] = useState<Priority>(existing?.priority ?? 2);
  const [status, setStatus] = useState<GoalStatus>(existing?.status ?? 'active');
  const [milestones, setMilestones] = useState<GoalMilestone[]>(existing?.milestones ?? []);
  const [financialGoalId, setFin] = useState<string | null>(existing?.financialGoalId ?? null);
  const [manual, setManual] = useState(existing?.manualProgress ?? 0);
  const [newMs, setNewMs] = useState('');
  const [error, setError] = useState<string | null>(null);

  const addMs = () => {
    if (!newMs.trim()) return;
    setMilestones((m) => [...m, { id: uid(), title: newMs.trim(), done: false, dueDate: null, doneAt: null }]);
    setNewMs('');
  };

  const save = () => {
    if (!title.trim()) {
      setError(t('c.required'));
      return false;
    }
    const data = {
      title: title.trim(),
      description,
      dimension,
      horizon,
      startDate,
      targetDate,
      priority,
      status,
      milestones,
      financialGoalId,
      manualProgress: manual,
    };
    if (existing) update('personal_goals', existing.id, data);
    else create('personal_goals', data);
  };

  return (
    <EditorScaffold
      title={existing ? t('ed.editGoal') : t('ed.newGoal')}
      onSave={save}
      onDelete={existing ? () => remove('personal_goals', existing.id) : undefined}
      deleteName={existing?.title}
    >
      <Field
        label={t('c.title')}
        value={title}
        onChangeText={(v) => {
          setTitle(v);
          setError(null);
        }}
        error={error}
        placeholder={t('goals.example')}
        autoFocus={!existing}
      />
      <Field label={`${t('ed.description')} (${t('c.optional')})`} value={description} onChangeText={setDescription} multiline />
      <ChoiceField
        label={t('ed.horizon')}
        value={horizon}
        onChange={setHorizon}
        options={HORIZONS.map((h) => ({ value: h, label: t(`goals.${h}`) }))}
      />
      <ChoiceField
        label={t('ed.dimension')}
        value={dimension}
        onChange={setDimension}
        options={DIMS.map((d) => ({ value: d, label: t(`dims.${d}`) }))}
      />

      <View style={{ gap: space.s }}>
        <Txt v="label" muted>
          {t('ed.milestones')}
        </Txt>
        <Animated.View layout={spring} style={{ gap: 4 }}>
          {milestones.map((m) => (
            <Animated.View
              key={m.id}
              entering={FadeIn.duration(160)}
              exiting={FadeOut.duration(120)}
              layout={spring}
              style={{ flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 48 }}
            >
              <Check
                done={m.done}
                label={m.title}
                onPress={() =>
                  setMilestones((all) =>
                    all.map((x) => (x.id === m.id ? { ...x, done: !x.done, doneAt: !x.done ? new Date().toISOString() : null } : x)),
                  )
                }
              />
              <Txt style={{ flex: 1 }} color={m.done ? p.muted : p.text}>
                {m.title}
              </Txt>
              <IconButton
                icon="close"
                flat
                size={40}
                color={p.muted}
                label={t('c.delete')}
                onPress={() => setMilestones((all) => all.filter((x) => x.id !== m.id))}
              />
            </Animated.View>
          ))}
        </Animated.View>
        <Row gap={space.s}>
          <View style={{ flex: 1 }}>
            <Field
              placeholder={t('ed.addMilestone')}
              value={newMs}
              onChangeText={setNewMs}
              onSubmitEditing={addMs}
              submitBehavior="submit"
            />
          </View>
          <IconButton icon="plus" label={t('ed.addMilestone')} onPress={addMs} size={52} />
        </Row>
      </View>

      <DateField label={t('ed.startDate')} value={startDate} onChange={(v) => v && setStartDate(v)} />
      <DateField label={`${t('ed.targetDate')} (${t('c.optional')})`} value={targetDate} onChange={setTargetDate} allowEmpty />

      {savings.length > 0 && (
        <ChoiceField
          label={t('ed.linkSaving')}
          value={financialGoalId ?? ''}
          onChange={(v) => setFin(v || null)}
          options={[{ value: '', label: t('ed.noLink') }, ...savings.map((g) => ({ value: g.id, label: g.name }))]}
        />
      )}

      {!milestones.length && !financialGoalId && (
        <ChoiceField
          label={t('ed.manualProgress')}
          value={manual}
          onChange={setManual}
          options={[0, 25, 50, 75, 100].map((n) => ({ value: n, label: `${n} %` }))}
        />
      )}

      <View style={{ gap: space.s }}>
        <Txt v="label" muted>
          {t('c.priority')}
        </Txt>
        <Segmented
          small
          value={String(priority)}
          onChange={(v) => setPriority(Number(v) as Priority)}
          options={[1, 2, 3].map((n) => ({ value: String(n), label: t(`prio.${n}`) }))}
        />
      </View>
      {existing && (
        <View style={{ gap: space.s }}>
          <Txt v="label" muted>
            {t('ed.status')}
          </Txt>
          <Segmented
            small
            value={status}
            onChange={setStatus}
            options={(['active', 'paused', 'done'] as GoalStatus[]).map((s) => ({ value: s, label: t(`goals.status.${s}`) }))}
          />
        </View>
      )}
    </EditorScaffold>
  );
}
