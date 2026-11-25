export interface Ordered {
  id: string;
  sort_order: number;
}

/**
 * Rows whose `sort_order` doesn't match their position yet. Moving one item up or down
 * normally changes just 2 rows, so a reorder costs 2 requests instead of one per item.
 * Gaps left by deleted rows are closed the first time something moves.
 */
export function changedOrder(items: readonly Ordered[]): Ordered[] {
  return items.flatMap((item, i) =>
    item.sort_order === i ? [] : [{ id: item.id, sort_order: i }],
  );
}

/** The same list with `sort_order` set to each item's position (after saving the order). */
export function withIndexOrder<T extends Ordered>(items: readonly T[]): T[] {
  return items.map((item, i) => (item.sort_order === i ? item : { ...item, sort_order: i }));
}
