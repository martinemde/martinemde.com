import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Post } from '#lib/utils/posts.ts';
import { getAllPosts, getMonthEntries, getYearEntries } from '#lib/utils/posts.ts';
import { entries as monthParams, load as loadMonth } from './[year=year]/[month=month]/+page.ts';
import { entries as yearParams, load as loadYear } from './[year=year]/+page.ts';

vi.mock('#lib/utils/posts.ts', () => ({
  getAllPosts: vi.fn(),
  getMonthEntries: vi.fn(),
  getYearEntries: vi.fn()
}));

// getAllPosts is the published-only interface. Dates deliberately differ from
// canonical filename dates, so generators must use permalinks, not UTC dates.
const posts = [
  { permalink: '/2026/01/31/one', date: new Date('2026-02-01T07:00:00Z') },
  { permalink: '/2026/01/30/two', date: new Date('2026-01-31T01:00:00Z') },
  { permalink: '/2026/02/01/three', date: new Date('2026-02-01T12:00:00Z') },
  { permalink: '/2025/12/31/four', date: new Date('2026-01-01T07:00:00Z') }
].map((post): Post => ({
  title: '',
  published: true,
  slug: post.permalink.split('/').pop()!,
  tags: [],
  type: 'note',
  photo: [],
  excerpt: '',
  path: 'test.md',
  readingTime: '1 min read',
  ...post,
  permalink: post.permalink as Post['permalink']
}));

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getAllPosts).mockResolvedValue(posts);
});

describe('archive prerender parameters', () => {
  it('generates each published year once from canonical permalinks', async () => {
    expect(await yearParams()).toEqual([{ year: '2026' }, { year: '2025' }]);
  });

  it('generates each published month once and retains zero padding', async () => {
    expect(await monthParams()).toEqual([
      { year: '2026', month: '01' },
      { year: '2026', month: '02' },
      { year: '2025', month: '12' }
    ]);
  });

  it('generates no archive pages when there are no published posts', async () => {
    vi.mocked(getAllPosts).mockResolvedValue([]);
    expect(await yearParams()).toEqual([]);
    expect(await monthParams()).toEqual([]);
  });
});

describe('archive loaders', () => {
  it('loads renderable entries using the canonical month path', async () => {
    const entries = [{ metadata: posts[0], content: vi.fn() }];
    vi.mocked(getMonthEntries).mockResolvedValue(entries);
    const result = await loadMonth({ params: { year: '2026', month: '01' } } as Parameters<
      typeof loadMonth
    >[0]);
    expect(getMonthEntries).toHaveBeenCalledExactlyOnceWith('/2026/01');
    expect(result).toEqual({ entries });
    expect(result?.entries).toBe(entries);
  });

  it('loads renderable entries using the canonical year path', async () => {
    const entries = [{ metadata: posts[0], content: vi.fn() }];
    vi.mocked(getYearEntries).mockResolvedValue(entries);
    const result = await loadYear({ params: { year: '2026' } } as Parameters<typeof loadYear>[0]);
    expect(getYearEntries).toHaveBeenCalledExactlyOnceWith('/2026');
    expect(result).toEqual({ entries });
    expect(result?.entries).toBe(entries);
  });

  it('returns a 404 for a month with no published entries', async () => {
    vi.mocked(getMonthEntries).mockResolvedValue([]);
    await expect(
      loadMonth({ params: { year: '1900', month: '01' } } as Parameters<typeof loadMonth>[0])
    ).rejects.toMatchObject({ status: 404, body: { message: 'Nothing posted that month' } });
  });

  it('returns a 404 for a year with no published entries', async () => {
    vi.mocked(getYearEntries).mockResolvedValue([]);
    await expect(
      loadYear({ params: { year: '1900' } } as Parameters<typeof loadYear>[0])
    ).rejects.toMatchObject({ status: 404, body: { message: 'Nothing posted that year' } });
  });
});
