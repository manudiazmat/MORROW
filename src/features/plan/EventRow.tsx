import { router } from 'expo-router';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Icon } from '@/components/Icon';
import { Press, Row, Txt } from '@/components/ui';
import { hhmm, minutesBetween } from '@/lib/dates';
import { durationLabel } from '@/lib/format';
import { useT } from '@/lib/i18n';
import type { Occurrence } from '@/lib/recurrence';
import { catColor, radius, space, usePalette } from '@/theme';

/** Calendar entry: a category bar on the left edge of a pale row (identity, not data). */
export function EventRow({ o, conflictWith, compact }: { o: Occurrence; conflictWith?: string; compact?: boolean }) {
  const p = usePalette();
  const { t, lang } = useT();
  const ev = o.event;
  return (
    <Animated.View entering={FadeIn.duration(200)}>
      <Press
        onPress={() => router.push(`/edit/event?id=${ev.id}`)}
        scaleTo={0.985}
        accessibilityLabel={`${ev.title}, ${ev.allDay ? t('plan.allDay') : `${hhmm(o.start)}–${hhmm(o.end)}`}`}
        style={{
          flexDirection: 'row',
          gap: space.m,
          backgroundColor: p.panel,
          borderRadius: radius.row,
          padding: compact ? space.m : space.l,
          alignItems: 'stretch',
        }}
      >
        <View style={{ width: 4, borderRadius: 2, backgroundColor: catColor(p, ev.category) }} />
        <View style={{ width: compact ? 44 : 50, gap: 2 }}>
          <Txt v="label" num>
            {ev.allDay ? t('plan.allDay') : hhmm(o.start)}
          </Txt>
          {!ev.allDay && !compact && (
            <Txt v="meta" muted num>
              {hhmm(o.end)}
            </Txt>
          )}
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Txt v="label" numberOfLines={2}>
            {ev.title}
          </Txt>
          {!compact && (
            <Row gap={space.s} style={{ flexWrap: 'wrap' }}>
              <Txt v="meta" muted>
                {t(`cat.${ev.category}`)}
                {!ev.allDay ? ` · ${durationLabel(minutesBetween(o.start, o.end), lang)}` : ''}
              </Txt>
              {ev.recurrence !== 'none' && <Icon name="repeat" size={13} color={p.muted} />}
              {ev.location ? (
                <Row gap={4}>
                  <Icon name="pin" size={13} color={p.muted} />
                  <Txt v="meta" muted numberOfLines={1}>
                    {ev.location}
                  </Txt>
                </Row>
              ) : null}
            </Row>
          )}
          {conflictWith && (
            <Txt v="meta" color={p.negative}>
              {t('plan.conflict', { title: conflictWith })}
            </Txt>
          )}
        </View>
      </Press>
    </Animated.View>
  );
}
