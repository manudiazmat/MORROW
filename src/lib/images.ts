import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { uid } from './id';

/**
 * Images for diets and recipes stay on the device.
 * - iOS/Android: resized to 1600px, saved as JPEG in the app's documents folder; the store keeps the file URI.
 * - Web: resized to 1000px and kept as a compressed data URI (browser storage has no file system).
 */
const isWeb = Platform.OS === 'web';

async function compress(uri: string): Promise<string> {
  const ctx = ImageManipulator.manipulate(uri);
  ctx.resize({ width: isWeb ? 1000 : 1600 });
  const ref = await ctx.renderAsync();
  const res = await ref.saveAsync({ compress: isWeb ? 0.62 : 0.78, format: SaveFormat.JPEG, base64: isWeb });
  if (isWeb) return `data:image/jpeg;base64,${res.base64}`;
  const dir = new Directory(Paths.document, 'images');
  if (!dir.exists) dir.create({ intermediates: true });
  const dest = new File(dir, `${uid()}.jpg`);
  new File(res.uri).copy(dest);
  return dest.uri;
}

export type ImageSource = 'library' | 'camera';

export const cameraAvailable = !isWeb;

/** Returns the stored URIs of the chosen images (empty when cancelled). */
export async function pickImages(source: ImageSource, multiple = false): Promise<string[]> {
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error('camera-denied');
  }
  const opts: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 1,
    allowsMultipleSelection: multiple && source === 'library',
    selectionLimit: multiple ? 6 : 1,
  };
  const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled) return [];
  const out: string[] = [];
  for (const a of res.assets) out.push(await compress(a.uri));
  return out;
}

/** Removes a stored image file (no-op for web data URIs). */
export function deleteImage(uri: string) {
  if (isWeb || !uri.startsWith('file:')) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // already gone
  }
}
