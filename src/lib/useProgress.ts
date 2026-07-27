import { useEffect, useState } from 'react';
import { getStore } from './store';
import { TOTAL_SLOTS } from './tokens';

/**
 * Live fill progress derived reactively from the shared store (the prototype
 * polled a JSON sidecar every 4s; here we subscribe so it updates instantly and
 * across tabs). `total` defaults to the book's 51 photo slots.
 */
export function useProgress(total: number = TOTAL_SLOTS) {
  const store = getStore();
  const [filled, setFilled] = useState(0);

  useEffect(() => {
    const recount = () => setFilled(Math.min(store.filledCount(), total));
    store.load().then(recount);
    const unsub = store.subscribe(recount);
    return unsub;
  }, [store, total]);

  const pct = total ? Math.round((filled / total) * 100) : 0;
  return { filled, total, pct };
}
