import { fitWithin } from './image-resize';

describe('fitWithin', () => {
  it.each([
    // [width, height, max, expected]
    [4032, 3024, 2048, { width: 2048, height: 1536 }], // landscape phone photo
    [3024, 4032, 800, { width: 600, height: 800 }], // portrait
    [1080, 1920, 1280, { width: 720, height: 1280 }], // 9:16 reel
    [1000, 1000, 800, { width: 800, height: 800 }], // square
  ])('scales %i×%i into %i', (w, h, max, expected) => {
    expect(fitWithin(w, h, max)).toEqual(expected);
  });

  it('never scales up', () => {
    expect(fitWithin(640, 480, 2048)).toEqual({ width: 640, height: 480 });
  });

  it('keeps at least 1 px on the short side', () => {
    expect(fitWithin(10000, 1, 800)).toEqual({ width: 800, height: 1 });
  });

  it.each([
    [0, 100],
    [100, 0],
    [NaN, 100],
  ])('returns 0×0 for unusable dimensions %s×%s', (w, h) => {
    expect(fitWithin(w, h, 800)).toEqual({ width: 0, height: 0 });
  });
});
