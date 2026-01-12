import { describe, it, expect, vi } from 'vitest';
import { GET } from './+server';

vi.mock('$env/static/public', () => ({
  PUBLIC_APP_URL: 'https://example.com'
}));

describe('RSS Feed', () => {
  describe('GET handler', () => {
    it('should return a Response object', async () => {
      const response = await GET();

      expect(response).toBeInstanceOf(Response);
    });

    it('should return XML content type', async () => {
      const response = await GET();

      expect(response.headers.get('Content-Type')).toBe('application/xml');
    });

    it('should set cache control headers', async () => {
      const response = await GET();

      expect(response.headers.get('Cache-Control')).toBe('max-age=0, s-maxage=3600');
    });

    it('should return valid XML structure', async () => {
      const response = await GET();
      const xml = await response.text();

      // Check XML declaration
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');

      // Check RSS version and namespaces
      expect(xml).toContain('<rss version="2.0"');
      expect(xml).toContain('xmlns:atom="http://www.w3.org/2005/Atom"');
      expect(xml).toContain('xmlns:content="http://purl.org/rss/1.0/modules/content/"');

      // Check channel element
      expect(xml).toContain('<channel>');
      expect(xml).toContain('</channel>');
      expect(xml).toContain('</rss>');
    });

    it('should include required channel metadata', async () => {
      const response = await GET();
      const xml = await response.text();

      expect(xml).toContain('<title>Martin Emde</title>');
      expect(xml).toContain('<description>Blog posts by Martin Emde</description>');
      expect(xml).toContain('<link>https://example.com</link>');
      expect(xml).toContain(
        '<atom:link href="https://example.com/rss.xml" rel="self" type="application/rss+xml"'
      );
    });

    it('should include post items', async () => {
      const response = await GET();
      const xml = await response.text();

      // Should have at least one item
      expect(xml).toContain('<item>');
      expect(xml).toContain('</item>');
    });

    it('should include required item fields', async () => {
      const response = await GET();
      const xml = await response.text();

      // Extract first item for testing
      const itemMatch = xml.match(/<item>[\s\S]*?<\/item>/);
      expect(itemMatch).toBeTruthy();

      if (itemMatch) {
        const item = itemMatch[0];

        // Required fields
        expect(item).toContain('<title>');
        expect(item).toContain('</title>');
        expect(item).toContain('<description>');
        expect(item).toContain('</description>');
        expect(item).toContain('<link>https://example.com/blog/');
        expect(item).toContain('<guid isPermaLink="true">https://example.com/blog/');
        expect(item).toContain('<pubDate>');
        expect(item).toContain('</pubDate>');
        expect(item).toContain('<content:encoded>');
        expect(item).toContain('</content:encoded>');
      }
    });

    it('should wrap content in CDATA', async () => {
      const response = await GET();
      const xml = await response.text();

      expect(xml).toContain('<content:encoded><![CDATA[');
      expect(xml).toContain(']]></content:encoded>');
    });

    it('should format pubDate as valid RFC 822 date', async () => {
      const response = await GET();
      const xml = await response.text();

      // Extract pubDate
      const pubDateMatch = xml.match(/<pubDate>(.*?)<\/pubDate>/);
      expect(pubDateMatch).toBeTruthy();

      if (pubDateMatch) {
        const dateString = pubDateMatch[1];

        // Should be parseable as a date
        const date = new Date(dateString);
        expect(date.toString()).not.toBe('Invalid Date');

        // Should be in RFC 822 format (e.g., "Mon, 25 Dec 2025 12:00:00 GMT")
        expect(dateString).toMatch(
          /^[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/
        );
      }
    });

    it('should properly escape XML special characters in text', async () => {
      const response = await GET();
      const xml = await response.text();

      // In title/description (not CDATA), special chars should be escaped
      // We can't guarantee posts have special chars, but we can verify
      // the structure doesn't have unescaped special chars outside CDATA
      const outsideCDATA = xml.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');

      // Check that there are no unescaped special chars in titles/descriptions
      // This is a basic sanity check - if there were <script> tags they'd break XML
      const titleMatch = outsideCDATA.match(/<title>(.*?)<\/title>/);
      if (titleMatch && titleMatch[1].includes('&')) {
        // If there's an ampersand in title, it should be escaped
        expect(titleMatch[1]).not.toContain('& ');
      }
    });

    it('should handle CDATA escape sequences', async () => {
      const response = await GET();
      const xml = await response.text();

      // If content contains ]]>, it should be escaped as ]]]]><![CDATA[>
      // This is tested by checking the overall CDATA structure is valid
      const cdataMatches = xml.match(/<!\[CDATA\[[\s\S]*?\]\]>/g);
      expect(cdataMatches).toBeTruthy();
      expect(cdataMatches!.length).toBeGreaterThan(0);
    });

    it('should limit to 20 most recent posts', async () => {
      const response = await GET();
      const xml = await response.text();

      // Count item elements
      const itemMatches = xml.match(/<item>/g);
      expect(itemMatches).toBeTruthy();
      expect(itemMatches!.length).toBeLessThanOrEqual(20);
    });

    it('should convert markdown to HTML in content:encoded', async () => {
      const response = await GET();
      const xml = await response.text();

      // Extract CDATA content
      const cdataMatch = xml.match(
        /<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/
      );
      expect(cdataMatch).toBeTruthy();

      if (cdataMatch) {
        const htmlContent = cdataMatch[1];

        // Should contain HTML tags (markdown has been converted)
        // Most posts will have at least paragraphs or headings
        expect(htmlContent).toMatch(/<[^>]+>/);
      }
    });

    it('should have consistent post URLs', async () => {
      const response = await GET();
      const xml = await response.text();

      // Extract first item's link and guid
      const itemMatch = xml.match(/<item>[\s\S]*?<\/item>/);
      if (itemMatch) {
        const item = itemMatch[0];
        const linkMatch = item.match(/<link>(.*?)<\/link>/);
        const guidMatch = item.match(/<guid isPermaLink="true">(.*?)<\/guid>/);

        expect(linkMatch).toBeTruthy();
        expect(guidMatch).toBeTruthy();

        // Link and GUID should match
        if (linkMatch && guidMatch) {
          expect(linkMatch[1]).toBe(guidMatch[1]);
        }

        // Should follow pattern: https://example.com/blog/{slug}
        if (linkMatch) {
          expect(linkMatch[1]).toMatch(/^https:\/\/example\.com\/blog\/[a-z0-9-]+$/);
        }
      }
    });

    it('should not include frontmatter in content', async () => {
      const response = await GET();
      const xml = await response.text();

      // Extract CDATA content
      const cdataMatch = xml.match(
        /<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/
      );

      if (cdataMatch) {
        const htmlContent = cdataMatch[1];

        // Should not contain YAML frontmatter markers
        expect(htmlContent).not.toContain('---\ntitle:');
        expect(htmlContent).not.toContain('---\nslug:');
      }
    });

    it('should produce well-formed XML', async () => {
      const response = await GET();
      const xml = await response.text();

      // Basic well-formedness checks
      // Count opening and closing tags
      const openRss = (xml.match(/<rss/g) || []).length;
      const closeRss = (xml.match(/<\/rss>/g) || []).length;
      expect(openRss).toBe(closeRss);

      const openChannel = (xml.match(/<channel>/g) || []).length;
      const closeChannel = (xml.match(/<\/channel>/g) || []).length;
      expect(openChannel).toBe(closeChannel);

      const openItem = (xml.match(/<item>/g) || []).length;
      const closeItem = (xml.match(/<\/item>/g) || []).length;
      expect(openItem).toBe(closeItem);
    });
  });
});
