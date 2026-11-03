import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { TabScreen } from '@/components/Screen';
import { Button, Empty, Panel, Segmented } from '@/components/ui';
import { GoalCard } from '@/features/goals/GoalCard';
import { RewardsView } from '@/features/rewards/RewardsView';
import { useLive } from '@/hooks/useData';
import { useT } from '@/lib/i18n';
import { space } from '@/theme';
import type { GoalHorizon } from '@/types/models';

type View_ = 'goals' | 'rewards';

export default function Goals() {
  const { t } = useT();
  const params = useLocalSearchParams<{ view?: View_ }>();
  const [view, setView] = useState<View_>(params.view ?? 'goals');
  const [lastParam, setLastParam] = useState(params.view);
  if (params.view !== lastParam) {
    setLastParam(params.view);
    if (params.view) setView(params.view);
  }
  return (
    <TabScreen context="goals" title={view === 'rewards' ? t('goals.viewRewards') : t('goals.title')}>
      <Segmented
        value={view}
        onChange={setView}
        options={[
          { value: 'goals', label: t('goals.viewGoals') },
          { value: 'rewards', label: t('goals.viewRewards') },
        ]}
      />
      <Animated.View key={view} entering={FadeIn.duration(200)}>
        {view === 'goals' ? <GoalsList /> : <RewardsView />}
      </Animated.View>
    </TabScreen>
  );
}

function GoalsList() {
  const { t } = useT();
  const goals = useLive('personal_goals');
  const [h, setH] = useState<GoalHorizon>('short');
  const list = goals
    .filter((g) => g.horizon === h)
    .sort((a, b) => (a.status === 'done' ? 1 : 0) - (b.status === 'done' ? 1 : 0) || a.priority - b.priority);
  const count = (x: GoalHorizon) => goals.filter((g) => g.horizon === x && g.status !== 'done').length;
  return (
    <View style={{ gap: space.l }}>
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
    </View>
  );
}
