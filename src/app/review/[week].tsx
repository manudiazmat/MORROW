import { useLocalSearchParams } from 'expo-router';

import { StackScreen } from '@/components/Screen';
import { Panel, Txt } from '@/components/ui';
import { ReviewView } from '@/features/ReviewView';
import { shortDate } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { useStore } from '@/store';

export default function SavedReview() {
  const { week } = useLocalSearchParams<{ week: string }>();
  const { t, lang } = useT();
  const r = useStore((s) => s.reviews.find((x) => x.weekStart === week));
  const fmt = useStore((s) => s.prefs.dateFormat);
  return (
    <StackScreen title={t('rv.week', { date: shortDate(week, lang, fmt) })}>
      {r ? (
        <>
          {r.note ? (
            <Panel>
              <Txt v="bodyL">{r.note}</Txt>
            </Panel>
          ) : null}
          <ReviewView r={r} />
        </>
      ) : null}
    </StackScreen>
  );
}
