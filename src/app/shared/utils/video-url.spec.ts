import { parseVideoUrl } from './video-url';

describe('parseVideoUrl', () => {
  const ID = 'dQw4w9WgXcQ';

  it.each([
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}&t=42s`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}`,
    `https://youtu.be/${ID}?si=abc`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube.com/live/${ID}`,
    `  https://www.youtube.com/watch?v=${ID}  `,
  ])('parses YouTube link %s', (url) => {
    const v = parseVideoUrl(url);
    expect(v?.provider).toBe('youtube');
    expect(v?.id).toBe(ID);
    expect(v?.embedUrl).toBe(`https://www.youtube-nocookie.com/embed/${ID}?rel=0`);
    expect(v?.thumbnailUrl).toBe(`https://i.ytimg.com/vi/${ID}/hqdefault.jpg`);
    expect(v?.isVertical).toBe(false);
    expect(v?.watchUrl).toBe(`https://www.youtube.com/watch?v=${ID}`);
  });

  it('flags YouTube Shorts as vertical', () => {
    const v = parseVideoUrl(`https://www.youtube.com/shorts/${ID}`);
    expect(v?.id).toBe(ID);
    expect(v?.isVertical).toBe(true);
  });

  describe('Facebook', () => {
    const FB = '1234567890123456';
    const embed = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
      `https://www.facebook.com/watch/?v=${FB}`,
    )}&show_text=false`;

    it.each([
      [`https://www.facebook.com/reel/${FB}`, true],
      [`https://www.facebook.com/reel/${FB}/?mibextid=abc`, true],
      [`https://m.facebook.com/reels/${FB}`, true],
      [`https://www.facebook.com/ExodusHomeOffice/videos/${FB}/`, false],
      [`https://www.facebook.com/ExodusHomeOffice/videos/summer-promo/${FB}/`, false],
      [`https://www.facebook.com/watch/?v=${FB}`, false],
      [`https://web.facebook.com/watch?v=${FB}`, false],
      [`https://www.facebook.com/video.php?v=${FB}`, false],
    ])('parses %s', (url, vertical) => {
      const v = parseVideoUrl(url);
      expect(v?.provider).toBe('facebook');
      expect(v?.id).toBe(FB);
      expect(v?.embedUrl).toBe(embed);
      expect(v?.thumbnailUrl).toBeNull();
      expect(v?.isVertical).toBe(vertical);
      expect(v?.watchUrl).toBe(
        vertical ? `https://www.facebook.com/reel/${FB}` : `https://www.facebook.com/watch/?v=${FB}`,
      );
    });

    it.each([
      'https://fb.watch/abcDEF123/',
      'https://www.facebook.com/share/r/1AbCdEf/',
      'https://www.facebook.com/ExodusHomeOffice',
      'https://www.facebook.com/reel/not-a-number',
      'https://www.facebook.com/watch/?v=123"><script>',
      'https://facebook.com.evil.com/reel/1234567890123456',
    ])('rejects %s', (url) => {
      expect(parseVideoUrl(url)).toBeNull();
    });
  });

  it('parses public and unlisted Vimeo links', () => {
    expect(parseVideoUrl('https://vimeo.com/76979871')?.embedUrl).toBe('https://player.vimeo.com/video/76979871');
    expect(parseVideoUrl('https://vimeo.com/76979871/abc123ef')?.embedUrl).toBe(
      'https://player.vimeo.com/video/76979871?h=abc123ef',
    );
    expect(parseVideoUrl('https://player.vimeo.com/video/76979871?h=ff00')?.embedUrl).toBe(
      'https://player.vimeo.com/video/76979871?h=ff00',
    );
    expect(parseVideoUrl('https://vimeo.com/channels/staffpicks/76979871')?.id).toBe('76979871');
  });

  it.each([
    null,
    '',
    'not a url',
    'javascript:alert(1)',
    'https://example.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=short',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ"><script>',
    'https://evil-youtube.com/watch?v=dQw4w9WgXcQ',
    'https://vimeo.com/about',
  ])('rejects %s', (url) => {
    expect(parseVideoUrl(url)).toBeNull();
  });

  it.each([
    [`https://youtu.be/${ID}`, `https://www.youtube-nocookie.com/embed/${ID}?rel=0&autoplay=1`],
    ['https://vimeo.com/76979871', 'https://player.vimeo.com/video/76979871?autoplay=1'],
    ['https://vimeo.com/76979871/abc123ef', 'https://player.vimeo.com/video/76979871?h=abc123ef&autoplay=1'],
    [
      'https://www.facebook.com/reel/1234567890123456',
      `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
        'https://www.facebook.com/watch/?v=1234567890123456',
      )}&show_text=false&autoplay=true`,
    ],
  ])('builds an autoplay URL for %s', (url, expected) => {
    expect(parseVideoUrl(url)?.autoplayUrl).toBe(expected);
  });

  it('drops an unsafe Vimeo hash instead of passing it through', () => {
    expect(parseVideoUrl('https://player.vimeo.com/video/123?h=<x>')?.embedUrl).toBe('https://player.vimeo.com/video/123');
  });
});
