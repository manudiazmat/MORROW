import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Platform, View } from 'react-native';

import { AccentPicker } from '@/components/AccentPicker';
import { Wordmark } from '@/components/Logo';
import { StackScreen } from '@/components/Screen';
import { Button, Check, Field, Panel, Press, Progress, Row, Segmented, Toggle, Txt } from '@/components/ui';
import { Icon, type IconName } from '@/components/Icon';
import { assistantConfigured } from '@/lib/assistant';
import { confirmDestructive } from '@/lib/confirm';
import { exportData } from '@/lib/exportData';
import { money, parseAmount } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { ensurePermission, notificationsSupported, rescheduleReminders } from '@/lib/notifications';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { syncNow } from '@/lib/sync';
import { useStore } from '@/store';
import { useUI } from '@/store/ui';
import { space, usePalette } from '@/theme';
import type { AssistantModule, Currency, DateFormat, Language, ThemePreference, Units } from '@/types/models';

/** Settings section: title on top, its panel below (phone fold of the two-column settings pattern). */
function Section({ title, children, sub }: { title: string; children: ReactNode; sub?: string }) {
  return (
    <View style={{ gap: space.m }}>
      <View style={{ gap: 2 }}>
        <Txt v="section">{title}</Txt>
        {sub && (
          <Txt v="meta" muted>
            {sub}
          </Txt>
        )}
      </View>
      <Panel style={{ gap: space.l }}>{children}</Panel>
    </View>
  );
}

function SwitchRow({ label, sub, value, onChange }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Row style={{ justifyContent: 'space-between', alignItems: 'center' }} gap={space.l}>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt v="label">{label}</Txt>
        {sub && (
          <Txt v="meta" muted>
            {sub}
          </Txt>
        )}
      </View>
      <Toggle value={value} onChange={onChange} label={label} />
    </Row>
  );
}

function ActionRow({
  icon,
  label,
  sub,
  onPress,
  danger,
}: {
  icon: IconName;
  label: string;
  sub?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const p = usePalette();
  return (
    <Press onPress={onPress} scaleTo={0.985} style={{ flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 48 }}>
      <Icon name={icon} size={20} color={danger ? p.negative : p.muted} />
      <View style={{ flex: 1, gap: 2 }}>
        <Txt v="label" color={danger ? p.negative : p.text}>
          {label}
        </Txt>
        {sub && (
          <Txt v="meta" muted>
            {sub}
          </Txt>
        )}
      </View>
      <Icon name="right" size={16} color={p.faint} />
    </Press>
  );
}

function Label({ children }: { children: string }) {
  return (
    <Txt v="label" muted>
      {children}
    </Txt>
  );
}

export default function Profile() {
  const p = usePalette();
  const { t, lang } = useT();
  const prefs = useStore((s) => s.prefs);
  const setPrefs = useStore((s) => s.setPrefs);
  const user = useStore((s) => s.user);
  const outbox = useStore((s) => s.outbox.length);
  const opening = useStore((s) => s.finance.openingBalance);
  const setFinance = useStore((s) => s.setFinance);
  const resetAll = useStore((s) => s.resetAll);
  const sync = useUI((s) => s.sync);
  const toast = useUI((s) => s.showToast);
  const [name, setName] = useState(prefs.name);
  const [openingStr, setOpeningStr] = useState(opening ? String(opening / 100).replace('.', lang === 'es' ? ',' : '.') : '');
  const [notifDenied, setNotifDenied] = useState(false);

  useEffect(() => {
    void rescheduleReminders();
  }, [prefs.notifications.reminders, prefs.notifications.weeklyReview]);

  const setNotif = async (k: 'reminders' | 'weeklyReview' | 'insights', v: boolean) => {
    if (v && k !== 'insights' && notificationsSupported) {
      const ok = await ensurePermission();
      setNotifDenied(!ok);
      if (!ok) return;
    }
    setPrefs({ notifications: { ...prefs.notifications, [k]: v } });
  };

  return (
    <StackScreen title={t('pf.title')}>
      <Field
        label={t('pf.name')}
        value={name}
        onChangeText={setName}
        onBlur={() => setPrefs({ name: name.trim() })}
        autoCapitalize="words"
      />

      <Section title={t('pf.appearance')}>
        <Segmented<ThemePreference>
          value={prefs.theme}
          onChange={(v) => setPrefs({ theme: v })}
          options={[
            { value: 'system', label: t('pf.theme.system') },
            { value: 'light', label: t('pf.theme.light') },
            { value: 'dark', label: t('pf.theme.dark') },
          ]}
        />
        <View style={{ gap: 2, marginTop: space.s }}>
          <Txt v="label">{t('pf.accent')}</Txt>
          <Txt v="meta" muted>
            {t('pf.accentSub')}
          </Txt>
        </View>
        <AccentPicker />
        <AccentPreview />
      </Section>

      <Section title={t('pf.region')}>
        <Label>{t('pf.language')}</Label>
        <Segmented<Language>
          small
          value={prefs.language}
          onChange={(v) => setPrefs({ language: v })}
          options={[
            { value: 'es', label: 'Español' },
            { value: 'en', label: 'English' },
          ]}
        />
        <Label>{t('pf.currency')}</Label>
        <Segmented<Currency>
          small
          value={prefs.currency}
          onChange={(v) => setPrefs({ currency: v })}
          options={(['EUR', 'USD', 'GBP', 'MXN'] as Currency[]).map((c) => ({ value: c, label: c }))}
        />
        <Label>{t('pf.dateFormat')}</Label>
        <Segmented<DateFormat>
          small
          value={prefs.dateFormat}
          onChange={(v) => setPrefs({ dateFormat: v })}
          options={[
            { value: 'dmy', label: 'DD/MM' },
            { value: 'mdy', label: 'MM/DD' },
            { value: 'ymd', label: 'AAAA-MM' },
          ]}
        />
        <Label>{t('pf.weekStart')}</Label>
        <Segmented
          small
          value={String(prefs.weekStartsOn)}
          onChange={(v) => setPrefs({ weekStartsOn: Number(v) as 0 | 1 })}
          options={[
            { value: '1', label: t('pf.monday') },
            { value: '0', label: t('pf.sunday') },
          ]}
        />
        <Label>{t('pf.units')}</Label>
        <Segmented<Units>
          small
          value={prefs.units}
          onChange={(v) => setPrefs({ units: v })}
          options={[
            { value: 'metric', label: t('pf.metric') },
            { value: 'imperial', label: t('pf.imperial') },
          ]}
        />
      </Section>

      <Section title={t('pf.day')} sub={t('pf.dayHoursSub')}>
        <Label>{t('pf.dayHours')}</Label>
        <Row gap={space.m}>
          <Stepper
            value={prefs.dayStartHour}
            min={4}
            max={prefs.dayEndHour - 4}
            onChange={(v) => setPrefs({ dayStartHour: v })}
            suffix=":00"
          />
          <Txt muted>–</Txt>
          <Stepper
            value={prefs.dayEndHour}
            min={prefs.dayStartHour + 4}
            max={24}
            onChange={(v) => setPrefs({ dayEndHour: v })}
            suffix=":00"
          />
        </Row>
        <Label>{t('pf.sportTarget')}</Label>
        <Stepper value={prefs.weeklySportTarget} min={0} max={14} onChange={(v) => setPrefs({ weeklySportTarget: v })} />
      </Section>

      <Section title={t('pf.finance')}>
        <Field
          label={t('fin.opening')}
          hint={t('fin.openingSub')}
          value={openingStr}
          onChangeText={setOpeningStr}
          keyboardType="numbers-and-punctuation"
          placeholder={money(0, prefs.currency, lang)}
          onBlur={() => {
            const neg = openingStr.trim().startsWith('-');
            const c = parseAmount(openingStr.replace('-', ''));
            setFinance({ openingBalance: c == null ? 0 : neg ? -c : c });
          }}
        />
      </Section>

      <Section title={t('pf.notifications')}>
        {!notificationsSupported && (
          <Txt v="meta" muted>
            {t('pf.notif.web')}
          </Txt>
        )}
        <SwitchRow
          label={t('pf.notif.reminders')}
          sub={t('pf.notif.remindersSub')}
          value={prefs.notifications.reminders}
          onChange={(v) => setNotif('reminders', v)}
        />
        <SwitchRow
          label={t('pf.notif.weekly')}
          sub={t('pf.notif.weeklySub')}
          value={prefs.notifications.weeklyReview}
          onChange={(v) => setNotif('weeklyReview', v)}
        />
        <SwitchRow label={t('pf.notif.insights')} value={prefs.notifications.insights} onChange={(v) => setNotif('insights', v)} />
        {notifDenied && (
          <Txt v="meta" color={p.negative}>
            {t('pf.notif.denied')}
          </Txt>
        )}
      </Section>

      <Section title={t('pf.assistant')}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt v="label">{t('pf.as.status')}</Txt>
          <Txt v="label" color={assistantConfigured ? p.positive : p.muted}>
            {assistantConfigured ? t('pf.as.connected') : t('pf.as.off')}
          </Txt>
        </Row>
        <SwitchRow
          label={t('pf.as.consent')}
          value={prefs.assistant.consent}
          onChange={(v) => setPrefs({ assistant: { ...prefs.assistant, consent: v } })}
        />
        {prefs.assistant.consent && (
          <View style={{ gap: space.m }}>
            <Label>{t('pf.as.modules')}</Label>
            {(Object.keys(prefs.assistant.modules) as AssistantModule[]).map((m) => (
              <SwitchRow
                key={m}
                label={t(`pf.mod.${m}`)}
                value={prefs.assistant.modules[m]}
                onChange={(v) => setPrefs({ assistant: { ...prefs.assistant, modules: { ...prefs.assistant.modules, [m]: v } } })}
              />
            ))}
          </View>
        )}
      </Section>

      <Section title={t('pf.account')}>
        {user.mode === 'cloud' ? (
          <>
            <Txt v="label">{user.email}</Txt>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt v="meta" muted>
                {sync.status === 'error' || sync.status === 'offline'
                  ? sync.message
                  : outbox
                    ? t('pf.syncPending', { n: outbox })
                    : sync.lastSyncAt
                      ? t('pf.syncAt', { t: new Date(sync.lastSyncAt).toLocaleTimeString().slice(0, 5) })
                      : t('pf.syncNever')}
              </Txt>
              <Button
                label={t('pf.syncNow')}
                kind="raised"
                compact
                icon="refresh"
                onPress={() => void syncNow()}
                disabled={sync.status === 'syncing'}
              />
            </Row>
            <ActionRow icon="profile" label={t('pf.signOut')} onPress={() => void supabase?.auth.signOut()} />
            <ActionRow
              icon="trash"
              danger
              label={t('pf.deleteAccount')}
              onPress={async () => {
                const ok = await confirmDestructive(t('pf.deleteAccount'), t('pf.deleteAccountBody'), t('c.delete'), t('c.cancel'));
                if (!ok || !supabase) return;
                const { error } = await supabase.functions.invoke('delete-account');
                if (error) return toast(error.message);
                await supabase.auth.signOut();
              }}
            />
          </>
        ) : (
          <>
            <View style={{ gap: 2 }}>
              <Txt v="label">{t('pf.local')}</Txt>
              <Txt v="meta" muted>
                {supabaseConfigured ? t('pf.localSub') : t('pf.syncOff')}
              </Txt>
            </View>
            {supabaseConfigured && (
              <Button
                label={t('pf.signIn')}
                kind="raised"
                compact
                onPress={() => router.push('/auth')}
                style={{ alignSelf: 'flex-start' }}
              />
            )}
          </>
        )}
      </Section>

      <Section title={t('pf.privacy')} sub={t('pf.privacyBody')}>
        <ActionRow
          icon="export"
          label={t('pf.export')}
          sub={t('pf.exportSub')}
          onPress={() => void exportData().then(() => Platform.OS === 'web' && toast(t('pf.exported')))}
        />
        <ActionRow icon="flower" label={t('pf.criteria')} onPress={() => router.push('/life-balance/criteria')} />
        <ActionRow
          icon="trash"
          danger
          label={t('pf.wipe')}
          onPress={async () => {
            const ok = await confirmDestructive(t('pf.wipe'), t('pf.wipeBody'), t('c.delete'), t('c.cancel'));
            if (!ok) return;
            resetAll();
            router.replace('/welcome');
          }}
        />
      </Section>

      <View style={{ alignItems: 'center', gap: space.s, paddingTop: space.l }}>
        <Wordmark size={14} />
        <Txt v="meta" muted>
          {t('brand.tagline')}
        </Txt>
      </View>
    </StackScreen>
  );
}

function Stepper({
  value,
  min,
  max,
  onChange,
  suffix = '',
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  const p = usePalette();
  return (
    <Row gap={space.s}>
      <Press
        onPress={() => onChange(Math.max(min, value - 1))}
        accessibilityLabel="−"
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: p.raised,
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `-3px -3px 8px ${p.shadowLight}, 4px 5px 12px ${p.shadowDark}`,
        }}
      >
        <Txt v="title">−</Txt>
      </Press>
      <Txt v="section" num style={{ minWidth: 52, textAlign: 'center' }}>
        {value}
        {suffix}
      </Txt>
      <Press
        onPress={() => onChange(Math.min(max, value + 1))}
        accessibilityLabel="+"
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: p.raised,
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `-3px -3px 8px ${p.shadowLight}, 4px 5px 12px ${p.shadowDark}`,
        }}
      >
        <Txt v="title">+</Txt>
      </Press>
    </Row>
  );
}

/** Small live sample of what the accent touches: a progress bar, a check and a toggle. The logo stays in ink. */
function AccentPreview() {
  const p = usePalette();
  const [on, setOn] = useState(true);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ flexDirection: 'row', alignItems: 'center', gap: space.l, backgroundColor: p.ground, borderRadius: 16, padding: space.m }}
    >
      <View style={{ flex: 1 }}>
        <Progress value={0.62} />
      </View>
      <Check done={on} label="" onPress={() => setOn((v) => !v)} />
      <Toggle value={on} onChange={setOn} label="" />
    </View>
  );
}
