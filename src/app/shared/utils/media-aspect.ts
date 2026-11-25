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
