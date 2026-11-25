import type { HistoryEntry } from './types';

const STORAGE_KEY = 'unthink_ai_history_v2';
const MAX_HISTORY_ITEMS = 40;

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    return null;
  }
  return null;
}

export function loadHistory(): HistoryEntry[] {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is HistoryEntry =>
        item &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.winnerLabel === 'string',
    );
  } catch {
    return [];
  }
}

export function saveHistory(entries: HistoryEntry[]): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY_ITEMS)));
  } catch {
    // Ignore quota / privacy mode write errors gracefully
  }
}

export function appendHistoryEntry(entry: HistoryEntry): HistoryEntry[] {
  const existing = loadHistory();
  const next = [entry, ...existing.filter((item) => item.id !== entry.id)].slice(
    0,
    MAX_HISTORY_ITEMS,
  );
  saveHistory(next);
  return next;
}

export function clearHistoryStorage(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}
