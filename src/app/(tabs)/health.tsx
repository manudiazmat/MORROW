import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';

import { TabScreen } from '@/components/Screen';
import { Segmented } from '@/components/ui';
import { Diet } from '@/features/health/Diet';
import { Recipes } from '@/features/health/Recipes';
import { Training } from '@/features/health/Training';
import { useT } from '@/lib/i18n';

type Tab = 'training' | 'diet' | 'recipes';

export default function Health() {
  const { t } = useT();
  const params = useLocalSearchParams<{ tab?: Tab }>();
  const [tab, setTab] = useState<Tab>(params.tab ?? 'training');
  const [lastParam, setLastParam] = useState(params.tab);
  if (params.tab !== lastParam) {
    setLastParam(params.tab);
    if (params.tab) setTab(params.tab);
  }
  return (
    <TabScreen context="health" title={t('hl.title')}>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'training', label: t('hl.training') },
          { value: 'diet', label: t('hl.diet') },
          { value: 'recipes', label: t('hl.recipes') },
        ]}
      />
      <Animated.View key={tab} entering={FadeIn.duration(200)}>
        {tab === 'training' && <Training />}
        {tab === 'diet' && <Diet />}
        {tab === 'recipes' && <Recipes />}
      </Animated.View>
    </TabScreen>
  );
}
