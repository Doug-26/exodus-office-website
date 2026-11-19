import { withMinDuration } from './min-duration';

describe('withMinDuration', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('waits at least the minimum time for fast work', async () => {
    let done = false;
    const p = withMinDuration(Promise.resolve('ok'), 700).then((v) => {
      done = true;
      return v;
    });
    await vi.advanceTimersByTimeAsync(500);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(200);
    await expect(p).resolves.toBe('ok');
  });

  it('does not delay errors', async () => {
    await expect(withMinDuration(Promise.reject(new Error('nope')), 700)).rejects.toThrow('nope');
  });
});
