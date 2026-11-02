import { Modal, Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';

import { useUI } from '@/store/ui';
import { radius, space, usePalette } from '@/theme';
import { Button, Txt } from './ui';

/** In-app destructive confirmation (web). Centered, scales in from 0.95 with the fade. */
export function ConfirmDialog() {
  const c = useUI((s) => s.confirm);
  const close = useUI((s) => s.closeConfirm);
  const p = usePalette();
  if (!c) return null;
  const done = (ok: boolean) => {
    close();
    c.resolve(ok);
  };
  return (
    <Modal transparent visible animationType="none" onRequestClose={() => done(false)}>
      <Animated.View
        entering={FadeIn.duration(160)}
        exiting={FadeOut.duration(120)}
        style={{ flex: 1, backgroundColor: p.scrim, justifyContent: 'center', padding: 24 }}
      >
        <Pressable
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          onPress={() => done(false)}
          accessibilityLabel={c.cancelLabel}
        />
        <Animated.View
          entering={ZoomIn.duration(200).withInitialValues({ transform: [{ scale: 0.95 }] })}
          accessibilityViewIsModal
          accessibilityRole="alert"
          style={{
            backgroundColor: p.ground,
            borderRadius: radius.panel,
            padding: space.xl,
            gap: space.l,
            width: '100%',
            maxWidth: 400,
            alignSelf: 'center',
            boxShadow: '0px 16px 40px rgba(0,0,0,0.25)',
          }}
        >
          <View style={{ gap: space.s }}>
            <Txt v="title">{c.title}</Txt>
            <Txt muted>{c.body}</Txt>
          </View>
          <View style={{ flexDirection: 'row', gap: space.m }}>
            <Button kind="raised" compact label={c.cancelLabel} onPress={() => done(false)} style={{ flex: 1 }} />
            <Button kind="danger" compact label={c.confirmLabel} onPress={() => done(true)} style={{ flex: 1 }} />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
