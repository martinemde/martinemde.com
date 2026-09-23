import { describe, it, expect } from 'vitest';
import {
  dayPath,
  getAllPosts,
  getDayEntries,
  getRecentPosts,
  getPost,
  getPostBySlug,
  formatPostDate,
  formatPostDateShort,
  getRawPost,
  DuplicatePermalinkError
} from './posts';

describe('Blog Post Utilities', () => {
  describe('getAllPosts', () => {
    it('should return an array of posts', async () => {
      const posts = await getAllPosts();
      expect(posts).toBeDefined();
      expect(Array.isArray(posts)).toBe(true);
      expect(posts.length).toBeGreaterThan(0);
    });

    it('should return posts with required metadata fields', async () => {
      const posts = await getAllPosts();
      const post = posts[0];

      expect(post).toHaveProperty('title');
      expect(post).toHaveProperty('date');
      expect(post).toHaveProperty('slug');
      expect(post).toHaveProperty('path');
    });

    it('should only return published posts', async () => {
      const posts = await getAllPosts();
      posts.forEach((post) => {
        expect(post.published).not.toBe(false);
      });
    });

    it('should return posts sorted by date (newest first)', async () => {
      const posts = await getAllPosts();
      if (posts.length < 2) return; // Skip if not enough posts

      for (let i = 0; i < posts.length - 1; i++) {
        expect(posts[i].date.getTime()).toBeGreaterThanOrEqual(posts[i + 1].date.getTime());
      }
    });
  });

  describe('getRecentPosts', () => {
    it('should return limited number of posts', async () => {
      const limit = 3;
      const posts = await getRecentPosts(limit);

      expect(posts.length).toBeLessThanOrEqual(limit);
    });

    it('should return the most recent posts', async () => {
      const limit = 2;
      const recentPosts = await getRecentPosts(limit);
      const allPosts = await getAllPosts();

      expect(recentPosts[0]).toEqual(allPosts[0]);
      if (allPosts.length > 1) {
        expect(recentPosts[1]).toEqual(allPosts[1]);
      }
    });

    it('should handle limit larger than total posts', async () => {
      const allPosts = await getAllPosts();
      const posts = await getRecentPosts(allPosts.length + 10);

      expect(posts.length).toBe(allPosts.length);
    });
  });

  describe('getPost', () => {
    it('loads a post and its component by permalink', async () => {
      const [first] = await getAllPosts();
      const post = await getPost(first.permalink);

      expect(post?.metadata.slug).toBe(first.slug);
      expect(post?.metadata.title).toBe(first.title);
      expect(typeof post?.content).toBe('function');
    });

    it('returns null for an unknown permalink', async () => {
      expect(await getPost('/2020/01/01/this-slug-definitely-does-not-exist')).toBeNull();
    });
  });

  describe('permalinks', () => {
    it('dates every post by its filename prefix', async () => {
      for (const post of await getAllPosts()) {
        const [, year, month, day] = post.path.match(/(\d{4})-(\d{2})-(\d{2})-/)!;
        expect(post.permalink).toBe(`/${year}/${month}/${day}/${post.slug}`);
      }
    });

    it('agrees with the Pacific publish date for timestamped posts', async () => {
      for (const post of await getAllPosts()) {
        // Unquoted YAML dates parse as UTC midnight and carry no time of day.
        if (post.dateOnly || post.date.getTime() % 86_400_000 === 0) continue;
        const day = post.date.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
        expect(dayPath(post), post.path).toBe(`/${day.replaceAll('-', '/')}`);
      }
    });

    it('finds legacy /blog/slug posts by unique slug', async () => {
      const [first] = await getAllPosts();
      expect(getPostBySlug(first.slug)?.permalink).toBe(first.permalink);
      expect(getPostBySlug('this-slug-definitely-does-not-exist')).toBeNull();
    });
  });

  describe('getDayEntries', () => {
    it('returns only the entries published on that day', async () => {
      const [first] = await getAllPosts();
      const entries = await getDayEntries(dayPath(first));
      expect(entries.map((entry) => entry.metadata.permalink)).toContain(first.permalink);
      expect(entries.every((entry) => dayPath(entry.metadata) === dayPath(first))).toBe(true);
    });
  });

  describe('formatPostDate', () => {
    it('should format Date object', () => {
      const date = new Date(2025, 9, 5, 12, 0, 0); // October 5, 2025
      const formatted = formatPostDate(date);
      expect(formatted).toMatch(/October 5, 2025/);
    });

    it('should format dates consistently', () => {
      const date1 = new Date(2025, 9, 5, 12, 0, 0);
      const date2 = new Date(2025, 9, 5, 12, 0, 0);

      expect(formatPostDate(date1)).toBe(formatPostDate(date2));
    });
  });

  describe('formatPostDateShort', () => {
    it('formats a date as short month, day, year', () => {
      const date = new Date(2026, 0, 22, 12, 0, 0); // January 22, 2026
      expect(formatPostDateShort(date)).toBe('Jan 22, 2026');
    });

    it('formats a two-digit day without leading zero', () => {
      const date = new Date(2025, 10, 30, 12, 0, 0); // November 30, 2025
      expect(formatPostDateShort(date)).toBe('Nov 30, 2025');
    });
  });

  describe('getRawPost', () => {
    it('returns raw markdown including frontmatter', async () => {
      const [first] = await getAllPosts();
      const rawContent = getRawPost(first.permalink);

      expect(rawContent).toContain('---');
      expect(rawContent).toContain('slug:');
    });

    it('returns null for an unknown permalink', () => {
      expect(getRawPost('/2020/01/01/this-slug-definitely-does-not-exist')).toBeNull();
    });
  });

  describe('DuplicatePermalinkError', () => {
    it('should create error with correct message', () => {
      const error = new DuplicatePermalinkError(
        '/2026/07/21/test-slug',
        '/path/one.md',
        '/path/two.md'
      );

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('DuplicatePermalinkError');
      expect(error.message).toContain('/2026/07/21/test-slug');
      expect(error.message).toContain('/path/one.md');
      expect(error.message).toContain('/path/two.md');
    });
  });
});
