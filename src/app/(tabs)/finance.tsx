import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { BarList, LineChart } from '@/components/charts';
import { Icon } from '@/components/Icon';
import { TabScreen } from '@/components/Screen';
import { Button, Empty, IconButton, Panel, Press, Progress, Row, SectionHead, Txt } from '@/components/ui';
import { useLive } from '@/hooks/useData';
import { addMonths, monthKey, parseDate } from '@/lib/dates';
import {
  averageMonthlySavings,
  balance,
  budgetStatus,
  byCategory,
  goalEta,
  monthTotals,
  netWorthSeries,
  requiredMonthly,
  subscriptionsMonthly,
} from '@/lib/domain/finance';
import { monthLabel, monthShort, money, percent, shortDate } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { useStore } from '@/store';
import { radius, space, usePalette } from '@/theme';

export default function Finance() {
  const p = usePalette();
  const { t, lang } = useT();
  const prefs = useStore((s) => s.prefs);
  const opening = useStore((s) => s.finance.openingBalance);
  const txs = useLive('transactions');
  const budgets = useLive('budgets');
  const subs = useLive('subscriptions');
  const goals = useLive('financial_goals');
  const [month, setMonth] = useState(monthKey(new Date()));
  const cur = prefs.currency;
  const fmt = (c: number, o?: { sign?: boolean }) => money(c, cur, lang, o);

  const totals = monthTotals(txs, month);
  const bal = balance(txs, opening);
  const series = useMemo(() => netWorthSeries(txs, opening, goals, 6), [txs, opening, goals]);
  const top = byCategory(txs, month, 'expense').slice(0, 5);
  const bstat = budgetStatus(budgets, txs, month);
  const avg = averageMonthlySavings(txs);
  const monthTx = txs
    .filter((x) => x.date.startsWith(month))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const isCurrent = month === monthKey(new Date());
  const hasAnyTx = txs.length > 0;
  const saved = goals.reduce((s, g) => s + g.current, 0);

  const shift = (n: number) => setMonth(monthKey(addMonths(parseDate(`${month}-01`), n)));

  return (
    <TabScreen context="finance" title={t('fin.title')}>
      {/* The answer: balance now */}
      <View style={{ gap: 4 }}>
        <Txt v="meta" muted>
          {t('fin.balance')}
        </Txt>
        <Txt v="display" num weight="semibold" color={bal < 0 ? p.negative : p.text}>
          {fmt(bal)}
        </Txt>
        <Txt muted num>
          {totals.income > 0
            ? `${t('fin.thisMonth')}: ${fmt(totals.savings, { sign: totals.savings > 0 })} · ${t('fin.rate').toLowerCase()} ${percent(totals.rate ?? 0, lang)}`
            : t('fin.private')}
        </Txt>
      </View>

      <Row gap={space.m}>
        <Button
          label={t('ed.expense')}
          icon="arrowDown"
          kind="raised"
          compact
          onPress={() => router.push('/edit/tx?type=expense')}
          style={{ flex: 1 }}
        />
        <Button
          label={t('ed.income')}
          icon="arrowUp"
          kind="raised"
          compact
          onPress={() => router.push('/edit/tx?type=income')}
          style={{ flex: 1 }}
        />
      </Row>

      {/* Month strip */}
      <View style={{ gap: space.m }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <IconButton icon="left" flat size={40} label={t('a11y.back')} onPress={() => shift(-1)} />
          <Txt v="section">{monthLabel(month, lang)}</Txt>
          <IconButton icon="right" flat size={40} label={t('c.continue')} onPress={() => shift(1)} />
        </Row>
        <Panel style={{ flexDirection: 'row', padding: 0 }}>
          {[
            { k: 'fin.income', v: totals.income },
            { k: 'fin.expenses', v: totals.expenses },
            { k: 'fin.savings', v: totals.savings, sub: totals.rate != null ? percent(totals.rate, lang) : t('c.dash') },
          ].map((c, i) => (
            <View key={c.k} style={{ flex: 1, padding: space.l, gap: 4, borderLeftWidth: i ? 1 : 0, borderLeftColor: p.ground }}>
              <Txt v="meta" muted>
                {t(c.k)}
              </Txt>
              <Txt v="label" num weight="bold" numberOfLines={1} color={c.k === 'fin.savings' && c.v < 0 ? p.negative : p.text}>
                {fmt(c.v)}
              </Txt>
              {c.sub && (
                <Txt v="meta" muted num>
                  {c.sub}
                </Txt>
              )}
            </View>
          ))}
        </Panel>
      </View>

      {/* Operations */}
      <View style={{ gap: space.m }}>
        <SectionHead title={t('fin.ops')} />
        {monthTx.length ? (
          <Panel style={{ padding: space.s }}>
            {monthTx.slice(0, 30).map((tx) => (
              <Animated.View key={tx.id} entering={FadeIn.duration(180)}>
                <Press
                  onPress={() => router.push(`/edit/tx?id=${tx.id}`)}
                  scaleTo={0.985}
                  accessibilityLabel={`${tx.description} ${fmt(tx.amount)}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.m,
                    minHeight: 56,
                    paddingHorizontal: space.m,
                    borderRadius: radius.row,
                  }}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt numberOfLines={1}>{tx.description}</Txt>
                    <Txt v="meta" muted>
                      {t(`txc.${tx.category}`)} · {shortDate(tx.date, lang, prefs.dateFormat)}
                      {tx.account ? ` · ${tx.account}` : ''}
                    </Txt>
                  </View>
                  <Txt v="label" num weight="semibold" color={tx.type === 'income' ? p.positive : p.text}>
                    {tx.type === 'income' ? '+' : '−'}
                    {fmt(tx.amount)}
                  </Txt>
                </Press>
              </Animated.View>
            ))}
          </Panel>
        ) : (
          <Panel>
            <Empty text={t('fin.noOps')} action={t('fin.addOp')} onAction={() => router.push('/edit/tx')} />
          </Panel>
        )}
      </View>

      {top.length > 0 && (
        <View style={{ gap: space.m }}>
          <SectionHead title={t('fin.topSpend')} />
          <Panel>
            <BarList rows={top.map((r) => ({ label: t(`txc.${r.category}`), value: r.amount }))} format={(v) => fmt(v)} />
          </Panel>
        </View>
      )}

      {/* Budgets */}
      <View style={{ gap: space.m }}>
        <SectionHead title={t('fin.budgets')} action={t('c.add')} onAction={() => router.push('/edit/budget')} />
        <Panel style={{ gap: space.l }}>
          {bstat.length ? (
            bstat.map(({ budget, spent, ratio }) => (
              <Press key={budget.id} onPress={() => router.push(`/edit/budget?id=${budget.id}`)} scaleTo={0.99} style={{ gap: 8 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Txt>{t(`txc.${budget.category}`)}</Txt>
                  <Txt v="meta" num color={ratio > 1 ? p.negative : p.muted}>
                    {fmt(spent)} / {fmt(budget.monthlyLimit)}
                  </Txt>
                </Row>
                <Progress value={ratio} color={ratio > 1 ? p.negative : ratio > 0.9 ? p.faint : p.accent} />
                <Txt v="meta" muted num>
                  {ratio > 1
                    ? t('fin.over', { v: fmt(spent - budget.monthlyLimit) })
                    : t('fin.left', { v: fmt(budget.monthlyLimit - spent) })}
                </Txt>
              </Press>
            ))
          ) : (
            <Empty text={t('fin.noBudgets')} action={t('ed.newBudget')} onAction={() => router.push('/edit/budget')} />
          )}
        </Panel>
      </View>

      {/* Savings goals */}
      <View style={{ gap: space.m }}>
        <SectionHead title={t('fin.goals')} action={t('c.add')} onAction={() => router.push('/edit/saving')} />
        <Panel style={{ gap: space.xl }}>
          {goals.length ? (
            goals.map((g) => {
              const eta = goalEta(g, avg);
              const req = requiredMonthly(g);
              return (
                <Press key={g.id} onPress={() => router.push(`/edit/saving?id=${g.id}`)} scaleTo={0.99} style={{ gap: 8 }}>
                  <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Txt v="label">{g.name}</Txt>
                      <Txt v="meta" muted num>
                        {fmt(g.current)} / {fmt(g.target)}
                        {g.dueDate ? ` · ${shortDate(g.dueDate, lang, prefs.dateFormat)}` : ''}
                      </Txt>
                    </View>
                    {g.current < g.target && (
                      <Button
                        label={t('fin.contribute')}
                        kind="raised"
                        compact
                        onPress={() => router.push(`/edit/contribute?id=${g.id}`)}
                      />
                    )}
                  </Row>
                  <Progress value={g.target ? g.current / g.target : 0} />
                  <Txt v="meta" muted>
                    {g.current >= g.target
                      ? t('fin.reached')
                      : [
                          req != null ? t('fin.required', { v: fmt(req) }) : null,
                          eta != null ? t('fin.eta', { n: eta }) : t('fin.etaUnknown'),
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                  </Txt>
                </Press>
              );
            })
          ) : (
            <Empty text={t('fin.noGoals')} action={t('ed.newSaving')} onAction={() => router.push('/edit/saving')} />
          )}
        </Panel>
      </View>

      {/* Net worth */}
      {hasAnyTx && (
        <View style={{ gap: space.m }}>
          <SectionHead title={t('fin.netWorth')} />
          <Panel style={{ gap: space.m }}>
            <Txt v="meta" muted>
              {t('fin.netWorthSub')}
            </Txt>
            <LineChart
              points={series.map((s) => s.cash + s.saved)}
              labels={series.map((s) => monthShort(lang, Number(s.month.split('-')[1]) - 1))}
              format={(v) => fmt(v)}
            />
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt v="meta" muted num>
                {t('fin.cash')}: {fmt(bal)}
              </Txt>
              <Txt v="meta" muted num>
                {t('fin.saved')}: {fmt(saved)}
              </Txt>
            </Row>
          </Panel>
        </View>
      )}

      {/* Projection */}
      {hasAnyTx && (
        <View style={{ gap: space.m }}>
          <SectionHead title={t('fin.projection')} />
          <Panel style={{ gap: space.m }}>
            {avg != null ? (
              <>
                <Txt v="meta" muted>
                  {t('fin.projectionSub', { v: fmt(avg) })}
                </Txt>
                <Row gap={space.xl}>
                  <View style={{ gap: 2 }}>
                    <Txt v="meta" muted>
                      {t('fin.in6')}
                    </Txt>
                    <Txt v="title" num>
                      {fmt(bal + avg * 6)}
                    </Txt>
                  </View>
                  <View style={{ gap: 2 }}>
                    <Txt v="meta" muted>
                      {t('fin.in12')}
                    </Txt>
                    <Txt v="title" num>
                      {fmt(bal + avg * 12)}
                    </Txt>
                  </View>
                </Row>
              </>
            ) : (
              <Txt muted>{t('fin.projectionNone')}</Txt>
            )}
          </Panel>
        </View>
      )}

      {/* Subscriptions */}
      <View style={{ gap: space.m }}>
        <SectionHead title={t('fin.subs')} action={t('c.add')} onAction={() => router.push('/edit/sub')} />
        <Panel style={{ gap: space.m }}>
          {subs.length ? (
            <>
              <Txt v="label" num>
                {t('fin.subsMonthly', { v: fmt(subscriptionsMonthly(subs)) })}
              </Txt>
              {subs.map((s) => (
                <Press
                  key={s.id}
                  onPress={() => router.push(`/edit/sub?id=${s.id}`)}
                  scaleTo={0.99}
                  style={{ flexDirection: 'row', justifyContent: 'space-between', minHeight: 44, alignItems: 'center' }}
                >
                  <View>
                    <Txt color={s.active ? p.text : p.muted}>{s.name}</Txt>
                    <Txt v="meta" muted>
                      {s.cycle === 'monthly' ? t('ed.monthly') : t('ed.yearly')} · {shortDate(s.nextDate, lang, prefs.dateFormat)}
                    </Txt>
                  </View>
                  <Txt v="label" num color={s.active ? p.text : p.muted}>
                    {fmt(s.amount)}
                  </Txt>
                </Press>
              ))}
            </>
          ) : (
            <Empty text={t('fin.noSubs')} action={t('ed.newSub')} onAction={() => router.push('/edit/sub')} />
          )}
        </Panel>
      </View>

      <Row gap={space.s} style={{ paddingHorizontal: 4 }}>
        <Icon name="lock" size={16} color={p.muted} />
        <Txt v="meta" muted style={{ flex: 1 }}>
          {t('fin.private')}
        </Txt>
      </Row>
      {!isCurrent && (
        <Button label={monthLabel(monthKey(new Date()), lang)} kind="ghost" compact onPress={() => setMonth(monthKey(new Date()))} />
      )}
    </TabScreen>
  );
}
