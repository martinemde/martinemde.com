import { describe, it, expect, beforeAll } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { GET as getMd } from './[slug].md/+server';
import { GET as getTxt } from './[slug].txt/+server';
import { getAllPosts } from '$lib/utils/posts';

let slug: string;

beforeAll(async () => {
  const posts = await getAllPosts();
  slug = posts[0].slug;
});

type RawHandler = (event: RequestEvent) => Response | Promise<Response>;

function get(handler: RawHandler, accept: string): Promise<Response> {
  const request = new Request(`https://example.com/blog/${slug}`, { headers: { accept } });

  return Promise.resolve(handler({ params: { slug }, request } as unknown as RequestEvent));
}

describe.each([
  ['/blog/[slug].md', getMd as unknown as RawHandler],
  ['/blog/[slug].txt', getTxt as unknown as RawHandler]
])('GET %s', (_route, handler) => {
  it('serves text/plain to a browser', async () => {
    const response = await get(handler, 'text/html,application/xhtml+xml,*/*;q=0.8');

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
  });

  it('serves text/markdown to an agent that asks for it', async () => {
    const response = await get(handler, 'text/markdown');

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/markdown; charset=utf-8');
  });

  it('varies on Accept', async () => {
    const response = await get(handler, 'text/markdown');

    expect(response.headers.get('Vary')).toBe('Accept, Accept-Encoding');
  });
});
