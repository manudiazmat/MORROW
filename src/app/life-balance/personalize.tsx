import { View } from 'react-native';

import { StackScreen } from '@/components/Screen';
import { Field, Panel, Row, Segmented, Toggle, Txt } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { useStore } from '@/store';
import { space } from '@/theme';

/** Rename, prioritise or hide dimensions. Priority is what matters to the person, never a score. */
export default function Personalize() {
  const { t } = useT();
  const dims = useStore((s) => s.dimensions);
  const setDim = useStore((s) => s.setDimension);
  const enabledCount = dims.filter((d) => d.enabled).length;
  return (
    <StackScreen title={t('lb.personalize')}>
      <Txt muted>{t('lb.priorityNote')}</Txt>
      {dims.map((d) => (
        <Panel key={d.key} style={{ gap: space.l }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt v="section">{d.label || t(`dim.${d.key}`)}</Txt>
            <Toggle
              value={d.enabled}
              label={t('lb.enabled')}
              onChange={(v) => {
                if (!v && enabledCount <= 3) return;
                setDim(d.key, { enabled: v });
              }}
            />
          </Row>
          {d.enabled && (
            <View style={{ gap: space.l }}>
              <Field
                label={t('lb.label')}
                value={d.label ?? ''}
                placeholder={t(`dim.${d.key}`)}
                onChangeText={(v) => setDim(d.key, { label: v || null })}
              />
              <View style={{ gap: space.s }}>
                <Txt v="label" muted>
                  {t('lb.priority')}
                </Txt>
                <Segmented
                  small
                  value={String(d.priority)}
                  onChange={(v) => setDim(d.key, { priority: Number(v) as 1 | 2 | 3 })}
                  options={[1, 2, 3].map((n) => ({ value: String(n), label: t(`lb.pr.${n}`) }))}
                />
              </View>
            </View>
          )}
        </Panel>
      ))}
    </StackScreen>
  );
}
