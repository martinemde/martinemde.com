import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { handleArticleNegotiation } from './hooks.server';
import { getAllPosts } from '$lib/utils/posts';

let slug: string;

beforeAll(async () => {
  const posts = await getAllPosts();
  slug = posts[0].slug;
});

const html = () =>
  new Response('<!doctype html><html></html>', {
    headers: { 'Content-Type': 'text/html' }
  });

function request(
  accept: string | null,
  options: { routeId?: string | null; slug?: string; isDataRequest?: boolean } = {}
) {
  const resolve = vi.fn(async () => html());
  const event = {
    route: { id: options.routeId === undefined ? '/blog/[slug]' : options.routeId },
    params: { slug: options.slug ?? slug },
    request: new Request('https://example.com/blog/post', {
      headers: accept === null ? undefined : { accept }
    }),
    isDataRequest: options.isDataRequest ?? false
  } as unknown as RequestEvent;

  return { resolve, response: handleArticleNegotiation({ event, resolve }) };
}

describe('handleArticleNegotiation', () => {
  it('renders the page for a browser', async () => {
    const { resolve, response } = request(
      'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    );

    expect((await response).headers.get('Content-Type')).toBe('text/html');
    expect(resolve).toHaveBeenCalled();
  });

  it('renders the page for a client stating no preference', async () => {
    expect((await request(null).response).headers.get('Content-Type')).toBe('text/html');
    expect((await request('*/*').response).headers.get('Content-Type')).toBe('text/html');
  });

  it('serves raw markdown to an agent that asks for it', async () => {
    const { resolve, response } = request('text/markdown');
    const result = await response;

    expect(result.headers.get('Content-Type')).toBe('text/markdown; charset=utf-8');
    await expect(result.text()).resolves.toContain('---');
    // The page was never rendered, so no session was loaded for it either.
    expect(resolve).not.toHaveBeenCalled();
  });

  it('serves raw markdown as text/plain when that is what was asked for', async () => {
    const result = await request('text/plain').response;

    expect(result.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
  });

  it('prefers markdown when the client ranks it above HTML', async () => {
    const result = await request('text/markdown, text/html;q=0.9').response;

    expect(result.headers.get('Content-Type')).toBe('text/markdown; charset=utf-8');
  });

  it('varies on Accept whichever representation it picked', async () => {
    for (const accept of [null, '*/*', 'text/markdown', 'application/json']) {
      const result = await request(accept).response;

      expect(result.headers.get('Vary')).toBe('Accept, Accept-Encoding');
    }
  });

  it('falls back to HTML rather than 406 when Accept matches nothing', async () => {
    const result = await request('application/json').response;

    expect(result.status).toBe(200);
    expect(result.headers.get('Content-Type')).toBe('text/html');
  });

  it('leaves data requests alone so client-side navigation still gets JSON', async () => {
    const { resolve } = request('text/markdown', { isDataRequest: true });

    expect(resolve).toHaveBeenCalled();
  });

  it('ignores routes other than a blog article', async () => {
    const { resolve } = request('text/markdown', { routeId: '/blog' });

    expect(resolve).toHaveBeenCalled();
  });

  it('falls through to the normal 404 for an unknown slug', async () => {
    const { resolve, response } = request('text/markdown', { slug: 'no-such-post' });

    expect((await response).headers.get('Content-Type')).toBe('text/html');
    expect(resolve).toHaveBeenCalled();
  });
});
