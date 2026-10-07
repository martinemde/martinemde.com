import { readFile } from 'node:fs/promises';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as posts from '#lib/utils/posts.ts';
import { postRouteParams } from '#lib/utils/post-routing.ts';
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

describe.each([
  ['.txt', txt],
  ['.md', md]
] as const)('dated %s endpoint', (_suffix, handler) => {
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
