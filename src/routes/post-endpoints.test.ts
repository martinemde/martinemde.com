import { readFile } from 'node:fs/promises';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse } from 'yaml';
import * as posts from '#lib/utils/posts.ts';
import { postRouteParams } from '#lib/utils/post-routing.ts';
import { dayPath } from '#lib/utils/post-model.ts';
import { GET as txt } from './[year=year]/[month=month]/[day=day]/[slug].txt/+server.ts';
import { GET as md } from './[year=year]/[month=month]/[day=day]/[slug].md/+server.ts';
import { GET as legacyHtml } from './blog/[slug]/+server.ts';
import { GET as legacyTxt } from './blog/[slug].txt/+server.ts';
import { GET as legacyMd } from './blog/[slug].md/+server.ts';

// These handlers only read params from the request event.
function event<T>(params: object): T {
  return { params } as T;
}

const draft = {
  permalink: '/2026/01/01/i-set-up-micropub' as const,
  slug: 'i-set-up-micropub',
  path: '../../content/blog/2026-01-01-i-set-up-micropub.md'
};

afterEach(() => vi.restoreAllMocks());

describe('dated .txt endpoint', () => {
  const handler = txt;
  it('serves the exact published source bytes with the original content type', async () => {
    const [post] = await posts.getAllPosts();
    const source = await readFile(new URL(post.path.replace('../../', '../'), import.meta.url));
    const response = await handler(event(postRouteParams(post)));
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array(source));
  });

  it('still serves draft source unchanged', async () => {
    expect((await posts.getPost(draft.permalink))?.metadata.published).toBe(false);
    const source = await readFile(new URL(draft.path.replace('../../', '../'), import.meta.url));
    const response = await handler(event(postRouteParams(draft)));
    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array(source));
  });
});

describe('dated .md endpoint', () => {
  it('serves the stored front matter plus the site keys, the body, then a footer', async () => {
    const [newest, post, oldest] = await posts.getAllPosts();
    const source = await readFile(
      new URL(post.path.replace('../../', '../'), import.meta.url),
      'utf8'
    );
    const response = await md(event(postRouteParams(post)));
    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    const text = await response.text();
    const stored = /^---\n([\s\S]*?)\n---\n/.exec(source)![1];
    // The stored keys come first, byte for byte; the site adds feed and neighbors.
    expect(text.startsWith(`---\n${stored}\n`)).toBe(true);
    const [, frontMatter, rest] = /^---\n([\s\S]*?)\n---\n\n([\s\S]*)$/.exec(text)!;
    expect(parse(frontMatter)).toEqual({
      ...parse(stored),
      source: { url: 'https://example.com/rss.xml', title: 'Martin Emde' },
      prev: `https://example.com${oldest.permalink}.md`,
      next: `https://example.com${newest.permalink}.md`,
      up: `https://example.com${dayPath(post)}.md`,
      home: 'https://example.com/index.md'
    });
    const footer = rest.slice(rest.lastIndexOf('\n\n---\n\n'));
    expect(footer).toMatch(/^\n\n---\n\n\[~\]\(https:\/\/example\.com\/index\.md\)/);
    // Newer and older entries live in the front matter, not the footer.
    expect(footer).not.toMatch(/^(Newer|Older): /m);
    expect(footer).toContain(`[HTML version](https://example.com${post.permalink})`);
  });

  it('writes photos and bookmarks into the body as Markdown', async () => {
    const photo = (await posts.getAllPosts()).find((post) => post.leadPhotos.length)!;
    const text = await (await md(event(postRouteParams(photo)))).text();
    expect(text).toContain(`](${photo.leadPhotos[0].value})`);
    const bookmark = (await posts.getAllPosts()).find((post) => post.bookmarkLink)!;
    expect(await (await md(event(postRouteParams(bookmark)))).text()).toContain(
      `<${bookmark.bookmarkLink}>`
    );
  });

  it('leaves no HTML links or images in photo and bookmark entries', async () => {
    for (const post of await posts.getAllPosts()) {
      if (post.type !== 'photo' && post.type !== 'bookmark') continue;
      const text = await (await md(event(postRouteParams(post)))).text();
      expect(text, post.permalink).not.toMatch(/<a\s|<img\s/i);
    }
  });

  it('gives drafts the breadcrumb and site nav but no newer/older links', async () => {
    const text = await (await md(event(postRouteParams(draft)))).text();
    expect(parse(text.split('\n---\n')[0].slice(4))).not.toHaveProperty('prev');
    expect(text).not.toMatch(/^(Newer|Older): /m);
    expect(text).toContain('[Stream](https://example.com/stream.md)');
  });
});

describe.each([
  ['.txt', txt],
  ['.md', md]
] as const)('dated %s endpoint errors', (_suffix, handler) => {
  it('retains the missing-post error', async () => {
    await expect(
      handler(event({ year: '2000', month: '01', day: '01', slug: 'missing' }))
    ).rejects.toMatchObject({ status: 404, body: { message: 'Post not found: missing' } });
  });

  it('retains the empty-source error', async () => {
    vi.spyOn(posts, 'getRawPost').mockReturnValue('');
    await expect(handler(event(postRouteParams(draft)))).rejects.toMatchObject({
      status: 404,
      body: { message: `Post not found: ${draft.slug}` }
    });
  });
});

describe.each([
  ['', legacyHtml],
  ['.txt', legacyTxt],
  ['.md', legacyMd]
] as const)('legacy %s endpoint', (suffix, handler) => {
  it('redirects a known slug with 301 and the matching suffix', async () => {
    const [post] = await posts.getAllPosts();
    await expect(handler(event({ slug: post.slug }))).rejects.toMatchObject({
      status: 301,
      location: `${post.permalink}${suffix}`
    });
  });

  it('continues to redirect draft slugs', async () => {
    await expect(handler(event({ slug: draft.slug }))).rejects.toMatchObject({
      status: 301,
      location: `${draft.permalink}${suffix}`
    });
  });

  it('retains the missing-slug error', async () => {
    await expect(handler(event({ slug: 'missing' }))).rejects.toMatchObject({
      status: 404,
      body: { message: 'Post not found: missing' }
    });
  });

  it('keeps an ambiguous lookup as a 404 rather than choosing a permalink', async () => {
    // The loader represents both missing and ambiguous slugs as null.
    const lookup = vi.spyOn(posts, 'getPostBySlug').mockReturnValue(null);
    await expect(handler(event({ slug: 'ambiguous' }))).rejects.toMatchObject({
      status: 404,
      body: { message: 'Post not found: ambiguous' }
    });
    expect(lookup).toHaveBeenCalledWith('ambiguous');
  });
});
