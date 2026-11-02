import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Mark } from '@/components/Icon';
import { Wordmark } from '@/components/Logo';
import { Button, Field, Gap, Txt } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { useStore } from '@/store';
import { insetShadow, layout, space, usePalette } from '@/theme';

/** First run: the symbol in a soft well (from the reference), the name, and a way in. */
export default function Welcome() {
  const p = usePalette();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const setPrefs = useStore((s) => s.setPrefs);
  const [name, setName] = useState(useStore.getState().prefs.name);
  const start = () => {
    setPrefs({ name: name.trim(), onboarded: true });
    router.replace('/');
  };
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: p.ground }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 28,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: layout.gutter + 4,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.duration(500).delay(80)}>
          <Wordmark size={18} />
        </Animated.View>
        <View style={{ flex: 1, minHeight: 300, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View
            entering={ZoomIn.springify()
              .damping(16)
              .stiffness(120)
              .withInitialValues({ transform: [{ scale: 0.92 }] })}
            style={{
              width: 196,
              height: 196,
              borderRadius: 98,
              backgroundColor: p.ground,
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: insetShadow(p) + `, inset 10px 12px 24px ${p.insetDark}, inset -10px -10px 22px ${p.insetLight}`,
            }}
          >
            <Mark size={72} color={p.text} accent={p.accent} />
          </Animated.View>
        </View>
        <Animated.View entering={FadeInDown.duration(480).delay(220)} style={{ gap: space.s }}>
          <Txt v="h1">{t('ob.hello')}</Txt>
          <Txt v="bodyL" muted>
            {t('ob.lead')}
          </Txt>
        </Animated.View>
        <Gap h={space.xxl} />
        <Animated.View entering={FadeInDown.duration(480).delay(300)} style={{ gap: space.l }}>
          <Field
            label={t('ob.name')}
            placeholder={t('ob.namePh')}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoComplete="given-name"
            returnKeyType="go"
            onSubmitEditing={start}
          />
          <Button label={t('ob.start')} onPress={start} />
          <Button label={t('ob.account')} kind="ghost" onPress={() => router.push('/auth')} />
          <Txt v="meta" muted center>
            {t('ob.localNote')}
          </Txt>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
