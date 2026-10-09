import { describe, expect, it } from 'vitest';
import { getAllPosts, getPost } from './posts.ts';
import { loadPostContent, withContent } from './post-content.ts';

describe('post content', () => {
  it('loads the same component the post index compiled, by path', async () => {
    const [first] = await getAllPosts();
    expect(await loadPostContent(first.path)).toBe((await getPost(first.permalink))?.content);
  });

  it('pairs metadata with components in order', async () => {
    const posts = (await getAllPosts()).slice(0, 3);
    const entries = await withContent(posts);
    expect(entries.map((entry) => entry.metadata)).toEqual(posts);
    for (const entry of entries) expect(typeof entry.content).toBe('function');
  });

  it('rejects an unknown path', async () => {
    await expect(loadPostContent('../../content/blog/missing.md')).rejects.toThrow('missing.md');
  });
});
