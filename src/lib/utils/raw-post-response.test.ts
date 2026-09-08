import { describe, it, expect, beforeAll } from 'vitest';
import { rawPostResponse } from './raw-post-response';
import { getAllPosts } from './posts';
import { expectHttpError } from '$lib/test-helpers';

let slug: string;

beforeAll(async () => {
  const posts = await getAllPosts();
  slug = posts[0].slug;
});

describe('rawPostResponse', () => {
  it('serves text/plain when the client states no preference', async () => {
    const response = rawPostResponse(slug, null);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    await expect(response.text()).resolves.toContain('---');
  });

  it('serves text/markdown to a client that asks for markdown', () => {
    const response = rawPostResponse(slug, 'text/markdown');

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/markdown; charset=utf-8');
  });

  it('serves the same bytes under either content type', async () => {
    const plain = await rawPostResponse(slug, 'text/plain').text();
    const markdown = await rawPostResponse(slug, 'text/markdown').text();

    expect(markdown).toBe(plain);
  });

  it('varies on Accept so a CDN cannot cross-serve the two variants', () => {
    for (const accept of [null, 'text/markdown', 'application/json']) {
      expect(rawPostResponse(slug, accept).headers.get('Vary')).toBe('Accept, Accept-Encoding');
    }
  });

  it('returns 406 when the client accepts neither type', async () => {
    const response = rawPostResponse(slug, 'application/json');

    expect(response.status).toBe(406);
    await expect(response.text()).resolves.toContain('text/plain or text/markdown');
  });

  it('returns 404 for an unknown slug', async () => {
    await expectHttpError(
      Promise.resolve().then(() => rawPostResponse('no-such-post', null)),
      404,
      'no-such-post'
    );
  });
});
