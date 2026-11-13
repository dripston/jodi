import { useSyncExternalStore } from 'react';

export type ToastTone = 'neutral' | 'error' | 'success';
export interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(title: string, opts: { description?: string; tone?: ToastTone } = {}) {
  items = [...items, { id: nextId++, title, description: opts.description, tone: opts.tone ?? 'neutral' }];
  emit();
}

export function dismissToast(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

export function useToasts(): ToastItem[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => items,
  );
}
