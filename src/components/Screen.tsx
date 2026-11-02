import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '@/lib/i18n';
import { useUI } from '@/store/ui';
import { layout, raisedShadow, space, usePalette } from '@/theme';
import { Mark } from './Icon';
import { IconButton, Press, Txt } from './ui';
import { useBottomSpace } from './TabBar';

/** Opens the assistant, remembering which module it was opened from. */
export function AssistantButton({ context }: { context: string }) {
  const p = usePalette();
  const { t } = useT();
  const setCtx = useUI((s) => s.setAssistantContext);
  return (
    <Press
      onPress={() => {
        setCtx(context);
        router.push('/assistant');
      }}
      accessibilityLabel={t('a11y.assistant')}
      hitSlop={6}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: p.raised,
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: raisedShadow(p),
      }}
    >
      <Mark size={22} color={p.text} accent={p.accent} />
    </Press>
  );
}

/** Tab screen: large title, assistant access, scrolling content above the floating bar. */
export function TabScreen({
  title,
  subtitle,
  context,
  children,
  right,
  onRefresh,
  refreshing,
  header,
}: {
  title?: string;
  subtitle?: string;
  context: string;
  children: ReactNode;
  right?: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  header?: ReactNode;
}) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const bottom = useBottomSpace();
  return (
    <View style={{ flex: 1, backgroundColor: p.ground }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + space.l,
          paddingHorizontal: layout.gutter,
          paddingBottom: bottom,
          gap: space.xxl,
          width: '100%',
          maxWidth: layout.maxWidth,
          alignSelf: 'center',
        }}
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={p.muted} /> : undefined}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.m }}>
          <View style={{ flex: 1, gap: 4, paddingTop: 4 }}>
            {header ?? (
              <>
                {title && <Txt v="h1">{title}</Txt>}
                {subtitle && <Txt muted>{subtitle}</Txt>}
              </>
            )}
          </View>
          {right}
          <AssistantButton context={context} />
        </View>
        {children}
      </ScrollView>
    </View>
  );
}

/** Pushed screen with a back button. */
export function StackScreen({
  title,
  children,
  right,
  contentStyle,
  footer,
  scroll = true,
}: {
  title: string;
  children: ReactNode;
  right?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  footer?: ReactNode;
  scroll?: boolean;
}) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { t } = useT();
  return (
    <View style={{ flex: 1, backgroundColor: p.ground }}>
      <View
        style={{
          paddingTop: insets.top + space.s,
          paddingHorizontal: layout.gutter,
          paddingBottom: space.m,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.m,
          width: '100%',
          maxWidth: layout.maxWidth,
          alignSelf: 'center',
        }}
      >
        <IconButton icon="left" label={t('a11y.back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <Txt v="title" numberOfLines={1} style={{ flex: 1 }}>
          {title}
        </Txt>
        {right}
      </View>
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            {
              paddingHorizontal: layout.gutter,
              paddingTop: space.s,
              paddingBottom: insets.bottom + 120,
              gap: space.xxl,
              width: '100%',
              maxWidth: layout.maxWidth,
              alignSelf: 'center',
            },
            contentStyle,
          ]}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, contentStyle]}>{children}</View>
      )}
      {footer && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: Math.max(insets.bottom, 12) + 8,
            alignItems: 'center',
            paddingHorizontal: layout.gutter,
          }}
        >
          <View style={{ width: '100%', maxWidth: layout.maxWidth - layout.gutter * 2 }}>{footer}</View>
        </View>
      )}
    </View>
  );
}
