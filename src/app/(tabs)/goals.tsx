import { router } from 'expo-router';
import { useState } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';

import { TabScreen } from '@/components/Screen';
import { Button, Empty, Panel, Segmented } from '@/components/ui';
import { GoalCard } from '@/features/goals/GoalCard';
import { useLive } from '@/hooks/useData';
import { useT } from '@/lib/i18n';
import { space } from '@/theme';
import type { GoalHorizon } from '@/types/models';

export default function Goals() {
  const { t } = useT();
  const goals = useLive('personal_goals');
  const [h, setH] = useState<GoalHorizon>('short');
  const list = goals
    .filter((g) => g.horizon === h)
    .sort((a, b) => (a.status === 'done' ? 1 : 0) - (b.status === 'done' ? 1 : 0) || a.priority - b.priority);
  const count = (x: GoalHorizon) => goals.filter((g) => g.horizon === x && g.status !== 'done').length;
  return (
    <TabScreen context="goals" title={t('goals.title')}>
      <Segmented
        small
        value={h}
        onChange={setH}
        options={(['short', 'medium', 'long'] as GoalHorizon[]).map((x) => ({
          value: x,
          label: `${t(`goals.${x}`)}${count(x) ? ` · ${count(x)}` : ''}`,
        }))}
      />
      <Animated.View key={h} entering={FadeIn.duration(200)} style={{ gap: space.m }}>
        {list.length ? (
          list.map((g) => <GoalCard key={g.id} goal={g} />)
        ) : (
          <Panel>
            <Empty icon="flag" text={t('goals.empty')} action={t('goals.add')} onAction={() => router.push('/edit/goal')} />
          </Panel>
        )}
      </Animated.View>
      {list.length > 0 && (
        <Button
          label={t('goals.add')}
          kind="raised"
          icon="plus"
          compact
          onPress={() => router.push('/edit/goal')}
          style={{ alignSelf: 'flex-start' }}
        />
      )}
    </TabScreen>
  );
}
