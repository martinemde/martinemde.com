import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { handleCsrf, handleSession } from './hooks.server';
import { getSession } from '$lib/server/auth';

vi.mock('$lib/server/auth', () => ({
  getSession: vi.fn(async () => ({
    user: { id: 1, login: 'test', name: 'Test', avatar_url: 'https://example.com/a.png' },
    githubToken: 'session_github_token'
  }))
}));

const ORIGIN = 'https://example.com';

function createEvent(
  method: string,
  path: string,
  options: { headers?: Record<string, string>; body?: BodyInit } = {}
): RequestEvent {
  const url = new URL(path, ORIGIN);

  return {
    request: new Request(url, { method, headers: options.headers, body: options.body }),
    url,
    locals: {} as App.Locals,
    cookies: {} as unknown as RequestEvent['cookies']
  } as RequestEvent;
}

/**
 * Runs CSRF protection then the session handler in the same order as `handle`,
 * and reports whether the request reached the endpoint. The handlers are
 * driven directly because `sequence` needs SvelteKit's internal request store.
 */
async function run(event: RequestEvent) {
  let resolved = false;
  const response = await handleCsrf({
    event,
    resolve: (event) =>
      handleSession({
        event,
        resolve: async () => {
          resolved = true;
          return new Response('ok');
        }
      })
  });

  return { resolved, response, locals: event.locals };
}

describe('CSRF protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks cross-site form submissions to ordinary routes', async () => {
    const { resolved, response } = await run(
      createEvent('POST', '/editor', {
        headers: {
          origin: 'https://evil.example',
          'content-type': 'application/x-www-form-urlencoded'
        },
        body: 'h=entry&content=hi'
      })
    );

    expect(resolved).toBe(false);
    expect(response.status).toBe(403);
    await expect(response.text()).resolves.toContain(
      'Cross-site POST form submissions are forbidden'
    );
  });

  it.each([
    ['/micropub', 'application/x-www-form-urlencoded'],
    ['/micropub/media', 'multipart/form-data; boundary=abc'],
    ['/auth/indieauth/token', 'application/x-www-form-urlencoded']
  ])('allows cross-site form submissions to %s', async (path, contentType) => {
    const { resolved, response } = await run(
      createEvent('POST', path, {
        headers: { 'content-type': contentType },
        body: 'h=entry&content=hi'
      })
    );

    expect(resolved).toBe(true);
    expect(response.status).toBe(200);
  });

  it('allows cross-origin JSON posts, which forms cannot forge', async () => {
    const { resolved } = await run(
      createEvent('POST', '/micropub', {
        headers: { origin: 'https://client.example', 'content-type': 'application/json' },
        body: '{}'
      })
    );

    expect(resolved).toBe(true);
  });
});

describe('session handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('attaches the session to same-origin requests', async () => {
    const { locals } = await run(
      createEvent('POST', '/micropub', {
        headers: { origin: ORIGIN, 'content-type': 'application/x-www-form-urlencoded' },
        body: 'h=entry&content=hi'
      })
    );

    expect(getSession).toHaveBeenCalled();
    expect(locals.githubToken).toBe('session_github_token');
  });

  it('attaches the session to same-origin GETs, which send no origin header', async () => {
    const { locals } = await run(createEvent('GET', '/micropub?q=config'));

    expect(locals.githubToken).toBe('session_github_token');
  });

  it('withholds the session from cross-site submissions to exempt endpoints', async () => {
    const { resolved, locals } = await run(
      createEvent('POST', '/micropub', {
        headers: {
          origin: 'https://evil.example',
          'content-type': 'application/x-www-form-urlencoded'
        },
        body: 'h=entry&content=hi'
      })
    );

    expect(resolved).toBe(true);
    expect(getSession).not.toHaveBeenCalled();
    expect(locals.githubToken).toBeUndefined();
    expect(locals.user).toBeUndefined();
  });
});
