import { toColumns } from './masonry';

describe('toColumns', () => {
  it('deals items left-to-right so the last row fills from the left', () => {
    expect(toColumns([1, 2, 3, 4, 5], 3)).toEqual([[1, 4], [2, 5], [3]]);
  });

  it('always returns the requested number of columns', () => {
    expect(toColumns(['a'], 3)).toEqual([['a'], [], []]);
    expect(toColumns([], 2)).toEqual([[], []]);
  });

  it('puts everything in one column when count is 1 or invalid', () => {
    expect(toColumns([1, 2, 3], 1)).toEqual([[1, 2, 3]]);
    expect(toColumns([1, 2], 0)).toEqual([[1, 2]]);
  });
});
