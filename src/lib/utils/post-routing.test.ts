import { describe, expect, it } from 'vitest';
import { postRouteParams } from './post-routing.ts';
import type { PostMetadata } from './post-model.ts';

describe('postRouteParams', () => {
  it('retains padded canonical date segments and the permalink slug', () => {
    expect(postRouteParams({ permalink: '/2026/01/02/030405' })).toEqual({
      year: '2026',
      month: '01',
      day: '02',
      slug: '030405'
    });
  });

  it('uses the permalink even when the publication date and wrapper slug differ', () => {
    const metadata = {
      permalink: '/2026/07/21/canonical-slug' as const,
      date: new Date('2026-07-22T01:00:00Z'),
      slug: 'other-slug'
    };
    expect(postRouteParams(metadata)).toEqual({
      year: '2026',
      month: '07',
      day: '21',
      slug: 'canonical-slug'
    });
  });

  it.each(['/blog/legacy-slug', '/2026/07/21', '/2026/07/21/slug/extra'])(
    'rejects a noncanonical permalink: %s',
    (permalink) => {
      expect(() => postRouteParams({ permalink: permalink as PostMetadata['permalink'] })).toThrow(
        'Invalid post permalink'
      );
    }
  );
});
