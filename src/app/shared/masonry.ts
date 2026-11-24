import { DestroyRef, inject, Signal, signal } from '@angular/core';

/** Bootstrap breakpoints (min-widths) → column count. Keep in sync with `.ex-masonry` usage. */
const QUERIES = [
  { query: '(min-width: 992px)', columns: 3 }, // lg
  { query: '(min-width: 576px)', columns: 2 }, // sm
] as const;

/**
 * Number of masonry columns for the current viewport (1 / 2 / 3), updated on resize.
 * Must be called in an injection context.
 */
export function injectMasonryColumns(): Signal<number> {
  const columns = signal(1);
  if (typeof window === 'undefined' || !window.matchMedia) return columns;

  const lists = QUERIES.map((q) => ({ ...q, mql: window.matchMedia(q.query) }));
  const update = () => columns.set(lists.find((l) => l.mql.matches)?.columns ?? 1);
  update();

  lists.forEach((l) => l.mql.addEventListener('change', update));
  inject(DestroyRef).onDestroy(() =>
    lists.forEach((l) => l.mql.removeEventListener('change', update)),
  );
  return columns.asReadonly();
}
