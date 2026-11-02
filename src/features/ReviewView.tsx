import { View } from 'react-native';

import { BarList } from '@/components/charts';
import { Panel, Progress, Row, SectionHead, Txt } from '@/components/ui';
import { durationLabel, money } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { useStore } from '@/store';
import { space, usePalette } from '@/theme';
import type { WeeklyReview } from '@/types/models';

const fmt1 = (v: number | null, lang: 'es' | 'en') =>
  v == null ? '—' : String(Math.round(v * 10) / 10).replace('.', lang === 'es' ? ',' : '.');

/** Read-only presentation of a weekly review (live or saved). */
export function ReviewView({ r }: { r: WeeklyReview }) {
  const p = usePalette();
  const { t, lang } = useT();
  const prefs = useStore((s) => s.prefs);
  const dims = useStore((s) => s.dimensions);
  const time = Object.entries(r.minutesByCategory)
    .filter(([, m]) => m > 0)
    .sort((a, b) => b[1] - a[1]);
  const fmt = (c: number) => money(c, prefs.currency, lang);
  return (
    <View style={{ gap: space.xxl }}>
      <Panel style={{ flexDirection: 'row', padding: 0 }}>
        {[
          { l: t('rv.tasksDone'), v: String(r.tasksDone) },
          { l: t('rv.tasksPending'), v: String(r.tasksPending) },
          { l: t('rv.sport'), v: String(r.sportSessions) },
        ].map((c, i) => (
          <View key={c.l} style={{ flex: 1, padding: space.l, gap: 4, borderLeftWidth: i ? 1 : 0, borderLeftColor: p.ground }}>
            <Txt v="meta" muted numberOfLines={2}>
              {c.l}
            </Txt>
            <Txt v="title" num>
              {c.v}
            </Txt>
          </View>
        ))}
      </Panel>

      <View style={{ gap: space.m }}>
        <SectionHead title={t('rv.time')} />
        <Panel>
          {time.length ? (
            <BarList rows={time.map(([c, m]) => ({ label: t(`cat.${c}`), value: m }))} format={(m) => durationLabel(m, lang)} />
          ) : (
            <Txt muted>{t('rv.noTime')}</Txt>
          )}
        </Panel>
      </View>

      <View style={{ gap: space.m }}>
        <SectionHead title={t('rv.money')} />
        <Panel style={{ flexDirection: 'row', gap: space.xl }}>
          <View style={{ gap: 2 }}>
            <Txt v="meta" muted>
              {t('fin.income')}
            </Txt>
            <Txt v="label" num weight="bold">
              {fmt(r.income)}
            </Txt>
          </View>
          <View style={{ gap: 2 }}>
            <Txt v="meta" muted>
              {t('fin.expenses')}
            </Txt>
            <Txt v="label" num weight="bold">
              {fmt(r.expenses)}
            </Txt>
          </View>
          <View style={{ gap: 2 }}>
            <Txt v="meta" muted>
              {t('fin.savings')}
            </Txt>
            <Txt v="label" num weight="bold" color={r.income - r.expenses < 0 ? p.negative : p.text}>
              {fmt(r.income - r.expenses)}
            </Txt>
          </View>
        </Panel>
      </View>

      {r.goalsProgress.length > 0 && (
        <View style={{ gap: space.m }}>
          <SectionHead title={t('rv.goals')} />
          <Panel style={{ gap: space.l }}>
            {r.goalsProgress.map((g) => (
              <View key={g.id} style={{ gap: 6 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Txt numberOfLines={1} style={{ flex: 1 }}>
                    {g.title}
                  </Txt>
                  <Txt v="meta" num muted>
                    {Math.round(g.progress * 100)} %
                  </Txt>
                </Row>
                <Progress value={g.progress} height={6} />
              </View>
            ))}
          </Panel>
        </View>
      )}

      <View style={{ gap: space.m }}>
        <SectionHead title={t('rv.balance')} />
        <Txt v="meta" muted>
          {t('rv.balanceSub')}
        </Txt>
        <Panel style={{ gap: space.s }}>
          {r.balanceDelta
            .filter((d) => dims.find((x) => x.key === d.key)?.enabled)
            .map((d) => {
              const delta = d.from != null && d.to != null ? Math.round((d.to - d.from) * 10) / 10 : null;
              return (
                <Row key={d.key} style={{ minHeight: 36 }}>
                  <Txt style={{ flex: 1 }}>{dims.find((x) => x.key === d.key)?.label || t(`dim.${d.key}`)}</Txt>
                  <Txt v="meta" muted num style={{ width: 40, textAlign: 'right' }}>
                    {fmt1(d.from, lang)}
                  </Txt>
                  <Txt v="label" num style={{ width: 40, textAlign: 'right' }}>
                    {fmt1(d.to, lang)}
                  </Txt>
                  <Txt
                    v="meta"
                    num
                    style={{ width: 44, textAlign: 'right' }}
                    color={delta == null || delta === 0 ? p.muted : delta > 0 ? p.positive : p.negative}
                  >
                    {delta == null ? '—' : delta === 0 ? '0' : `${delta > 0 ? '+' : '−'}${fmt1(Math.abs(delta), lang)}`}
                  </Txt>
                </Row>
              );
            })}
        </Panel>
      </View>
    </View>
  );
}
