import { describe, it, expect, vi } from 'vitest';
import { GET } from './+server';
import { getAllPosts, type PostMetadata } from '$lib/utils/posts';
import { getPostLastModified, getStaticPaths } from '$lib/utils/sitemap';

vi.mock('$env/static/public', () => ({
  PUBLIC_APP_URL: 'https://example.com'
}));

async function sitemapXml(): Promise<string> {
  const response = await GET();
  return response.text();
}

function locations(xml: string): string[] {
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
}

describe('Sitemap', () => {
  describe('GET handler', () => {
    it('should return XML with cache headers', async () => {
      const response = await GET();

      expect(response).toBeInstanceOf(Response);
      expect(response.headers.get('Content-Type')).toBe('application/xml');
      expect(response.headers.get('Cache-Control')).toBe('max-age=0, s-maxage=3600');
    });

    it('should return a well-formed sitemap 0.9 document', async () => {
      const xml = await sitemapXml();

      expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
      expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(xml.trimEnd().endsWith('</urlset>')).toBe(true);

      const open = (xml.match(/<url>/g) || []).length;
      const close = (xml.match(/<\/url>/g) || []).length;
      expect(open).toBe(close);
      expect(open).toBe(locations(xml).length);
    });

    it('should parse as valid XML', async () => {
      const xml = await sitemapXml();
      const doc = new DOMParser().parseFromString(xml, 'application/xml');

      expect(doc.querySelector('parsererror')).toBeNull();
      expect(doc.documentElement.nodeName).toBe('urlset');
    });

    it('should order lastmod after loc inside each url', async () => {
      const xml = await sitemapXml();

      for (const url of xml.match(/<url>[\s\S]*?<\/url>/g) || []) {
        if (!url.includes('<lastmod>')) continue;
        expect(url.indexOf('<loc>')).toBeLessThan(url.indexOf('<lastmod>'));
      }
    });
  });

  describe('URLs', () => {
    it('should use absolute URLs on the configured origin', async () => {
      const xml = await sitemapXml();
      const locs = locations(xml);

      expect(locs.length).toBeGreaterThan(0);
      locs.forEach((loc) => expect(loc).toMatch(/^https:\/\/example\.com\//));
    });

    it('should not repeat a URL', async () => {
      const locs = locations(await sitemapXml());

      expect(new Set(locs).size).toBe(locs.length);
    });

    it('should list the homepage and the main sections', async () => {
      const locs = locations(await sitemapXml());

      expect(locs).toContain('https://example.com/');
      expect(locs).toContain('https://example.com/blog');
      expect(locs).toContain('https://example.com/about');
      expect(locs).toContain('https://example.com/projects');
    });

    it('should list every published blog post', async () => {
      const locs = locations(await sitemapXml());
      const posts = await getAllPosts();

      expect(posts.length).toBeGreaterThan(0);
      posts.forEach((post) => {
        expect(locs).toContain(`https://example.com/blog/${post.slug}`);
      });
    });

    it('should list every discovered static page', async () => {
      const locs = locations(await sitemapXml());

      getStaticPaths().forEach((path) => {
        expect(locs).toContain(`https://example.com${path}`);
      });
    });

    it('should exclude auth routes', async () => {
      const xml = await sitemapXml();

      expect(xml).not.toContain('https://example.com/auth');
    });

    it('should exclude dynamic route placeholders', async () => {
      const xml = await sitemapXml();

      expect(xml).not.toContain('[');
    });

    it('should exclude alternate representations of posts', async () => {
      const locs = locations(await sitemapXml());

      locs.forEach((loc) => expect(loc).not.toMatch(/\.(txt|md)$/));
    });
  });

  describe('lastmod', () => {
    it('should use W3C date format', async () => {
      const xml = await sitemapXml();
      const values = [...xml.matchAll(/<lastmod>(.*?)<\/lastmod>/g)].map((match) => match[1]);

      expect(values.length).toBeGreaterThan(0);
      values.forEach((value) => {
        expect(value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(new Date(value).toString()).not.toBe('Invalid Date');
      });
    });

    it('should date each post entry from its frontmatter', async () => {
      const xml = await sitemapXml();
      const posts = await getAllPosts();
      const post = posts[0];
      const expected = (post.updated ?? post.date).toLocaleDateString('en-CA');

      const entry = xml.match(
        new RegExp(`<url>\\s*<loc>https://example\\.com/blog/${post.slug}</loc>[\\s\\S]*?</url>`)
      );

      expect(entry).toBeTruthy();
      expect(entry![0]).toContain(`<lastmod>${expected}</lastmod>`);
    });

    it('should date the post-driven pages from the newest post', async () => {
      const xml = await sitemapXml();
      const posts = await getAllPosts();
      const newest = Math.max(...posts.map((post) => (post.updated ?? post.date).getTime()));
      const expected = new Date(newest).toLocaleDateString('en-CA');

      for (const path of ['/', '/blog']) {
        const entry = xml.match(
          new RegExp(`<url>\\s*<loc>https://example\\.com${path}</loc>[\\s\\S]*?</url>`)
        );

        expect(entry).toBeTruthy();
        expect(entry![0]).toContain(`<lastmod>${expected}</lastmod>`);
      }
    });

    it('should omit lastmod for pages with no reliable date', async () => {
      const xml = await sitemapXml();
      const entry = xml.match(/<url>\s*<loc>https:\/\/example\.com\/about<\/loc>[\s\S]*?<\/url>/);

      expect(entry).toBeTruthy();
      expect(entry![0]).not.toContain('<lastmod>');
    });
  });

  describe('getPostLastModified', () => {
    const post = (extra: Partial<PostMetadata>): PostMetadata => ({
      title: 'Test',
      published: true,
      tags: [],
      type: 'article',
      photo: [],
      excerpt: '',
      slug: 'test',
      date: new Date(2025, 0, 15, 12, 0, 0),
      ...extra
    });

    it('should fall back to the publication date', () => {
      expect(getPostLastModified(post({}))).toEqual(new Date(2025, 0, 15, 12, 0, 0));
    });

    it('should prefer the updated date when the post has been revised', () => {
      const updated = new Date(2025, 5, 2, 12, 0, 0);

      expect(getPostLastModified(post({ updated }))).toEqual(updated);
    });
  });
});
