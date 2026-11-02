import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, useFonts } from '@expo-google-fonts/manrope';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { QuickAdd } from '@/features/QuickAdd';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Toast } from '@/components/Toast';
import { useLifeBalance } from '@/hooks/useData';
import { monthKey, nowISO } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import { rescheduleReminders } from '@/lib/notifications';
import { pullSettings, startSyncLoop, syncNow } from '@/lib/sync';
import { useStore } from '@/store';
import { usePalette } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

/** Keeps this month's Life Balance snapshot current; past months stay frozen. */
function SnapshotKeeper() {
  const { all } = useLifeBalance();
  const upsert = useStore((s) => s.upsertSnapshot);
  useEffect(() => {
    if (!all.some((r) => r.combined != null)) return;
    const id = setTimeout(() => {
      upsert({
        month: monthKey(new Date()),
        takenAt: nowISO(),
        values: Object.fromEntries(all.map((r) => [r.key, { self: r.self, data: r.data, combined: r.combined }])) as never,
      });
    }, 800);
    return () => clearTimeout(id);
  }, [all, upsert]);
  return null;
}

function AuthBridge() {
  useEffect(() => {
    if (!supabase) return;
    const stop = startSyncLoop();
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      const st = useStore.getState();
      if (session?.user) {
        if (st.user.id !== session.user.id) {
          st.setUser({ id: session.user.id, email: session.user.email ?? null, mode: 'cloud' });
          await pullSettings(session.user.id);
          void syncNow();
        }
      } else if (event === 'SIGNED_OUT') {
        st.setUser({ id: null, email: null, mode: 'local' });
      }
    });
    return () => {
      stop();
      data.subscription.unsubscribe();
    };
  }, []);
  return null;
}

export default function RootLayout() {
  // A web host that already ships Manrope as @font-face (the single-file demo) sets this flag.
  const inlineFonts = Platform.OS === 'web' && !!(globalThis as { __MORROW_INLINE_FONTS__?: boolean }).__MORROW_INLINE_FONTS__;
  const [fontsLoaded, fontError] = useFonts(
    inlineFonts ? {} : { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold },
  );
  const hydrated = useStore((s) => s.hydrated);
  const p = usePalette();
  const ready = (fontsLoaded || !!fontError) && hydrated;

  // never stay on a blank screen if storage can't answer
  useEffect(() => {
    const id = setTimeout(() => {
      if (!useStore.getState().hydrated) useStore.setState({ hydrated: true });
    }, 1500);
    return () => clearTimeout(id);
  }, []);
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(p.ground).catch(() => {});
  }, [p.ground]);
  useEffect(() => {
    if (!ready) return;
    SplashScreen.hideAsync().catch(() => {});
    rescheduleReminders().catch(() => {});
  }, [ready]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: p.ground }} />;

  return (
    <SafeAreaProvider>
      <StatusBar style={p.statusBar} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: p.ground },
          animation: 'default',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
        <Stack.Screen name="assistant" options={{ presentation: 'modal' }} />
        <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
        <Stack.Screen name="edit/[kind]" options={{ presentation: 'modal' }} />
      </Stack>
      <QuickAdd />
      <Toast />
      <ConfirmDialog />
      <SnapshotKeeper />
      <AuthBridge />
    </SafeAreaProvider>
  );
}
