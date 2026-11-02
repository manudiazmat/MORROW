import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { StackScreen } from '@/components/Screen';
import { IconButton, Panel, Press, Row, Txt } from '@/components/ui';
import { ImageViewer, Thumb } from '@/features/health/images';
import { scaleQuantity } from '@/lib/domain/health';
import { useT } from '@/lib/i18n';
import { useStore } from '@/store';
import { radius, raisedShadow, space, usePalette } from '@/theme';

export default function RecipeView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = usePalette();
  const { t, lang } = useT();
  const r = useStore((s) => s.recipes.find((x) => x.id === id && !x.deletedAt));
  const [servings, setServings] = useState(r?.servings ?? 1);
  const [viewing, setViewing] = useState<number | null>(null);
  if (!r) return <StackScreen title={t('hl.recipes')}>{null}</StackScreen>;
  const factor = servings / Math.max(1, r.servings);
  const hasNutrition = r.kcal != null || r.proteinG != null || r.carbsG != null || r.fatG != null;

  return (
    <StackScreen
      title={r.name}
      right={<IconButton icon="edit" label={t('c.edit')} onPress={() => router.push(`/edit/recipe?id=${r.id}`)} />}
    >
      {r.image ? (
        <Press onPress={() => setViewing(0)} scaleTo={0.985} accessibilityLabel={r.name}>
          <Thumb uri={r.image} icon="bowl" style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: radius.panel }} />
        </Press>
      ) : null}
      <Txt muted>
        {t(`meal.${r.mealType}`)}
        {r.prepMin ? ` · ${t('rc.prep', { n: r.prepMin })}` : ''}
      </Txt>

      {hasNutrition && (
        <Panel style={{ flexDirection: 'row', padding: 0 }}>
          {[
            { l: t('rc.kcal'), v: r.kcal, u: '' },
            { l: t('rc.protein'), v: r.proteinG, u: ' g' },
            { l: t('rc.carbs'), v: r.carbsG, u: ' g' },
            { l: t('rc.fat'), v: r.fatG, u: ' g' },
          ].map((c, i) => (
            <View key={c.l} style={{ flex: 1, padding: space.m, gap: 2, borderLeftWidth: i ? 1 : 0, borderLeftColor: p.ground }}>
              <Txt v="meta" muted numberOfLines={1}>
                {c.l}
              </Txt>
              <Txt v="label" num>
                {c.v == null ? '—' : `${Math.round(c.v * factor)}${c.u}`}
              </Txt>
            </View>
          ))}
        </Panel>
      )}

      <View style={{ gap: space.m }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt v="section">{t('rc.ingredients')}</Txt>
          <Row gap={space.s}>
            <Step label="−" a11y={t('rc.less')} onPress={() => setServings((s) => Math.max(1, s - 1))} />
            <Txt v="label" num style={{ minWidth: 70, textAlign: 'center' }}>
              {servings} {t('rc.servings').toLowerCase()}
            </Txt>
            <Step label="+" a11y={t('rc.more')} onPress={() => setServings((s) => Math.min(20, s + 1))} />
          </Row>
        </Row>
        <Panel style={{ gap: space.s }}>
          {r.ingredients.length ? (
            r.ingredients.map((ing) => (
              <Row key={ing.id} style={{ justifyContent: 'space-between', minHeight: 32 }} gap={space.m}>
                <Txt style={{ flex: 1 }}>{ing.name}</Txt>
                <Animated.View key={`${ing.id}-${servings}`} entering={FadeIn.duration(160)}>
                  <Txt v="label" num muted>
                    {scaleQuantity(ing.quantity, factor, lang)}
                  </Txt>
                </Animated.View>
              </Row>
            ))
          ) : (
            <Txt muted>—</Txt>
          )}
        </Panel>
      </View>

      {r.steps.length > 0 && (
        <View style={{ gap: space.m }}>
          <Txt v="section">{t('rc.steps')}</Txt>
          <View style={{ gap: space.l }}>
            {r.steps.map((s, i) => (
              <Row key={i} gap={space.m} style={{ alignItems: 'flex-start' }}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: p.accentSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Txt v="meta" num color={p.accentInk} weight="semibold">
                    {i + 1}
                  </Txt>
                </View>
                <Txt v="bodyL" style={{ flex: 1 }}>
                  {s}
                </Txt>
              </Row>
            ))}
          </View>
        </View>
      )}
      {!hasNutrition && (
        <Txt v="meta" muted>
          {t('rc.noNutrition')}
        </Txt>
      )}
      {r.notes ? <Txt muted>{r.notes}</Txt> : null}
      {r.image ? <ImageViewer images={[r.image]} index={viewing} onClose={() => setViewing(null)} /> : null}
    </StackScreen>
  );
}

function Step({ label, a11y, onPress }: { label: string; a11y: string; onPress: () => void }) {
  const p = usePalette();
  return (
    <Press
      onPress={onPress}
      accessibilityLabel={a11y}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: p.raised,
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: raisedShadow(p),
      }}
    >
      <Txt v="section">{label}</Txt>
    </Press>
  );
}
