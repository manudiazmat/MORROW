import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { live, useStore } from '@/store';
import { addDays, hhmm, startOfDay } from './dates';
import { translate } from './i18n';
import { occurrences } from './recurrence';

/**
 * Local reminders only (no push server). Upcoming occurrences of the next 7 days are re-scheduled
 * on launch and whenever events change, which also covers recurring events.
 */
export const notificationsSupported = Platform.OS !== 'web';

if (notificationsSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function ensurePermission(): Promise<boolean> {
  if (!notificationsSupported) return false;
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  if (!cur.canAskAgain) return false;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

export async function rescheduleReminders(): Promise<void> {
  if (!notificationsSupported) return;
  const s = useStore.getState();
  await Notifications.cancelAllScheduledNotificationsAsync();
  const lang = s.prefs.language;
  if (s.prefs.notifications.reminders) {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return;
    const now = new Date();
    const occ = occurrences(
      live(s.events).filter((e) => e.reminderMinutes != null),
      startOfDay(now),
      addDays(startOfDay(now), 8),
    );
    let n = 0;
    for (const o of occ) {
      const at = new Date(o.start.getTime() - (o.event.reminderMinutes ?? 0) * 60000);
      if (at <= now) continue;
      if (++n > 50) break;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: o.event.title,
          body: o.event.allDay ? translate(lang, 'plan.allDay') : `${hhmm(o.start)}${o.event.location ? ` · ${o.event.location}` : ''}`,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
      });
    }
  }
  if (s.prefs.notifications.weeklyReview) {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return;
    await Notifications.scheduleNotificationAsync({
      content: { title: translate(lang, 'rv.title'), body: translate(lang, 'home.reviewSub') },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 1, hour: 18, minute: 0 },
    });
  }
}
