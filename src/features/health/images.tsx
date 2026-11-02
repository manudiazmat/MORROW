import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/Icon';
import { IconButton, Press, Row, Txt } from '@/components/ui';
import { cameraAvailable, deleteImage, pickImages, type ImageSource } from '@/lib/images';
import { useT } from '@/lib/i18n';
import { useUI } from '@/store/ui';
import { radius, space, usePalette } from '@/theme';

/** An image the person added, or a calm placeholder when there is none or it can't load. */
export function Thumb({
  uri,
  size,
  style,
  icon = 'image',
}: {
  uri?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
  icon?: IconName;
}) {
  const p = usePalette();
  const [failed, setFailed] = useState(false);
  return (
    <View
      style={[
        { backgroundColor: p.panelStrong, borderRadius: radius.row, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
        size ? { width: size, height: size } : null,
        style,
      ]}
    >
      {uri && !failed ? (
        <Image
          source={{ uri }}
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Icon name={icon} size={22} color={p.faint} />
      )}
    </View>
  );
}

/** Full-screen viewer: fades in, the photo settles from 0.96; swipe sideways between images. */
export function ImageViewer({ images, index, onClose }: { images: string[]; index: number | null; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { t } = useT();
  if (index == null) return null;
  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(140)}
        style={{ flex: 1, backgroundColor: 'rgba(14,15,13,0.94)' }}
      >
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} contentOffset={{ x: index * width, y: 0 }}>
          {images.map((uri) => (
            <Pressable
              key={uri}
              onPress={onClose}
              accessibilityLabel={t('img.close')}
              style={{ width, height, alignItems: 'center', justifyContent: 'center' }}
            >
              <Animated.View entering={ZoomIn.duration(240).withInitialValues({ transform: [{ scale: 0.96 }] })}>
                <Image
                  source={{ uri }}
                  style={{ width: width - 24, height: height - insets.top - insets.bottom - 120 }}
                  resizeMode="contain"
                />
              </Animated.View>
            </Pressable>
          ))}
        </ScrollView>
        <View style={{ position: 'absolute', top: insets.top + 12, right: 16 }}>
          <IconButton icon="close" label={t('img.close')} onPress={onClose} />
        </View>
      </Animated.View>
    </Modal>
  );
}

/** Grid of images with add (library / camera) and remove. */
export function ImageGrid({ images, onChange, max = 12 }: { images: string[]; onChange: (next: string[]) => void; max?: number }) {
  const p = usePalette();
  const { t } = useT();
  const [viewing, setViewing] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useUI((s) => s.showToast);
  const add = async (source: ImageSource) => {
    setBusy(true);
    try {
      const got = await pickImages(source, true);
      if (got.length) onChange([...images, ...got].slice(0, max));
    } catch (e) {
      toast(e instanceof Error && e.message === 'camera-denied' ? t('ed.cameraDenied') : t('ed.imageError'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: space.m }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s }}>
        {images.map((uri, i) => (
          <Animated.View key={uri} entering={FadeIn.duration(200)} exiting={FadeOut.duration(120)}>
            <Press onPress={() => setViewing(i)} scaleTo={0.97} accessibilityLabel={`${t('ed.images')} ${i + 1}`}>
              <Thumb uri={uri} size={96} />
            </Press>
            <Pressable
              onPress={() => {
                deleteImage(uri);
                onChange(images.filter((x) => x !== uri));
              }}
              accessibilityRole="button"
              accessibilityLabel={t('ed.removePhoto')}
              hitSlop={8}
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                width: 26,
                height: 26,
                borderRadius: 13,
                backgroundColor: p.scrim,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="close" size={14} color="#FFFFFF" stroke={2} />
            </Pressable>
          </Animated.View>
        ))}
      </View>
      {images.length < max && (
        <Row gap={space.s}>
          <Press
            onPress={() => void add('library')}
            disabled={busy}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              minHeight: 44,
              paddingHorizontal: space.l,
              borderRadius: radius.pill,
              backgroundColor: p.panel,
              opacity: busy ? 0.5 : 1,
            }}
          >
            <Icon name="image" size={18} color={p.text} />
            <Txt v="label">{t('hl.addImages')}</Txt>
          </Press>
          {cameraAvailable && (
            <Press
              onPress={() => void add('camera')}
              disabled={busy}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                minHeight: 44,
                paddingHorizontal: space.l,
                borderRadius: radius.pill,
                backgroundColor: p.panel,
              }}
            >
              <Icon name="camera" size={18} color={p.text} />
              <Txt v="label">{t('ed.takePhoto')}</Txt>
            </Press>
          )}
        </Row>
      )}
      <ImageViewer images={images} index={viewing} onClose={() => setViewing(null)} />
    </View>
  );
}
