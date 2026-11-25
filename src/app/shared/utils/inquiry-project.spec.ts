import type { Project } from '../../data/models';
import {
  countByProject,
  isMissingColumnError,
  isProjectSlug,
  messageWithContext,
  projectContactParams,
  projectRef,
  replySubject,
} from './inquiry-project';

const SITE = 'https://example.com';

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: 'p1',
    title: 'Summer Promo',
    slug: 'summer-promo',
    category: 'video_editing',
    description: null,
    client_name: null,
    tools: [],
    cover_path: null,
    is_featured: false,
    is_published: true,
    sort_order: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('isProjectSlug', () => {
  it.each([
    ['summer-promo', true],
    ['a', true],
    ['Summer-Promo', false],
    ['summer--promo', false],
    ['../admin', false],
    ['', false],
    ['a'.repeat(81), false],
    [undefined, false],
  ])('%s → %s', (value, expected) => {
    expect(isProjectSlug(value)).toBe(expected);
  });
});

describe('projectContactParams', () => {
  it.each([
    ['social_media', { project: 'x', service: 'social-media' }],
    ['video_editing', { project: 'x', service: 'video-editing' }],
    ['graphic_design', { project: 'x' }],
    ['other', { project: 'x' }],
  ] as const)('%s', (category, expected) => {
    expect(projectContactParams({ slug: 'x', category })).toEqual(expected);
  });
});

describe('messageWithContext', () => {
  it('returns the message unchanged when there is no context', () => {
    expect(messageWithContext('Hello there', {}, SITE)).toBe('Hello there');
    expect(
      messageWithContext('Hello there', { project: null, liked: [], timeline: '' }, SITE),
    ).toBe('Hello there');
  });

  it('appends the project link, picks and timeline', () => {
    const out = messageWithContext(
      'Hello there',
      {
        project: { title: 'Summer Promo', slug: 'summer-promo' },
        liked: ['Pace', 'Music'],
        timeline: 'ASAP',
      },
      SITE,
    );
    expect(out).toBe(
      'Hello there\n\n---\n' +
        'Wants something like: Summer Promo (https://example.com/portfolio/summer-promo)\n' +
        'Liked: Pace, Music\n' +
        'Timeline: ASAP',
    );
  });

  it('shortens the visitor text so the result fits the limit', () => {
    const out = messageWithContext('x'.repeat(200), { timeline: 'ASAP' }, SITE, 100);
    expect(out.length).toBeLessThanOrEqual(100);
    expect(out.endsWith('Timeline: ASAP')).toBe(true);
    expect(out).toContain('…');
  });
});

describe('isMissingColumnError', () => {
  it.each([
    [{ code: 'PGRST204' }, true],
    [{ code: '42703' }, true],
    [{ code: '42501' }, true],
    [{ code: 'P0001' }, false],
    [{ code: '23514' }, false],
    [{}, false],
    [null, false],
  ])('%o → %s', (error, expected) => {
    expect(isMissingColumnError(error)).toBe(expected);
  });
});

describe('projectRef', () => {
  const live = project();
  const hidden = project({ id: 'p2', title: 'Hidden', is_published: false });
  const byId = new Map([
    [live.id, live],
    [hidden.id, hidden],
  ]);

  it('is null for inquiries without a project', () => {
    expect(projectRef({ project_id: null, project_title: null }, byId)).toBeNull();
    expect(projectRef({}, byId)).toBeNull();
  });

  it('links a published project', () => {
    expect(projectRef({ project_id: 'p1', project_title: 'Summer Promo' }, byId)).toMatchObject({
      state: 'live',
      title: 'Summer Promo',
      viewSlug: 'summer-promo',
      editId: 'p1',
      sentTitle: null,
    });
  });

  it('keeps the old title when the project was renamed', () => {
    expect(projectRef({ project_id: 'p1', project_title: 'Old name' }, byId)?.sentTitle).toBe(
      'Old name',
    );
  });

  it('offers only editing for an unpublished project', () => {
    expect(projectRef({ project_id: 'p2', project_title: 'Hidden' }, byId)).toMatchObject({
      state: 'unpublished',
      viewSlug: null,
      editId: 'p2',
    });
  });

  it('falls back to the snapshot for a deleted project', () => {
    expect(projectRef({ project_id: null, project_title: 'Gone' }, byId)).toMatchObject({
      state: 'deleted',
      title: 'Gone',
      editId: null,
    });
  });

  it('uses the snapshot when the project could not be loaded', () => {
    expect(projectRef({ project_id: 'p9', project_title: 'Saved' }, new Map())).toMatchObject({
      state: 'unresolved',
      title: 'Saved',
      editId: 'p9',
    });
  });
});

describe('replySubject', () => {
  it.each([
    [{ service: null, project_title: null }, 'Re: Your inquiry to Acme'],
    [{ service: 'Video Editing', project_title: null }, 'Re: Your inquiry to Acme (Video Editing)'],
    [
      { service: 'Video Editing', project_title: 'Promo' },
      'Re: Your inquiry to Acme about "Promo"',
    ],
  ])('%o', (q, expected) => {
    expect(replySubject(q, 'Acme')).toBe(expected);
  });
});

describe('countByProject', () => {
  it('counts rows per project and skips rows without one', () => {
    const counts = countByProject([
      { project_id: 'a' },
      { project_id: 'b' },
      { project_id: 'a' },
      { project_id: null },
      {},
    ]);
    expect([...counts]).toEqual([
      ['a', 2],
      ['b', 1],
    ]);
  });
});
