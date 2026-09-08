import { describe, it, expect } from 'vitest';
import { GET } from './+server';
import type { RequestEvent } from './$types';

function get(accept: string | null): Promise<Response> {
  const headers = accept === null ? undefined : { accept };
  const request = new Request('https://example.com/llms.txt', { headers });

  return Promise.resolve(GET({ request } as RequestEvent)) as Promise<Response>;
}

describe('GET /llms.txt', () => {
  it('serves text/plain when the client states no preference', async () => {
    const response = await get(null);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    await expect(response.text()).resolves.toContain('# Martin Emde');
  });

  it('serves text/markdown to a client that asks for markdown', async () => {
    const response = await get('text/markdown');

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/markdown; charset=utf-8');
  });

  it('varies on Accept so a CDN cannot cross-serve the two variants', async () => {
    for (const accept of [null, 'text/markdown', 'application/json']) {
      const response = await get(accept);

      expect(response.headers.get('Vary')).toBe('Accept, Accept-Encoding');
    }
  });

  it('returns 406 when the client accepts neither type', async () => {
    const response = await get('application/json');

    expect(response.status).toBe(406);
  });

  it('links each post to its .txt representation', async () => {
    const body = await (await get(null)).text();

    expect(body).toMatch(/^- \[.+]\(https:\/\/example\.com\/blog\/.+\.txt\)$/m);
  });
});
