/**
 * `fetch` that retries a read-only request (GET/HEAD) once after a network failure,
 * e.g. a brief Supabase gateway hiccup that the browser reports as a CORS error.
 * Writes (POST/PATCH/DELETE) are never retried, so nothing can be saved twice.
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  retryDelayMs = 1000,
): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (error) {
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    if ((method !== 'GET' && method !== 'HEAD') || init?.signal?.aborted) throw error;
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    return fetch(input, init);
  }
}
