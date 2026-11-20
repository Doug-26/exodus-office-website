import { afterEach, vi } from 'vitest';
import { fetchWithRetry } from './fetch-retry';

describe('fetchWithRetry', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('retries a GET once after a network failure', async () => {
    const ok = new Response('[]');
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(ok);
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchWithRetry('https://x.test/rest', undefined, 0)).resolves.toBe(ok);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry a POST', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchWithRetry('https://x.test/rest', { method: 'POST' }, 0)).rejects.toThrow(
      'Failed to fetch',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not retry an aborted request', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchMock = vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      fetchWithRetry('https://x.test/rest', { signal: controller.signal }, 0),
    ).rejects.toThrow('Aborted');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('gives up after one retry', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchWithRetry('https://x.test/rest', undefined, 0)).rejects.toThrow(
      'Failed to fetch',
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
