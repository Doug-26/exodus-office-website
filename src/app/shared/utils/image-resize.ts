import type { MediaAspect } from '../../data/models';
import { nearestAspect } from './media-aspect';

/**
 * Upload-time optimisation, done in the admin's browser (the Supabase free plan has no image
 * transformations). Pages then load small files: thumbnails for cards/tiles, a capped "main"
 * image for the lightbox, and a poster frame instead of the video itself.
 */

/** Long side of stored images; enough for a full-screen lightbox on a large monitor. */
export const MAIN_MAX = 2048;
/** Long side of thumbnails; covers a 3-column card at 2× pixel density. */
export const THUMB_MAX = 800;
/** Long side of cover images (cards + social share preview). */
export const COVER_MAX = 1600;
/** Long side of video poster frames. */
export const POSTER_MAX = 1280;

const MAIN_QUALITY = 0.82;
const THUMB_QUALITY = 0.75;
const POSTER_QUALITY = 0.8;
/** Give up on reading a video after this long and upload it without a poster. */
const VIDEO_TIMEOUT_MS = 15_000;

export interface Size {
  width: number;
  height: number;
}

/** Scales `width × height` down so the long side is at most `maxSide`. Never scales up. */
export function fitWithin(width: number, height: number, maxSide: number): Size {
  if (!(width > 0) || !(height > 0)) return { width: 0, height: 0 };
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export interface PreparedUpload {
  /** What to store as the original: a capped/compressed image, or the untouched file. */
  main: Blob;
  /** Small preview (image thumbnail or video poster), or null if one couldn't be made. */
  thumb: Blob | null;
  aspect: MediaAspect;
}

/** Compresses an image (plus thumbnail), or grabs a poster frame and shape from a video. */
export function prepareUpload(file: File): Promise<PreparedUpload> {
  return file.type.startsWith('video/') ? prepareVideo(file) : prepareImage(file);
}

/** Cover images: one capped copy, no thumbnail. Falls back to the original file. */
export async function prepareCover(file: File): Promise<Blob> {
  if (file.type === 'image/gif') return file;
  const bitmap = await decodeImage(file);
  if (!bitmap) return file;
  try {
    const resized = await encode(bitmap, bitmap.width, bitmap.height, COVER_MAX, MAIN_QUALITY);
    return resized && resized.size < file.size ? resized : file;
  } finally {
    bitmap.close();
  }
}

async function prepareImage(file: File): Promise<PreparedUpload> {
  const bitmap = await decodeImage(file);
  if (!bitmap) return { main: file, thumb: null, aspect: '16:9' };
  try {
    const { width, height } = bitmap;
    let main: Blob = file;
    // Re-encoding a GIF would drop its animation, so it's stored as-is (the thumb is a still).
    if (file.type !== 'image/gif') {
      const resized = await encode(bitmap, width, height, MAIN_MAX, MAIN_QUALITY);
      if (resized && resized.size < file.size) main = resized;
    }
    const thumb = await encode(bitmap, width, height, THUMB_MAX, THUMB_QUALITY);
    return {
      main,
      // A thumbnail that isn't smaller than the main file only costs an extra request.
      thumb: thumb && thumb.size < main.size ? thumb : null,
      aspect: nearestAspect(width, height),
    };
  } finally {
    bitmap.close();
  }
}

async function prepareVideo(file: File): Promise<PreparedUpload> {
  const src = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  try {
    video.src = src;
    await waitFor(video, 'loadeddata');
    // A frame slightly in, so it isn't a black fade-in frame.
    video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
    await waitFor(video, 'seeked');
    const poster = await encode(
      video,
      video.videoWidth,
      video.videoHeight,
      POSTER_MAX,
      POSTER_QUALITY,
    );
    return {
      main: file,
      thumb: poster,
      aspect: nearestAspect(video.videoWidth, video.videoHeight),
    };
  } catch {
    // Codec the browser can't decode, or it timed out: upload anyway, without a poster.
    return { main: file, thumb: null, aspect: nearestAspect(video.videoWidth, video.videoHeight) };
  } finally {
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(src);
  }
}

function decodeImage(file: Blob): Promise<ImageBitmap | null> {
  if (typeof createImageBitmap !== 'function') return Promise.resolve(null);
  // `from-image` applies EXIF rotation, so phone photos aren't stored sideways.
  return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => null);
}

/** Draws `source` scaled into `maxSide` and encodes it as WebP (JPEG where WebP isn't supported). */
async function encode(
  source: CanvasImageSource,
  width: number,
  height: number,
  maxSide: number,
  quality: number,
): Promise<Blob | null> {
  const size = fitWithin(width, height, maxSide);
  if (!size.width) return null;

  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, size.width, size.height);

  const webp = await toBlob(canvas, 'image/webp', quality);
  if (webp?.type === 'image/webp') return webp;

  // Safari can't encode WebP and hands back a PNG instead. JPEG has no transparency, so put
  // a white background behind the drawing first.
  ctx.globalCompositeOperation = 'destination-over';
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, size.width, size.height);
  return toBlob(canvas, 'image/jpeg', quality);
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Resolves on `event`, rejects on the element's error event or after a timeout. */
function waitFor(el: HTMLMediaElement, event: 'loadeddata' | 'seeked'): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(new Error('timeout')), VIDEO_TIMEOUT_MS);
    const ok = () => finish();
    const fail = () => finish(new Error('media error'));
    function finish(error?: Error) {
      clearTimeout(timer);
      el.removeEventListener(event, ok);
      el.removeEventListener('error', fail);
      if (error) reject(error);
      else resolve();
    }
    el.addEventListener(event, ok, { once: true });
    el.addEventListener('error', fail, { once: true });
  });
}
