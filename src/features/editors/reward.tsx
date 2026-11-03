import { useState } from 'react';
import { View } from 'react-native';

import { Chip, Field, Row } from '@/components/ui';
import { cameraAvailable, deleteImage, pickImages, type ImageSource } from '@/lib/images';
import { parseAmount } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { live, useStore } from '@/store';
import { useUI } from '@/store/ui';
import { radius, space } from '@/theme';
import { Thumb } from '../health/images';
import { EditorScaffold } from './Scaffold';

const centsToInput = (c: number | undefined, lang: 'es' | 'en') =>
  c == null ? '' : lang === 'es' ? (c / 100).toFixed(2).replace('.', ',').replace(',00', '') : (c / 100).toFixed(2).replace('.00', '');

/** Something the person wants to buy: name, price, an optional photo and link. */
export function RewardEditor({ id }: { id?: string }) {
  const { t, lang } = useT();
  const existing = useStore((s) => s.rewards.find((x) => x.id === id));
  const st = useStore();
  const toast = useUI((s) => s.showToast);
  const [name, setName] = useState(existing?.name ?? '');
  const [price, setPrice] = useState(centsToInput(existing?.price, lang));
  const [url, setUrl] = useState(existing?.url ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [image, setImage] = useState<string | null>(existing?.image ?? null);
  const [errors, setErrors] = useState<{ name?: string; price?: string; url?: string }>({});
  const [busy, setBusy] = useState(false);

  const pick = async (source: ImageSource) => {
    if (busy) return;
    setBusy(true);
    try {
      const [uri] = await pickImages(source);
      if (uri) {
        if (image && image !== existing?.image) deleteImage(image);
        setImage(uri);
      }
    } catch (e) {
      toast(e instanceof Error && e.message === 'camera-denied' ? t('ed.cameraDenied') : t('ed.imageError'));
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    const cents = parseAmount(price);
    const link = url.trim();
    const next = {
      name: name.trim() ? undefined : t('c.required'),
      price: cents && cents > 0 ? undefined : t('c.invalidAmount'),
      url: !link || /^https?:\/\/\S+$/i.test(link) ? undefined : t('ed.linkInvalid'),
    };
    if (next.name || next.price || next.url) {
      setErrors(next);
      return false;
    }
    if (existing?.image && existing.image !== image) deleteImage(existing.image);
    const data = { name: name.trim(), price: cents!, url: link || null, notes, image };
    if (existing) st.update('rewards', existing.id, data);
    else {
      const orders = live(st.rewards)
        .filter((r) => r.status === 'active')
        .map((r) => r.order);
      st.create('rewards', { ...data, order: orders.length ? Math.max(...orders) + 1 : 0, status: 'active' });
      st.startRewards();
    }
  };

  return (
    <EditorScaffold
      title={existing ? t('ed.editReward') : t('ed.newReward')}
      onSave={save}
      onDelete={
        existing
          ? () => {
              if (existing.image) deleteImage(existing.image);
              st.remove('rewards', existing.id);
            }
          : undefined
      }
      deleteName={existing?.name}
    >
      <View style={{ gap: space.m }}>
        <Thumb uri={image} icon="gift" style={{ width: '100%', aspectRatio: 16 / 10, borderRadius: radius.panel }} />
        <Row gap={space.s} style={{ flexWrap: 'wrap' }}>
          <Chip label={image ? t('ed.changePhoto') : t('ed.addPhoto')} icon="image" onPress={() => void pick('library')} />
          {cameraAvailable && <Chip label={t('ed.takePhoto')} icon="camera" onPress={() => void pick('camera')} />}
          {image && <Chip label={t('ed.removePhoto')} onPress={() => setImage(null)} />}
        </Row>
      </View>
      <Field
        label={t('ed.name')}
        value={name}
        onChangeText={(v) => {
          setName(v);
          setErrors((e) => ({ ...e, name: undefined }));
        }}
        error={errors.name}
        autoFocus={!existing}
        placeholder={t('ed.rewardPh')}
      />
      <Field
        label={t('ed.price')}
        value={price}
        onChangeText={(v) => {
          setPrice(v);
          setErrors((e) => ({ ...e, price: undefined }));
        }}
        keyboardType="decimal-pad"
        error={errors.price}
        large
      />
      <Field
        label={t('ed.link')}
        value={url}
        onChangeText={(v) => {
          setUrl(v);
          setErrors((e) => ({ ...e, url: undefined }));
        }}
        placeholder="https://…"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        error={errors.url}
      />
      <Field label={t('c.notes')} value={notes} onChangeText={setNotes} multiline />
    </EditorScaffold>
  );
}
