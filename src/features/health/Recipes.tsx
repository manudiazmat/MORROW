import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button, Chip, ChipRow, Empty, Panel, Press, Txt } from '@/components/ui';
import { useLive } from '@/hooks/useData';
import { MEALS } from '@/lib/domain/health';
import { useT } from '@/lib/i18n';
import { radius, space, usePalette } from '@/theme';
import type { MealType } from '@/types/models';
import { Thumb } from './images';

export function Recipes() {
  const p = usePalette();
  const { t } = useT();
  const recipes = useLive('recipes');
  const [meal, setMeal] = useState<MealType | 'all'>('all');
  const list = recipes.filter((r) => meal === 'all' || r.mealType === meal).sort((a, b) => a.name.localeCompare(b.name));
  if (!recipes.length)
    return (
      <Panel>
        <Empty icon="bowl" text={t('hl.noRecipes')} action={t('hl.newRecipe')} onAction={() => router.push('/edit/recipe')} />
      </Panel>
    );
  return (
    <View style={{ gap: space.xl }}>
      <ChipRow>
        <Chip label={t('hl.all')} selected={meal === 'all'} onPress={() => setMeal('all')} />
        {MEALS.map((m) => (
          <Chip key={m} label={t(`meal.${m}`)} selected={meal === m} onPress={() => setMeal(m)} />
        ))}
      </ChipRow>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.m }}>
        {list.map((r) => (
          <Animated.View key={r.id} entering={FadeIn.duration(200)} style={{ flexBasis: '46%', flexGrow: 1, maxWidth: '50%' }}>
            <Press
              onPress={() => router.push(`/health/recipe/${r.id}`)}
              scaleTo={0.97}
              accessibilityLabel={r.name}
              style={{ backgroundColor: p.panel, borderRadius: radius.panel, overflow: 'hidden' }}
            >
              <Thumb uri={r.image} icon="bowl" style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 0 }} />
              <View style={{ padding: space.m, gap: 2, minHeight: 78 }}>
                <Txt v="label" numberOfLines={2}>
                  {r.name}
                </Txt>
                <Txt v="meta" muted numberOfLines={1}>
                  {t(`meal.${r.mealType}`)}
                  {r.prepMin ? ` · ${t('rc.prep', { n: r.prepMin })}` : ''}
                  {r.kcal ? ` · ${r.kcal} kcal` : ''}
                </Txt>
              </View>
            </Press>
          </Animated.View>
        ))}
      </View>
      <Button
        label={t('hl.newRecipe')}
        kind="raised"
        icon="plus"
        compact
        onPress={() => router.push('/edit/recipe')}
        style={{ alignSelf: 'flex-start' }}
      />
    </View>
  );
}
