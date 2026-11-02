import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Icon } from '@/components/Icon';
import { Button, Check, Empty, IconButton, Panel, Press, Row, SectionHead, Txt, haptic } from '@/components/ui';
import { useLive } from '@/hooks/useData';
import { dateKey, startOfWeek, weekDays } from '@/lib/dates';
import { MEALS, dietAdherence, mealsFor } from '@/lib/domain/health';
import { dayAbbr } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { useStore } from '@/store';
import { radius, space, usePalette } from '@/theme';
import { ImageViewer, Thumb } from './images';

export function Diet() {
  const p = usePalette();
  const { t, lang } = useT();
  const diets = useLive('diets');
  const recipes = useLive('recipes');
  const wsPref = useStore((s) => s.prefs.weekStartsOn);
  const toggleMeal = useStore((s) => s.toggleMeal);
  const setActive = useStore((s) => s.setActiveDiet);
  const [day, setDay] = useState(dateKey(new Date()));
  const [viewing, setViewing] = useState<number | null>(null);
  const active = diets.find((d) => d.active) ?? diets[0];
  const others = diets.filter((d) => d.id !== active?.id);
  const today = dateKey(new Date());

  if (!active)
    return (
      <Panel>
        <Empty icon="bowl" text={t('hl.noDiet')} action={t('hl.newDiet')} onAction={() => router.push('/edit/diet')} />
      </Panel>
    );

  const sel = new Date(`${day}T00:00`);
  const meals = mealsFor(active, sel);
  const adh = dietAdherence(active);
  const days = weekDays(startOfWeek(new Date(), wsPref));

  return (
    <View style={{ gap: space.xl }}>
      <Panel style={{ gap: space.s }}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt v="meta" muted>
              {t('hl.activeDiet')}
            </Txt>
            <Txt v="title">{active.name}</Txt>
            {active.goal ? <Txt muted>{active.goal}</Txt> : null}
          </View>
          <IconButton icon="edit" label={t('c.edit')} onPress={() => router.push(`/edit/diet?id=${active.id}`)} />
        </Row>
        <Txt v="meta" muted num>
          {[
            active.kcalTarget ? t('hl.kcalTarget', { n: active.kcalTarget }) : null,
            adh ? t('hl.adherence', { done: adh.done, n: adh.planned }) : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Txt>
      </Panel>

      <Row gap={0} style={{ justifyContent: 'space-between' }}>
        {days.map((d) => {
          const k = dateKey(d);
          const on = k === day;
          return (
            <Press
              key={k}
              onPress={() => {
                haptic('select');
                setDay(k);
              }}
              accessibilityState={{ selected: on }}
              style={{
                width: 44,
                paddingVertical: 8,
                borderRadius: radius.pill,
                alignItems: 'center',
                gap: 4,
                backgroundColor: on ? p.primary : 'transparent',
              }}
            >
              <Txt v="meta" color={on ? p.onPrimary : p.muted}>
                {dayAbbr(lang, d.getDay())}
              </Txt>
              <Txt v="label" num weight={k === today || on ? 'bold' : 'regular'} color={on ? p.onPrimary : p.text}>
                {d.getDate()}
              </Txt>
            </Press>
          );
        })}
      </Row>

      <Animated.View key={day} entering={FadeIn.duration(180)} style={{ gap: space.m }}>
        {MEALS.some((m) => meals[m]?.length) ? (
          MEALS.filter((m) => meals[m]?.length).map((m) => {
            const eaten = active.log.includes(`${day}:${m}`);
            const canMark = day <= today;
            return (
              <Panel key={m} style={{ gap: space.s, paddingVertical: space.l }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Txt v="section">{t(`meal.${m}`)}</Txt>
                  {canMark && (
                    <Row gap={space.s}>
                      <Txt v="meta" muted>
                        {t('hl.eaten')}
                      </Txt>
                      <Check done={eaten} label={`${t(`meal.${m}`)} ${t('hl.eaten')}`} onPress={() => toggleMeal(active.id, day, m)} />
                    </Row>
                  )}
                </Row>
                {meals[m]!.map((item) => {
                  const rc = item.recipeId ? recipes.find((r) => r.id === item.recipeId) : undefined;
                  return rc ? (
                    <Press
                      key={item.id}
                      onPress={() => router.push(`/health/recipe/${rc.id}`)}
                      scaleTo={0.985}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 52 }}
                    >
                      <Thumb uri={rc.image} size={44} icon="bowl" />
                      <Txt style={{ flex: 1 }} color={eaten ? p.muted : p.text}>
                        {rc.name}
                      </Txt>
                      <Icon name="right" size={16} color={p.faint} />
                    </Press>
                  ) : (
                    <Txt key={item.id} color={eaten ? p.muted : p.text} style={{ paddingVertical: 4 }}>
                      {item.text}
                    </Txt>
                  );
                })}
              </Panel>
            );
          })
        ) : (
          <Panel>
            <Txt muted>{t('hl.noMeals')}</Txt>
          </Panel>
        )}
      </Animated.View>

      {active.images.length > 0 && (
        <View style={{ gap: space.m }}>
          <SectionHead title={t('hl.dietImages')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.s }}>
            {active.images.map((uri, i) => (
              <Press key={uri} onPress={() => setViewing(i)} scaleTo={0.97} accessibilityLabel={`${t('hl.dietImages')} ${i + 1}`}>
                <Thumb uri={uri} style={{ width: 132, height: 176 }} />
              </Press>
            ))}
          </ScrollView>
        </View>
      )}

      {others.length > 0 && (
        <View style={{ gap: space.m }}>
          <SectionHead title={t('hl.otherDiets')} />
          <Panel style={{ padding: space.s }}>
            {others.map((d) => (
              <View
                key={d.id}
                style={{ flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 56, paddingHorizontal: space.m }}
              >
                <Press onPress={() => router.push(`/edit/diet?id=${d.id}`)} style={{ flex: 1 }}>
                  <Txt>{d.name}</Txt>
                  {d.goal ? (
                    <Txt v="meta" muted numberOfLines={1}>
                      {d.goal}
                    </Txt>
                  ) : null}
                </Press>
                <Button label={t('hl.makeActive')} kind="raised" compact onPress={() => setActive(d.id)} />
              </View>
            ))}
          </Panel>
        </View>
      )}

      <Button
        label={t('hl.newDiet')}
        kind="raised"
        icon="plus"
        compact
        onPress={() => router.push('/edit/diet')}
        style={{ alignSelf: 'flex-start' }}
      />
      <ImageViewer images={active.images} index={viewing} onClose={() => setViewing(null)} />
    </View>
  );
}
