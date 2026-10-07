import { describe, expect, it, vi } from 'vitest';
import type { Component } from 'svelte';
import { normalizePostMetadata } from './post-model.ts';
import { getAllPosts, getMonthEntries, getPost, getYearEntries } from './posts.ts';

// Published content currently has no plain note. Substitute the publisher's
// compiled note fixture into one glob slot to exercise that type without
// creating a published blog file. The real index and normalizer still run.
vi.mock('../../content/blog/2025-10-25-move-forward.md', () => {
  const fixtures = import.meta.glob('../fixtures/publisher/note.md', { eager: true });
  return fixtures['../fixtures/publisher/note.md'] as { default: Component; metadata: unknown };
});

const modules = import.meta.glob('../../content/blog/*.{md,svx}', { eager: true }) as Record<
  string,
  { default: Component; metadata?: unknown }
>;
const storedPosts = Object.entries(modules).map(([path, module]) =>
  normalizePostMetadata(module.metadata, path, '')
);

// Exercise the real post index and compiled Markdown components, not a mock of getAllPosts.
describe.each([
  { name: 'month', depth: 3, getEntries: getMonthEntries, empty: '/1900/01' },
  { name: 'year', depth: 2, getEntries: getYearEntries, empty: '/1900' }
])('$name archive entries', ({ depth, getEntries, empty }) => {
  const archivePath = (permalink: string) => permalink.split('/').slice(0, depth).join('/');

  it('returns every published type in its canonical archive, newest first, with its component', async () => {
    const posts = await getAllPosts();
    const paths = [...new Set(posts.map((post) => archivePath(post.permalink)))];
    const types = new Set<string>();
    for (const path of paths) {
      const expected = posts.filter((post) => archivePath(post.permalink) === path);
      const entries = await getEntries(path);
      expect(entries.map((entry) => entry.metadata)).toEqual(expected);
      for (const [index, entry] of entries.entries()) {
        types.add(entry.metadata.type);
        expect(typeof entry.content).toBe('function');
        expect(entry.content).toBe((await getPost(entry.metadata.permalink))?.content);
        expect(entry.metadata.published).toBe(true);
        if (index > 0) {
          expect(entries[index - 1].metadata.date.getTime()).toBeGreaterThanOrEqual(
            entry.metadata.date.getTime()
          );
        }
      }
    }
    expect(types).toEqual(new Set(['article', 'note', 'bookmark', 'photo']));
  });

  it('excludes drafts even when querying their archive directly', async () => {
    const drafts = storedPosts.filter((post) => !post.published);
    expect(drafts.length).toBeGreaterThan(0);
    for (const draft of drafts) {
      expect(
        (await getEntries(archivePath(draft.permalink))).map((entry) => entry.metadata.permalink)
      ).not.toContain(draft.permalink);
    }
  });

  it('returns an empty array for an archive with no published entries', async () => {
    expect(await getEntries(empty)).toEqual([]);
  });

  it('does not accept a partial date segment as an archive prefix', async () => {
    expect(await getEntries(depth === 3 ? '/2026/0' : '/202')).toEqual([]);
  });
});
