import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

import { StackScreen } from '@/components/Screen';
import { Button, IconButton, haptic } from '@/components/ui';
import { confirmDestructive } from '@/lib/confirm';
import { useT } from '@/lib/i18n';
import { useUI } from '@/store/ui';
import { usePalette } from '@/theme';

export function EditorScaffold({
  title,
  children,
  onSave,
  onDelete,
  deleteName,
  saveLabel,
}: {
  title: string;
  children: ReactNode;
  onSave: () => boolean | void;
  onDelete?: () => void;
  deleteName?: string;
  saveLabel?: string;
}) {
  const { t } = useT();
  const p = usePalette();
  const showToast = useUI((s) => s.showToast);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: p.ground }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StackScreen
        title={title}
        right={
          onDelete ? (
            <IconButton
              icon="trash"
              label={t('c.delete')}
              color={p.negative}
              onPress={async () => {
                const ok = await confirmDestructive(
                  t('c.confirmDelete', { name: deleteName ?? title }),
                  t('c.confirmDeleteBody'),
                  t('c.delete'),
                  t('c.cancel'),
                );
                if (!ok) return;
                onDelete();
                showToast(t('c.deleted'));
                close();
              }}
            />
          ) : undefined
        }
        footer={
          <Button
            label={saveLabel ?? t('c.save')}
            onPress={() => {
              if (onSave() === false) return;
              haptic('success');
              close();
            }}
          />
        }
      >
        {children}
      </StackScreen>
    </KeyboardAvoidingView>
  );
}
