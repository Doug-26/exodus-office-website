import { changedOrder, withIndexOrder } from './sort-order';

const row = (id: string, sort_order: number) => ({ id, sort_order });

describe('changedOrder', () => {
  it('returns nothing when every row is already in place', () => {
    expect(changedOrder([row('a', 0), row('b', 1), row('c', 2)])).toEqual([]);
  });

  it('returns only the two rows a move swapped', () => {
    expect(changedOrder([row('a', 0), row('c', 2), row('b', 1), row('d', 3)])).toEqual([
      row('c', 1),
      row('b', 2),
    ]);
  });

  it('closes gaps left by deleted rows', () => {
    expect(changedOrder([row('a', 0), row('b', 2), row('c', 3)])).toEqual([
      row('b', 1),
      row('c', 2),
    ]);
  });

  it('numbers rows that all share the default order', () => {
    expect(changedOrder([row('a', 0), row('b', 0), row('c', 0)])).toEqual([
      row('b', 1),
      row('c', 2),
    ]);
  });
});

describe('withIndexOrder', () => {
  it('sets sort_order to the position and keeps unchanged items as the same object', () => {
    const a = { ...row('a', 0), title: 'A' };
    const b = { ...row('b', 5), title: 'B' };
    const result = withIndexOrder([a, b]);
    expect(result).toEqual([a, { ...b, sort_order: 1 }]);
    expect(result[0]).toBe(a);
  });
});
