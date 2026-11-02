import { create } from 'zustand';

export type QuickKind = 'task' | 'event' | 'expense' | 'income' | 'habit' | 'goal' | 'idea';

interface Toast {
  id: number;
  text: string;
  action?: { label: string; run: () => void };
}

interface UIState {
  quickAdd: { open: boolean; kind: QuickKind };
  openQuickAdd: (kind?: QuickKind) => void;
  closeQuickAdd: () => void;
  toast: Toast | null;
  showToast: (text: string, action?: Toast['action']) => void;
  hideToast: () => void;
  /** module the assistant was opened from */
  assistantContext: string | null;
  setAssistantContext: (c: string | null) => void;
  sync: { status: 'idle' | 'syncing' | 'error' | 'offline'; lastSyncAt: string | null; message?: string };
  setSync: (s: Partial<UIState['sync']>) => void;
}

let counter = 0;

export const useUI = create<UIState>((set) => ({
  quickAdd: { open: false, kind: 'task' },
  openQuickAdd: (kind) => set((s) => ({ quickAdd: { open: true, kind: kind ?? s.quickAdd.kind } })),
  closeQuickAdd: () => set((s) => ({ quickAdd: { ...s.quickAdd, open: false } })),
  toast: null,
  showToast: (text, action) => set({ toast: { id: ++counter, text, action } }),
  hideToast: () => set({ toast: null }),
  assistantContext: null,
  setAssistantContext: (assistantContext) => set({ assistantContext }),
  sync: { status: 'idle', lastSyncAt: null },
  setSync: (p) => set((s) => ({ sync: { ...s.sync, ...p } })),
}));
