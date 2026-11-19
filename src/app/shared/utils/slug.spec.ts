import { nearestAspect } from './media-aspect';
import { SLUG_PATTERN, slugify } from './slug';

describe('slugify', () => {
  it.each([
    ['Summer Promo Reel', 'summer-promo-reel'],
    ['Café Luna — Reel #2', 'cafe-luna-reel-2'],
    ['  Brand & Social Kit  ', 'brand-and-social-kit'],
    ['Already-a-slug', 'already-a-slug'],
    ['!!!', ''],
  ])('%s → %s', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it('respects the max length without leaving a trailing dash', () => {
    const slug = slugify('word '.repeat(40), 12);
    expect(slug.length).toBeLessThanOrEqual(12);
    expect(slug.endsWith('-')).toBe(false);
  });

  it('always produces values accepted by the database pattern', () => {
    for (const s of ['Hello World', 'Ñandú 2026', 'a--b', 'x']) {
      expect(SLUG_PATTERN.test(slugify(s))).toBe(true);
    }
  });
});

describe('nearestAspect', () => {
  it.each([
    [1920, 1080, '16:9'],
    [1080, 1920, '9:16'],
    [1080, 1080, '1:1'],
    [1080, 1350, '4:5'],
    [0, 0, '16:9'],
  ])('%i×%i → %s', (w, h, expected) => {
    expect(nearestAspect(w, h)).toBe(expected);
  });
});
