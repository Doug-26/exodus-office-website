import { isChunkLoadError, reloadForFreshChunks } from './chunk-error';

describe('isChunkLoadError', () => {
  it('recognises the dynamic import failures of each browser', () => {
    expect(
      isChunkLoadError(
        new TypeError('Failed to fetch dynamically imported module: https://x/chunk-A.js'),
      ),
    ).toBe(true);
    expect(isChunkLoadError(new TypeError('error loading dynamically imported module'))).toBe(true);
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true);
  });

  it('ignores other errors', () => {
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });
});

describe('reloadForFreshChunks', () => {
  function fakeWindow() {
    const store = new Map<string, string>();
    const assign = vi.fn();
    const win = {
      sessionStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => store.set(k, v),
      },
      location: { assign },
    } as unknown as Window;
    return { win, assign };
  }

  it('does a full page load of the target url', () => {
    const { win, assign } = fakeWindow();
    expect(reloadForFreshChunks('/about', win, 100_000)).toBe(true);
    expect(assign).toHaveBeenCalledWith('/about');
  });

  it('does not reload again within the cooldown, so it cannot loop', () => {
    const { win, assign } = fakeWindow();
    reloadForFreshChunks('/about', win, 100_000);
    expect(reloadForFreshChunks('/about', win, 105_000)).toBe(false);
    expect(reloadForFreshChunks('/about', win, 111_000)).toBe(true);
    expect(assign).toHaveBeenCalledTimes(2);
  });
});
