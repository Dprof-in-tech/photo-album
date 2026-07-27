import { useEffect, useState } from 'react';
import { getTextStore } from './text';

// Small settings + per-key text values, backed by the shared R2 text store so
// they sync across devices and are present when the PDF/print renders.

/** Subscribe to a raw text-store value by key. */
export function useTextValue(key: string, def = ''): string {
  const store = getTextStore();
  const [v, setV] = useState(def);
  useEffect(() => {
    let alive = true;
    const sync = () => {
      const raw = store.get(key);
      if (alive) setV(raw == null ? def : raw);
    };
    store.load().then(sync);
    const unsub = store.subscribe((id) => {
      if (id === key) sync();
    });
    return () => {
      alive = false;
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return v;
}

/** Boolean album setting (stored as '1'/'0' under `set:<key>`). */
export function useSetting(key: string, def = false): [boolean, (v: boolean) => void] {
  const raw = useTextValue('set:' + key, def ? '1' : '0');
  const set = (v: boolean) => getTextStore().set('set:' + key, v ? '1' : '0');
  return [raw === '1', set];
}

/** String-choice album setting (stored under `set:<key>`). */
export function useChoice(key: string, def: string): [string, (v: string) => void] {
  const raw = useTextValue('set:' + key, def);
  const set = (v: string) => getTextStore().set('set:' + key, v);
  return [raw || def, set];
}
