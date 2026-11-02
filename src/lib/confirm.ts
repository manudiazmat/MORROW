import { Alert, Platform } from 'react-native';

import { useUI } from '@/store/ui';

/** Destructive confirmation: the system alert on iOS/Android, an in-app dialog on web. */
export function confirmDestructive(title: string, body: string, confirmLabel: string, cancelLabel: string): Promise<boolean> {
  if (Platform.OS === 'web')
    return new Promise((resolve) => useUI.getState().askConfirm({ title, body, confirmLabel, cancelLabel, resolve }));
  return new Promise((resolve) =>
    Alert.alert(title, body, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}
