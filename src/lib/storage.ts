/**
 * Safe localStorage helpers — guard against SSR (`typeof window`),
 * quota errors, and JSON parse failures so callers can stay terse.
 * Reactive subscriptions (e.g. useSyncExternalStore) bypass these and
 * read raw strings directly.
 */

export function safeReadJSON<T>(
  key: string,
  validate?: (value: unknown) => value is T,
): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (validate && !validate(parsed)) return null;
    return parsed as T;
  } catch {
    return null;
  }
}

export function safeWriteJSON(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota exceeded or privacy mode — silently drop */
  }
}

export function safeRemove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
