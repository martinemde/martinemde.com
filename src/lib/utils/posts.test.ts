import { describe, it, expect } from 'vitest';
import {
	getAllPosts,
	getRecentPosts,
	getPostBySlug,
	validatePostDate,
	formatPostDate,
	getRawPostBySlug,
	DuplicateSlugError
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
				const currentDate =
					typeof posts[i].date === 'string'
						? new Date(posts[i].date)
						: posts[i].date;
				const nextDate =
					typeof posts[i + 1].date === 'string'
						? new Date(posts[i + 1].date)
						: posts[i + 1].date;

				expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
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

	describe('getPostBySlug', () => {
		it('should return a post with the given slug', async () => {
			const allPosts = await getAllPosts();
			if (allPosts.length === 0) return;

			const testSlug = allPosts[0].slug;
			const post = await getPostBySlug(testSlug);

			expect(post).toBeDefined();
			expect(post?.metadata.slug).toBe(testSlug);
		});

		it('should return post with content component', async () => {
			const allPosts = await getAllPosts();
			if (allPosts.length === 0) return;

			const testSlug = allPosts[0].slug;
			const post = await getPostBySlug(testSlug);

			expect(post?.content).toBeDefined();
			expect(typeof post?.content).toBe('function');
		});

		it('should return null for non-existent slug', async () => {
			const post = await getPostBySlug('this-slug-definitely-does-not-exist-12345');

			expect(post).toBeNull();
		});

		it('should have matching metadata between getAllPosts and getPostBySlug', async () => {
			const allPosts = await getAllPosts();
			if (allPosts.length === 0) return;

			const testSlug = allPosts[0].slug;
			const post = await getPostBySlug(testSlug);

			expect(post?.metadata.title).toBe(allPosts[0].title);
			expect(post?.metadata.slug).toBe(allPosts[0].slug);
		});
	});

	describe('validatePostDate', () => {
		it('should validate matching date components with string date', () => {
			const metadata = {
				title: 'Test',
				date: '2025-10-05',
				slug: 'test'
			};

			const result = validatePostDate(metadata, '2025', '10', '05');
			expect(result).toBe(true);
		});

		it('should validate matching date components with Date object', () => {
			const metadata = {
				title: 'Test',
				date: new Date('2025-10-05'),
				slug: 'test'
			};

			const result = validatePostDate(metadata, '2025', '10', '05');
			expect(result).toBe(true);
		});

		it('should reject non-matching year', () => {
			const metadata = {
				title: 'Test',
				date: '2025-10-05',
				slug: 'test'
			};

			const result = validatePostDate(metadata, '2024', '10', '05');
			expect(result).toBe(false);
		});

		it('should reject non-matching month', () => {
			const metadata = {
				title: 'Test',
				date: '2025-10-05',
				slug: 'test'
			};

			const result = validatePostDate(metadata, '2025', '09', '05');
			expect(result).toBe(false);
		});

		it('should reject non-matching day', () => {
			const metadata = {
				title: 'Test',
				date: '2025-10-05',
				slug: 'test'
			};

			const result = validatePostDate(metadata, '2025', '10', '04');
			expect(result).toBe(false);
		});

		it('should handle dates with time components', () => {
			const metadata = {
				title: 'Test',
				date: '2025-10-05T12:00:00Z',
				slug: 'test'
			};

			const result = validatePostDate(metadata, '2025', '10', '05');
			expect(result).toBe(true);
		});
	});

	describe('formatPostDate', () => {
		it('should format string date', () => {
			const formatted = formatPostDate('2025-10-05');
			expect(formatted).toMatch(/October 5, 2025/);
		});

		it('should format Date object', () => {
			const date = new Date('2025-10-05');
			const formatted = formatPostDate(date);
			expect(formatted).toMatch(/October 5, 2025/);
		});

		it('should handle date strings with time components', () => {
			const formatted = formatPostDate('2025-10-05T12:00:00Z');
			expect(formatted).toMatch(/October 5, 2025/);
		});

		it('should format dates consistently', () => {
			const stringDate = formatPostDate('2025-10-05');
			const objDate = formatPostDate(new Date('2025-10-05'));

			expect(stringDate).toBe(objDate);
		});
	});

	describe('getRawPostBySlug', () => {
		it('should return raw markdown content', async () => {
			const allPosts = await getAllPosts();
			if (allPosts.length === 0) return;

			const testSlug = allPosts[0].slug;
			const rawContent = getRawPostBySlug(testSlug);

			expect(rawContent).toBeDefined();
			expect(typeof rawContent).toBe('string');
			expect(rawContent!.length).toBeGreaterThan(0);
		});

		it('should include frontmatter in raw content', async () => {
			const allPosts = await getAllPosts();
			if (allPosts.length === 0) return;

			const testSlug = allPosts[0].slug;
			const rawContent = getRawPostBySlug(testSlug);

			expect(rawContent).toContain('---');
			expect(rawContent).toContain('title:');
			expect(rawContent).toContain('slug:');
		});

		it('should return null for non-existent slug', () => {
			const rawContent = getRawPostBySlug('this-slug-definitely-does-not-exist-12345');

			expect(rawContent).toBeNull();
		});
	});

	describe('DuplicateSlugError', () => {
		it('should create error with correct message', () => {
			const error = new DuplicateSlugError('test-slug', '/path/one.md', '/path/two.md');

			expect(error).toBeInstanceOf(Error);
			expect(error.name).toBe('DuplicateSlugError');
			expect(error.message).toContain('test-slug');
			expect(error.message).toContain('/path/one.md');
			expect(error.message).toContain('/path/two.md');
		});
	});
});
