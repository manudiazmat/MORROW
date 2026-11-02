import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';

import { ScoreScale } from '@/components/ScoreScale';
import { StackScreen } from '@/components/Screen';
import { Button, Panel, Row, SectionHead, Txt } from '@/components/ui';
import { GoalCard } from '@/features/goals/GoalCard';
import { useLifeBalance, useLive } from '@/hooks/useData';
import { monthKey, prevMonthKey } from '@/lib/dates';
import { monthShort, shortDate } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { useStore } from '@/store';
import { font, space, usePalette } from '@/theme';
import type { DimensionKey } from '@/types/models';

const fmt1 = (v: number | null, lang: 'es' | 'en') =>
  v == null ? '—' : String(Math.round(v * 10) / 10).replace('.', lang === 'es' ? ',' : '.');

function History({ dim }: { dim: DimensionKey }) {
  const p = usePalette();
  const { lang } = useT();
  const snaps = useStore((s) => s.snapshots);
  const [w, setW] = useState(0);
  const now = monthKey(new Date());
  const months = Array.from({ length: 12 }, (_, i) => prevMonthKey(now, 11 - i));
  const vals = months.map((m) => snaps.find((s) => s.month === m)?.values[dim]?.combined ?? null);
  const H = 120;
  const bw = w ? (w - 11 * 6) / 12 : 0;
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: H + 20 }}>
      {w > 0 && (
        <Svg width={w} height={H + 20}>
          {vals.map((v, i) => {
            const h = v == null ? 3 : Math.max(3, (v / 12) * H);
            return (
              <Rect
                key={i}
                x={i * (bw + 6)}
                y={H - h}
                width={bw}
                height={h}
                rx={Math.min(6, bw / 2)}
                fill={i === 11 ? p.accent : v == null ? p.panelStrong : p.petalFill}
              />
            );
          })}
          {[0, 5, 11].map((i) => (
            <SvgText
              key={i}
              x={i * (bw + 6) + bw / 2}
              y={H + 16}
              fontSize={11}
              fontFamily={font.regular}
              fill={p.muted}
              textAnchor="middle"
            >
              {monthShort(lang, Number(months[i].split('-')[1]) - 1)}
            </SvgText>
          ))}
        </Svg>
      )}
    </View>
  );
}

export default function DimensionDetail() {
  const { key } = useLocalSearchParams<{ key: DimensionKey }>();
  const { t, lang } = useT();
  const { all, label } = useLifeBalance();
  const setRating = useStore((s) => s.setRating);
  const score = useStore((s) => s.scores.find((x) => x.key === key));
  const fmt = useStore((s) => s.prefs.dateFormat);
  const goals = useLive('personal_goals').filter((g) => g.dimension === key);
  const r = all.find((x) => x.key === key);
  if (!r) return <StackScreen title={t('lb.title')}>{null}</StackScreen>;

  const rule = r.self != null && r.data != null ? t('lb.both') : r.self != null ? t('lb.selfOnly') : r.data != null ? t('lb.dataOnly') : '';

  return (
    <StackScreen title={label(key)}>
      <Txt muted>{t(`dimd.${key}`)}</Txt>

      <Panel style={{ gap: space.l }}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Txt v="meta" muted>
            {t('lb.combined')}
          </Txt>
          <Txt v="display" num>
            {fmt1(r.combined, lang)}
            <Txt v="body" muted>
              {' '}
              / 12
            </Txt>
          </Txt>
        </Row>
        {rule ? (
          <Txt v="meta" muted>
            {rule}
          </Txt>
        ) : null}
      </Panel>

      <View style={{ gap: space.m }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt v="section">{t('lb.self')}</Txt>
          <Txt v="label" num>
            {r.self == null ? t('lb.notRated') : `${r.self} / 12`}
          </Txt>
        </Row>
        <ScoreScale value={r.self} onChange={(v) => setRating(key, v)} label={`${t('lb.self')}: ${label(key)}`} />
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt v="meta" muted>
            {score?.ratedAt ? shortDate(score.ratedAt.slice(0, 10), lang, fmt) : ''}
          </Txt>
          {r.self != null && <Button kind="ghost" compact label={t('lb.clear')} onPress={() => setRating(key, null)} />}
        </Row>
      </View>

      <View style={{ gap: space.m }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt v="section">{t('lb.data')}</Txt>
          <Txt v="label" num>
            {r.data == null ? t('lb.noData') : `${fmt1(r.data, lang)} / 12`}
          </Txt>
        </Row>
        <Panel style={{ gap: space.m }}>
          {r.basis.length ? (
            r.basis.map((b, i) => (
              <Animated.View
                key={i}
                entering={FadeIn.duration(180).delay(i * 40)}
                style={{ flexDirection: 'row', gap: space.m, alignItems: 'baseline' }}
              >
                <Txt style={{ flex: 1 }}>{t(b.k, b.p)}</Txt>
                <Txt v="meta" muted num>
                  {fmt1(b.v * 12, lang)}
                </Txt>
              </Animated.View>
            ))
          ) : (
            <Txt muted>{t('lb.crit.4')}</Txt>
          )}
        </Panel>
        <Txt v="meta" muted>
          {t('lb.crit.3')}
        </Txt>
      </View>

      <View style={{ gap: space.m }}>
        <SectionHead title={t('lb.history')} />
        <Panel>
          <History dim={key} />
        </Panel>
      </View>

      <View style={{ gap: space.m }}>
        <SectionHead title={t('lb.related')} action={t('c.add')} onAction={() => router.push(`/edit/goal?dimension=${key}`)} />
        {goals.length ? goals.map((g) => <GoalCard key={g.id} goal={g} />) : <Txt muted>{t('lb.noRelated')}</Txt>}
      </View>
    </StackScreen>
  );
}
