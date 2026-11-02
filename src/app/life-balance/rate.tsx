import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ScoreScale } from '@/components/ScoreScale';
import { StackScreen } from '@/components/Screen';
import { Button, Row, Txt, haptic } from '@/components/ui';
import { useLifeBalance } from '@/hooks/useData';
import { useT } from '@/lib/i18n';
import { useStore } from '@/store';
import { useUI } from '@/store/ui';
import { space } from '@/theme';
import type { DimensionKey } from '@/types/models';

/** Monthly self-rating of every enabled dimension, 0–12. */
export default function Rate() {
  const { t } = useT();
  const { results, label } = useLifeBalance();
  const setRating = useStore((s) => s.setRating);
  const [vals, setVals] = useState<Record<string, number | null>>(() => Object.fromEntries(results.map((r) => [r.key, r.self])));
  return (
    <StackScreen
      title={t('lb.rateTitle')}
      footer={
        <Button
          label={t('c.save')}
          onPress={() => {
            for (const [k, v] of Object.entries(vals)) if (v != null) setRating(k as DimensionKey, v);
            haptic('success');
            useUI.getState().showToast(t('c.saved'));
            router.back();
          }}
        />
      }
    >
      <Txt muted>{t('lb.rateSub')}</Txt>
      {results.map((r, i) => (
        <Animated.View key={r.key} entering={FadeInDown.duration(320).delay(i * 50)} style={{ gap: space.s }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Txt v="label">{label(r.key)}</Txt>
              <Txt v="meta" muted numberOfLines={1}>
                {t(`dimd.${r.key}`)}
              </Txt>
            </View>
            <Txt v="section" num>
              {vals[r.key] == null ? '—' : vals[r.key]}
            </Txt>
          </Row>
          <ScoreScale value={vals[r.key] ?? null} onChange={(v) => setVals((s) => ({ ...s, [r.key]: v }))} label={label(r.key)} />
        </Animated.View>
      ))}
    </StackScreen>
  );
}
