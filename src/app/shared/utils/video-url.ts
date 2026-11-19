export type VideoProvider = 'youtube' | 'vimeo' | 'facebook';

export interface ParsedVideo {
  provider: VideoProvider;
  id: string;
  /** Safe-to-embed player URL built from the validated id only. */
  embedUrl: string;
  /** Link to the video on the provider's own site, also rebuilt from the validated id. */
  watchUrl: string;
  /** Public thumbnail when the provider offers one without an API key (YouTube only). */
  thumbnailUrl: string | null;
  /** True for vertical formats: YouTube Shorts and Facebook Reels. */
  isVertical: boolean;
}

export const VIDEO_PROVIDER_LABELS: Record<VideoProvider, string> = {
  youtube: 'YouTube',
  vimeo: 'Vimeo',
  facebook: 'Facebook',
};

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const NUMERIC_ID = /^\d{5,25}$/;
const YOUTUBE_HOSTS = new Set(['youtube.com', 'youtube-nocookie.com']);
const VIMEO_HOSTS = new Set(['vimeo.com', 'player.vimeo.com']);
const FACEBOOK_HOSTS = new Set(['facebook.com', 'web.facebook.com']);

/**
 * Parses a YouTube, Vimeo or Facebook video/Reel link (common formats) into an
 * embeddable URL. Returns null for anything else, so arbitrary URLs never reach an <iframe>.
 */
export function parseVideoUrl(raw: string | null | undefined): ParsedVideo | null {
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.)/, '');
  const parts = url.pathname.split('/').filter(Boolean);

  // ---- YouTube
  let ytId: string | undefined;
  let isShort = false;
  if (host === 'youtu.be') {
    ytId = parts[0];
  } else if (YOUTUBE_HOSTS.has(host)) {
    if (parts[0] === 'watch') ytId = url.searchParams.get('v') ?? undefined;
    else if (['embed', 'shorts', 'live', 'v'].includes(parts[0])) ytId = parts[1];
    isShort = parts[0] === 'shorts';
  }
  if (ytId !== undefined) {
    if (!YOUTUBE_ID.test(ytId)) return null;
    return {
      provider: 'youtube',
      id: ytId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}?rel=0`,
      watchUrl: `https://www.youtube.com/watch?v=${ytId}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
      isVertical: isShort,
    };
  }

  // ---- Vimeo
  if (VIMEO_HOSTS.has(host)) {
    const idx = parts.findIndex((p) => /^\d+$/.test(p));
    if (idx === -1) return null;
    const id = parts[idx];
    // Unlisted videos carry a privacy hash: vimeo.com/123/abc123 or ?h=abc123
    const next = parts[idx + 1];
    const hash = url.searchParams.get('h') ?? (host === 'vimeo.com' ? next : undefined);
    const safeHash = hash && /^[a-f0-9]+$/i.test(hash) ? hash : null;
    return {
      provider: 'vimeo',
      id,
      embedUrl: `https://player.vimeo.com/video/${id}${safeHash ? `?h=${safeHash}` : ''}`,
      watchUrl: `https://vimeo.com/${id}${safeHash ? `/${safeHash}` : ''}`,
      thumbnailUrl: null,
      isVertical: false,
    };
  }

  // ---- Facebook (public videos and Reels only)
  if (FACEBOOK_HOSTS.has(host)) {
    const id = facebookVideoId(parts, url.searchParams);
    if (!id) return null;
    // Rebuilt from the numeric id so nothing user-supplied reaches the iframe.
    const href = `https://www.facebook.com/watch/?v=${id}`;
    const isReel = parts[0] === 'reel' || parts[0] === 'reels';
    return {
      provider: 'facebook',
      id,
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(href)}&show_text=false`,
      watchUrl: isReel ? `https://www.facebook.com/reel/${id}` : href,
      thumbnailUrl: null,
      isVertical: isReel,
    };
  }

  return null;
}

/**
 * Supported:
 *   facebook.com/reel/123…           facebook.com/reels/123…
 *   facebook.com/<page>/videos/123…  facebook.com/<page>/videos/<title>/123…
 *   facebook.com/watch/?v=123…       facebook.com/video.php?v=123…
 * Not supported: fb.watch and /share/… short links (they hide the video id).
 */
function facebookVideoId(parts: string[], params: URLSearchParams): string | null {
  if (parts[0] === 'watch' || parts[0] === 'video.php') {
    const v = params.get('v');
    return v && NUMERIC_ID.test(v) ? v : null;
  }
  if (parts[0] === 'reel' || parts[0] === 'reels') {
    return parts[1] && NUMERIC_ID.test(parts[1]) ? parts[1] : null;
  }
  const videosIdx = parts.indexOf('videos');
  if (videosIdx !== -1) {
    return parts.slice(videosIdx + 1).find((p) => NUMERIC_ID.test(p)) ?? null;
  }
  return null;
}
