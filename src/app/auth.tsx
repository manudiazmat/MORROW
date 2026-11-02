import { router } from 'expo-router';
import { useState } from 'react';

import { StackScreen } from '@/components/Screen';
import { Button, Field, Panel, Txt } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { useStore } from '@/store';
import { space, usePalette } from '@/theme';

export default function Auth() {
  const { t } = useT();
  const p = usePalette();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async () => {
    if (!supabase) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    const fn = mode === 'in' ? supabase.auth.signInWithPassword : supabase.auth.signUp;
    const { data, error: err } = await fn.call(supabase.auth, { email: email.trim(), password });
    setBusy(false);
    if (err) return setError(t('auth.error', { msg: err.message }));
    if (mode === 'up' && !data.session) return setInfo(t('auth.checkEmail'));
    const st = useStore.getState();
    if (!st.prefs.onboarded) st.setPrefs({ onboarded: true });
    router.dismissAll?.();
    router.replace('/');
  };

  return (
    <StackScreen title={t('auth.title')}>
      {!supabaseConfigured ? (
        <Panel>
          <Txt>{t('auth.notConfigured')}</Txt>
        </Panel>
      ) : (
        <>
          <Field
            label={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
          />
          <Field
            label={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
            hint={mode === 'up' ? t('auth.passwordHint') : undefined}
            error={error}
          />
          {info && <Txt color={p.positive}>{info}</Txt>}
          <Button
            label={mode === 'in' ? t('auth.signIn') : t('auth.signUp')}
            onPress={submit}
            disabled={busy || !email.includes('@') || password.length < 8}
            style={{ marginTop: space.s }}
          />
          <Button
            kind="ghost"
            label={mode === 'in' ? t('auth.toSignUp') : t('auth.toSignIn')}
            onPress={() => setMode(mode === 'in' ? 'up' : 'in')}
          />
        </>
      )}
    </StackScreen>
  );
}
