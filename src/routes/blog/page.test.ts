import { describe, expect, it } from 'vitest';
import { load } from './+page.server';
import { getArticles } from '#lib/utils/posts.ts';

describe('blog server listing', () => {
  it('returns serializable article metadata without compiled components', async () => {
    const result = await load();
    const restored = structuredClone(result);
    expect(restored.posts).toEqual(await getArticles());
    for (const post of restored.posts) {
      expect(post.published).toBe(true);
      expect(post.type).toBe('article');
      expect(post.date).toBeInstanceOf(Date);
      expect(post.readingTime).toMatch(/^\d+ min read$/);
      expect(post.permalink).toMatch(/^\/\d{4}\/\d{2}\/\d{2}\//);
      expect(post).not.toHaveProperty('content');
    }
  });
});
