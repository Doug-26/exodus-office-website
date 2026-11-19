/**
 * Resolves with `work`'s result, but never sooner than `ms`.
 *
 * Saving to Supabase often takes only ~200 ms, so a loading spinner would just
 * flash for a split second. Keeping it up a little longer reads as a calm,
 * deliberate "saving…" instead of a flicker. Errors are not delayed.
 */
export async function withMinDuration<T>(work: Promise<T>, ms = 700): Promise<T> {
  const [result] = await Promise.all([work, new Promise((resolve) => setTimeout(resolve, ms))]);
  return result;
}
