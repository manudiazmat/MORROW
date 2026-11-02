import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';

import { TabScreen } from '@/components/Screen';
import { Segmented } from '@/components/ui';
import { Agenda } from '@/features/plan/Agenda';
import { FreeTimeList, RoutinesList, TasksList } from '@/features/plan/Lists';
import { useT } from '@/lib/i18n';

type Tab = 'agenda' | 'tasks' | 'routines' | 'free';

export default function Plan() {
  const { t } = useT();
  const params = useLocalSearchParams<{ tab?: Tab }>();
  const [tab, setTab] = useState<Tab>(params.tab ?? 'agenda');
  // follow ?tab= when another screen links here (adjusting state during render, no effect)
  const [lastParam, setLastParam] = useState(params.tab);
  if (params.tab !== lastParam) {
    setLastParam(params.tab);
    if (params.tab) setTab(params.tab);
  }
  return (
    <TabScreen context="plan" title={t('plan.title')}>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'agenda', label: t('plan.agenda') },
          { value: 'tasks', label: t('plan.tasks') },
          { value: 'routines', label: t('plan.routines') },
          { value: 'free', label: t('plan.free') },
        ]}
        small
      />
      <Animated.View key={tab} entering={FadeIn.duration(200)}>
        {tab === 'agenda' && <Agenda />}
        {tab === 'tasks' && <TasksList />}
        {tab === 'routines' && <RoutinesList />}
        {tab === 'free' && <FreeTimeList />}
      </Animated.View>
    </TabScreen>
  );
}
