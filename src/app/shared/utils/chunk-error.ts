/**
 * True when a lazy route's chunk failed to load. This usually means a newer deploy replaced
 * the hashed chunk files the open page still points to.
 * Chrome: "Failed to fetch dynamically imported module", Firefox: "error loading dynamically
 * imported module", Safari: "Importing a module script failed".
 */
export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /dynamically imported module|importing a module script failed|loading chunk/i.test(
    message,
  );
}

const RELOAD_KEY = 'ex-chunk-reload-at';
/** Reloads closer together than this are treated as a loop and skipped. */
const RELOAD_COOLDOWN_MS = 10_000;

/**
 * Loads `url` with a full page load, which fetches the current index.html and chunk names.
 * Returns false (and does nothing) if it already did this in the last few seconds, so a chunk
 * that is really broken can't cause a reload loop.
 */
export function reloadForFreshChunks(url: string, win: Window, now = Date.now()): boolean {
  try {
    const last = Number(win.sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (now - last < RELOAD_COOLDOWN_MS) return false;
    win.sessionStorage.setItem(RELOAD_KEY, String(now));
  } catch {
    // Storage blocked (privacy mode): reload anyway; a loop is unlikely and the user can stop it.
  }
  win.location.assign(url);
  return true;
}
