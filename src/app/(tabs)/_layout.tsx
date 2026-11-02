import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/TabBar';
import { useStore } from '@/store';
import { usePalette } from '@/theme';

export default function TabsLayout() {
  const onboarded = useStore((s) => s.prefs.onboarded);
  const p = usePalette();
  if (!onboarded) return <Redirect href="/welcome" />;
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: p.ground }, animation: 'fade' }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="plan" />
      <Tabs.Screen name="finance" />
      <Tabs.Screen name="goals" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
