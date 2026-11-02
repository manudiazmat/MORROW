import { router } from 'expo-router';
import { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { Icon } from '@/components/Icon';
import { LifeBalanceFlower } from '@/components/LifeBalanceFlower';
import { StackScreen } from '@/components/Screen';
import { Button, Panel, Press, Row, SectionHead, Segmented, Txt } from '@/components/ui';
import { flowerData, useLifeBalance } from '@/hooks/useData';
import { monthKey, prevMonthKey } from '@/lib/dates';
import { monthLabel } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { useStore } from '@/store';
import { radius, space, usePalette } from '@/theme';

type Cmp = '1' | '3' | '6' | '12';

const fmt1 = (v: number | null, lang: 'es' | 'en') =>
  v == null ? '—' : String(Math.round(v * 10) / 10).replace('.', lang === 'es' ? ',' : '.');

export default function LifeBalance() {
  const p = usePalette();
  const { t, lang } = useT();
  const { width } = useWindowDimensions();
  const { results, overall, shortLabel, label } = useLifeBalance();
  const snapshots = useStore((s) => s.snapshots);
  const [sel, setSel] = useState<string | null>(null);
  const [cmp, setCmp] = useState<Cmp>('1');
  const size = Math.min(width - 40, 380);
  const selected = results.find((r) => r.key === sel);

  const past = snapshots.find((s) => s.month === prevMonthKey(monthKey(new Date()), Number(cmp)));

  return (
    <StackScreen title={t('lb.title')}>
      <View style={{ gap: 4 }}>
        <Txt muted>{t('lb.subtitle')}</Txt>
        {overall != null && (
          <Txt v="figure" num>
            {fmt1(overall, lang)}
            <Txt v="body" muted>
              {' '}
              / 12
            </Txt>
          </Txt>
        )}
      </View>

      <View style={{ alignItems: 'center' }}>
        <LifeBalanceFlower
          data={flowerData(results, shortLabel)}
          size={size}
          selected={sel}
          onSelect={(k) => setSel((cur) => (cur === k ? null : k))}
        />
      </View>

      <Animated.View layout={LinearTransition.duration(220)}>
        {selected ? (
          <Animated.View key={selected.key} entering={FadeIn.duration(200)} exiting={FadeOut.duration(120)}>
            <Press
              onPress={() => router.push(`/life-balance/${selected.key}`)}
              scaleTo={0.985}
              accessibilityLabel={label(selected.key)}
              style={{ backgroundColor: p.panel, borderRadius: radius.panel, padding: space.xl, gap: space.m }}
            >
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt v="section">{label(selected.key)}</Txt>
                <Txt v="title" num>
                  {fmt1(selected.combined, lang)}
                  <Txt v="meta" muted>
                    {' '}
                    / 12
                  </Txt>
                </Txt>
              </Row>
              <Row gap={space.xl}>
                <View>
                  <Txt v="meta" muted>
                    {t('lb.self')}
                  </Txt>
                  <Txt v="label" num>
                    {selected.self == null ? t('lb.notRated') : fmt1(selected.self, lang)}
                  </Txt>
                </View>
                <View>
                  <Txt v="meta" muted>
                    {t('lb.data')}
                  </Txt>
                  <Txt v="label" num>
                    {selected.data == null ? t('lb.noData') : fmt1(selected.data, lang)}
                  </Txt>
                </View>
              </Row>
              <Row gap={6}>
                <Txt v="label" color={p.muted}>
                  {t('c.more')}
                </Txt>
                <Icon name="right" size={16} color={p.muted} />
              </Row>
            </Press>
          </Animated.View>
        ) : (
          <Txt v="meta" muted center>
            {t('lb.tapPetal')}
          </Txt>
        )}
      </Animated.View>

      <Row gap={space.m}>
        <Button label={t('lb.rate')} onPress={() => router.push('/life-balance/rate')} style={{ flex: 1 }} />
        <Button label={t('lb.personalize')} kind="raised" icon="sliders" onPress={() => router.push('/life-balance/personalize')} compact />
      </Row>

      <View style={{ gap: space.m }}>
        <SectionHead title={t('lb.history')} />
        <Segmented
          small
          value={cmp}
          onChange={setCmp}
          options={[
            { value: '1', label: t('lb.cmp.prev') },
            { value: '3', label: '3 m' },
            { value: '6', label: '6 m' },
            { value: '12', label: '12 m' },
          ]}
        />
        <Panel style={{ gap: space.s }}>
          {past ? (
            <>
              <Txt v="meta" muted>
                {t('lb.compare')} {monthLabel(past.month, lang)}
              </Txt>
              {results.map((r) => {
                const before = past.values[r.key]?.combined ?? null;
                const delta = r.combined != null && before != null ? Math.round((r.combined - before) * 10) / 10 : null;
                return (
                  <Press
                    key={r.key}
                    onPress={() => router.push(`/life-balance/${r.key}`)}
                    scaleTo={0.99}
                    style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: space.m }}
                  >
                    <Txt style={{ flex: 1 }}>{label(r.key)}</Txt>
                    <Txt v="meta" muted num style={{ width: 44, textAlign: 'right' }}>
                      {fmt1(before, lang)}
                    </Txt>
                    <Icon name="right" size={14} color={p.faint} />
                    <Txt v="label" num style={{ width: 36, textAlign: 'right' }}>
                      {fmt1(r.combined, lang)}
                    </Txt>
                    <Txt
                      v="meta"
                      num
                      style={{ width: 48, textAlign: 'right' }}
                      color={delta == null || delta === 0 ? p.muted : delta > 0 ? p.positive : p.negative}
                    >
                      {delta == null ? '—' : delta === 0 ? '0' : `${delta > 0 ? '+' : '−'}${fmt1(Math.abs(delta), lang)}`}
                    </Txt>
                  </Press>
                );
              })}
            </>
          ) : (
            <Txt muted>{t('lb.noHistory')}</Txt>
          )}
        </Panel>
      </View>

      <Button label={t('lb.criteria')} kind="ghost" icon="info" onPress={() => router.push('/life-balance/criteria')} />
    </StackScreen>
  );
}
