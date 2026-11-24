/**
 * Deals items into `count` columns round-robin, so they read left-to-right, row by row
 * (1 2 3 / 4 5 6 …) and an incomplete last row always fills from the left.
 *
 * Always returns exactly `count` arrays (some possibly empty) so column widths stay
 * consistent even when there are fewer items than columns.
 */
export function toColumns<T>(items: readonly T[], count: number): T[][] {
  const n = Math.max(1, Math.floor(count));
  const columns: T[][] = Array.from({ length: n }, () => []);
  items.forEach((item, i) => columns[i % n].push(item));
  return columns;
}
