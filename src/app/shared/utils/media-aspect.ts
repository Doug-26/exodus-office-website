import type { MediaAspect } from '../../data/models';

/** Picks the closest supported aspect for a width/height pair. */
export function nearestAspect(width: number, height: number): MediaAspect {
  if (!width || !height) return '16:9';
  const r = width / height;
  if (r < 0.7) return '9:16';
  if (r < 0.9) return '4:5';
  if (r < 1.25) return '1:1';
  return '16:9';
}

/** Reads an image's or video's dimensions in the browser to guess its aspect. */
export function detectAspect(file: File): Promise<MediaAspect> {
  return new Promise((resolve) => {
    const src = URL.createObjectURL(file);
    const done = (w: number, h: number) => {
      URL.revokeObjectURL(src);
      resolve(nearestAspect(w, h));
    };

    if (file.type.startsWith('video/')) {
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.onloadedmetadata = () => done(v.videoWidth, v.videoHeight);
      v.onerror = () => done(0, 0);
      v.src = src;
    } else {
      const img = new Image();
      img.onload = () => done(img.naturalWidth, img.naturalHeight);
      img.onerror = () => done(0, 0);
      img.src = src;
    }
  });
}
