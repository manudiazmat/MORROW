import { View } from 'react-native';

import { StackScreen } from '@/components/Screen';
import { Panel, Txt } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { space } from '@/theme';

const DIMS = ['career', 'finance', 'health', 'relationships', 'growth', 'leisure', 'home', 'purpose'] as const;
const SOURCES: Record<(typeof DIMS)[number], string[]> = {
  career: ['lb.basis.workTasks', 'lb.basis.goals', 'lb.basis.habits'],
  finance: ['lb.basis.savingsRate', 'lb.basis.budgets', 'lb.basis.savingsGoals'],
  health: ['lb.basis.sport', 'lb.basis.habits', 'lb.basis.goals'],
  relationships: ['lb.basis.goals'],
  growth: ['lb.basis.learning', 'lb.basis.habits', 'lb.basis.goals'],
  leisure: ['lb.basis.leisureTime', 'lb.basis.experiences', 'lb.basis.goals'],
  home: ['lb.basis.habits', 'lb.basis.goals'],
  purpose: ['lb.basis.longGoals', 'lb.basis.moving'],
};

export default function Criteria() {
  const { t } = useT();
  return (
    <StackScreen title={t('lb.criteria')}>
      <View style={{ gap: space.m }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Txt key={i} v="bodyL">
            {t(`lb.crit.${i}`)}
          </Txt>
        ))}
      </View>
      {DIMS.map((d) => (
        <Panel key={d} style={{ gap: space.s }}>
          <Txt v="section">{t(`dim.${d}`)}</Txt>
          {SOURCES[d].map((k) => (
            <Txt key={k} muted>
              ·{' '}
              {t(k, { n: 'n', done: 'n', missed: 'n', pct: 'x', ok: 'n', target: 'n', total: 'n' })
                .replace(/\bn\b/g, '…')
                .replace(/\bx\b/g, '…')}
            </Txt>
          ))}
        </Panel>
      ))}
    </StackScreen>
  );
}
