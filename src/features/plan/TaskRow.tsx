import { router } from 'expo-router';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { Check, Dot, Press, Row, Txt } from '@/components/ui';
import { dateKey, diffDays, parseDate } from '@/lib/dates';
import { shortDate } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { useStore } from '@/store';
import { useUI } from '@/store/ui';
import { catColor, radius, space, usePalette } from '@/theme';
import type { Task } from '@/types/models';

export function dueLabel(due: string | null | undefined, t: (k: string) => string, lang: 'es' | 'en', fmt: 'dmy' | 'mdy' | 'ymd') {
  if (!due) return null;
  const d = diffDays(parseDate(due), new Date());
  if (d === 0) return t('c.today');
  if (d === 1) return t('c.tomorrow');
  if (d === -1) return t('c.yesterday');
  return shortDate(due, lang, fmt);
}

export function TaskRow({ task }: { task: Task }) {
  const p = usePalette();
  const { t, lang } = useT();
  const fmt = useStore((s) => s.prefs.dateFormat);
  const complete = useStore((s) => s.completeTask);
  const showToast = useUI((s) => s.showToast);
  const done = task.status === 'done';
  const overdue = !done && !!task.due && task.due < dateKey(new Date());
  const due = dueLabel(task.due, t, lang, fmt);
  const subDone = task.subtasks.filter((s) => s.done).length;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(140)}
      layout={LinearTransition.springify().damping(20).stiffness(220)}
    >
      <Press
        onPress={() => router.push(`/edit/task?id=${task.id}`)}
        scaleTo={0.985}
        accessibilityLabel={task.title}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.m,
          minHeight: 56,
          paddingHorizontal: space.m,
          paddingVertical: space.s,
          borderRadius: radius.row,
        }}
      >
        <Check
          done={done}
          label={task.title}
          onPress={() => {
            complete(task.id, !done);
            if (!done) showToast(`${t('st.done')}: ${task.title}`, { label: t('c.undo'), run: () => complete(task.id, false) });
          }}
        />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt numberOfLines={2} color={done ? p.muted : p.text} style={done ? { textDecorationLine: 'line-through' } : undefined}>
            {task.title}
          </Txt>
          {(due || task.subtasks.length > 0 || task.priority === 1) && (
            <Row gap={space.s}>
              <Dot color={catColor(p, task.category)} size={6} />
              {due && (
                <Txt v="meta" color={overdue ? p.negative : p.muted}>
                  {overdue ? `${t('plan.overdue')} · ${due}` : due}
                </Txt>
              )}
              {task.subtasks.length > 0 && (
                <Txt v="meta" muted num>
                  {t('plan.subtasks', { done: subDone, n: task.subtasks.length })}
                </Txt>
              )}
              {task.priority === 1 && !done && (
                <Txt v="meta" muted>
                  {t('prio.1')}
                </Txt>
              )}
            </Row>
          )}
        </View>
      </Press>
    </Animated.View>
  );
}
