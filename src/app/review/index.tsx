import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { StackScreen } from '@/components/Screen';
import { Button, Field, IconButton, Panel, Press, Row, SectionHead, Txt, haptic } from '@/components/ui';
import { ReviewView } from '@/features/ReviewView';
import { assistantConfigured } from '@/lib/assistant';
import { addDays, dateKey, startOfWeek } from '@/lib/dates';
import { computeReview } from '@/lib/domain/review';
import { shortDate } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { useStore } from '@/store';
import { useUI } from '@/store/ui';
import { space } from '@/theme';

/** Weekly review, computed from what was logged. Can be saved with a note and revisited. */
export default function Review() {
  const { t, lang } = useT();
  const state = useStore();
  const [offset, setOffset] = useState(0);
  const ws = addDays(startOfWeek(new Date(), state.prefs.weekStartsOn), -7 * offset);
  const wsk = dateKey(ws);
  const saved = state.reviews.find((r) => r.weekStart === wsk);
  const live = useMemo(() => computeReview(state, wsk), [state, wsk]);
  const [note, setNote] = useState(saved?.note ?? '');

  return (
    <StackScreen title={t('rv.title')}>
      <Row style={{ justifyContent: 'space-between' }}>
        <IconButton icon="left" flat label={t('a11y.back')} onPress={() => setOffset((o) => o + 1)} />
        <Txt v="section">{t('rv.week', { date: shortDate(wsk, lang, state.prefs.dateFormat) })}</Txt>
        <IconButton icon="right" flat label={t('c.continue')} onPress={() => setOffset((o) => Math.max(0, o - 1))} />
      </Row>

      <Animated.View key={wsk} entering={FadeIn.duration(200)} style={{ gap: space.xxl }}>
        <ReviewView r={live} />
        <Field label={t('rv.note')} placeholder={t('rv.notePh')} value={note} onChangeText={setNote} multiline />
        <Row gap={space.m}>
          <Button
            label={t('rv.save')}
            onPress={() => {
              state.saveReview({ ...live, note });
              haptic('success');
              useUI.getState().showToast(t('rv.saved'));
            }}
            style={{ flex: 1 }}
          />
        </Row>
        {assistantConfigured && offset === 0 && (
          <Button
            label={t('rv.plan')}
            kind="raised"
            icon="mark"
            onPress={() => {
              useUI.getState().setAssistantContext('plan');
              router.push('/assistant');
            }}
          />
        )}
      </Animated.View>

      {state.reviews.length > 0 && (
        <View style={{ gap: space.m }}>
          <SectionHead title={t('rv.past')} />
          <Panel style={{ padding: space.s }}>
            {state.reviews.map((r) => (
              <Press
                key={r.weekStart}
                onPress={() => router.push(`/review/${r.weekStart}`)}
                style={{ minHeight: 52, justifyContent: 'center', paddingHorizontal: space.m }}
              >
                <Txt>{t('rv.week', { date: shortDate(r.weekStart, lang, state.prefs.dateFormat) })}</Txt>
                <Txt v="meta" muted numberOfLines={1}>
                  {r.tasksDone} {t('rv.tasksDone').toLowerCase()}
                  {r.note ? ` · ${r.note}` : ''}
                </Txt>
              </Press>
            ))}
          </Panel>
        </View>
      )}
    </StackScreen>
  );
}
