import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, POST } from './+server';
import { storeAccessToken } from '$lib/server/token-store';
import type { RequestEvent } from './$types';

// Type for SvelteKit's thrown errors
interface SvelteKitThrowable {
  status: number;
  body?: { message?: string };
}

// Helper to assert that a promise rejects with a SvelteKit HttpError containing a message
async function expectHttpError(
  promise: Promise<unknown>,
  status: number,
  messageContains: string
): Promise<void> {
  try {
    await promise;
    expect.fail('Expected an error to be thrown');
  } catch (e) {
    const err = e as SvelteKitThrowable;
    expect(err.status).toBe(status);
    expect(err.body?.message).toContain(messageContains);
  }
}

// Mock dependencies (env mocks are in vitest-setup.ts)
vi.mock('$lib/server/storage/factory', () => ({
  createStorageBackend: vi.fn(() => ({
    createOrUpdateFile: vi.fn().mockResolvedValue(undefined),
    fileExists: vi.fn().mockResolvedValue(false)
  }))
}));

vi.mock('$lib/server/micropub', () => ({
  parseMicropubRequest: vi.fn((req) => ({
    title: req.name || req.properties?.name?.[0] || 'Test Post',
    content: req.content || req.properties?.content?.[0] || 'Test content',
    slug: req.slug || req.properties?.slug?.[0] || 'test-post',
    published: true,
    date: new Date(),
    author: 'Test Author'
  })),
  generateMarkdownFile: vi.fn(() => '# Test Post\n\nTest content'),
  generateFilePath: vi.fn(() => 'src/content/blog/2025-01-01-test-post.md'),
  generateCommitMessage: vi.fn(() => 'Add new post: Test Post')
}));

// Helper to create mock request event
function createRequestEvent(
  method: string,
  url: string,
  options: {
    headers?: Record<string, string>;
    body?: BodyInit;
    locals?: Partial<App.Locals>;
  } = {}
): RequestEvent {
  const requestUrl = new URL(url);

  const request = new Request(requestUrl, {
    method,
    headers: options.headers,
    body: options.body
  });

  return {
    request,
    url: requestUrl,
    params: {},
    locals: {
      githubToken: options.locals?.githubToken
    } as App.Locals,
    cookies: {} as unknown as RequestEvent['cookies'],
    fetch: globalThis.fetch,
    getClientAddress: () => '127.0.0.1',
    isDataRequest: false,
    isSubRequest: false,
    platform: undefined,
    route: { id: '/micropub' },
    setHeaders: vi.fn()
  } as unknown as RequestEvent;
}

describe('Micropub GET Endpoint', () => {
  let validToken: string;

  beforeEach(() => {
    // Create a valid access token for tests
    validToken = storeAccessToken('github_test_token', 'https://example.com/', 'create');
  });

  describe('Authentication', () => {
    it('should reject requests without authentication', async () => {
      const event = createRequestEvent('GET', 'https://example.com/micropub?q=config');

      await expect(GET(event)).rejects.toMatchObject({
        status: 401
      });
    });

    it('should accept Bearer token in Authorization header', async () => {
      const event = createRequestEvent('GET', 'https://example.com/micropub?q=config', {
        headers: {
          Authorization: `Bearer ${validToken}`
        }
      });

      const response = await GET(event);
      expect(response.status).toBe(200);
    });

    it('should accept access_token in query parameter', async () => {
      const event = createRequestEvent(
        'GET',
        `https://example.com/micropub?q=config&access_token=${validToken}`
      );

      const response = await GET(event);
      expect(response.status).toBe(200);
    });

    it('should accept session-based authentication', async () => {
      const event = createRequestEvent('GET', 'https://example.com/micropub?q=config', {
        locals: {
          githubToken: 'github_session_token'
        }
      });

      const response = await GET(event);
      expect(response.status).toBe(200);
    });

    it('should reject invalid Bearer token', async () => {
      const event = createRequestEvent('GET', 'https://example.com/micropub?q=config', {
        headers: {
          Authorization: 'Bearer invalid_token'
        }
      });

      await expectHttpError(GET(event), 401, 'Unauthorized');
    });
  });

  describe('Configuration Query (q=config)', () => {
    it('should return media-endpoint in config', async () => {
      const event = createRequestEvent('GET', 'https://example.com/micropub?q=config', {
        headers: {
          Authorization: `Bearer ${validToken}`
        }
      });

      const response = await GET(event);
      const data = await response.json();

      expect(data).toEqual({
        'media-endpoint': 'https://example.com/micropub/media',
        'syndicate-to': []
      });
    });
  });

  describe('Invalid Queries', () => {
    it('should reject requests without q parameter', async () => {
      const event = createRequestEvent('GET', 'https://example.com/micropub', {
        headers: {
          Authorization: `Bearer ${validToken}`
        }
      });

      await expectHttpError(GET(event), 400, 'Invalid query parameter');
    });

    it('should reject unsupported query types', async () => {
      const event = createRequestEvent('GET', 'https://example.com/micropub?q=unsupported', {
        headers: {
          Authorization: `Bearer ${validToken}`
        }
      });

      await expectHttpError(GET(event), 400, 'Invalid query parameter');
    });
  });
});

describe('Micropub POST Endpoint', () => {
  let validToken: string;

  beforeEach(() => {
    validToken = storeAccessToken('github_test_token', 'https://example.com/', 'create');
  });

  describe('Authentication', () => {
    it('should accept Bearer token in Authorization header', async () => {
      const event = createRequestEvent('POST', 'https://example.com/micropub', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${validToken}`
        },
        body: JSON.stringify({
          type: ['h-entry'],
          properties: {
            name: ['Test Post'],
            content: ['Test content']
          }
        })
      });

      const response = await POST(event);
      expect(response.status).toBe(201);
    });

    it('should accept access_token in JSON body', async () => {
      const event = createRequestEvent('POST', 'https://example.com/micropub', {
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          access_token: validToken,
          type: ['h-entry'],
          properties: {
            name: ['Test Post'],
            content: ['Test content']
          }
        })
      });

      const response = await POST(event);
      expect(response.status).toBe(201);
    });

    it('should accept access_token in form body', async () => {
      // Use URLSearchParams for application/x-www-form-urlencoded (FormData sends multipart/form-data)
      const params = new URLSearchParams();
      params.append('access_token', validToken);
      params.append('h', 'entry');
      params.append('name', 'Test Post');
      params.append('content', 'Test content');

      const event = createRequestEvent('POST', 'https://example.com/micropub', {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      const response = await POST(event);
      expect(response.status).toBe(201);
    });

    it('should reject unauthenticated requests', async () => {
      const event = createRequestEvent('POST', 'https://example.com/micropub', {
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: ['h-entry'],
          properties: {
            name: ['Test Post'],
            content: ['Test content']
          }
        })
      });

      await expectHttpError(POST(event), 401, 'Unauthorized');
    });
  });

  describe('Content Types', () => {
    it('should accept application/json', async () => {
      const event = createRequestEvent('POST', 'https://example.com/micropub', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${validToken}`
        },
        body: JSON.stringify({
          type: ['h-entry'],
          properties: {
            name: ['JSON Post'],
            content: ['JSON content']
          }
        })
      });

      const response = await POST(event);
      expect(response.status).toBe(201);
      expect(response.headers.get('Location')).toContain('/blog/');
    });

    it('should accept application/x-www-form-urlencoded', async () => {
      const formData = new FormData();
      formData.append('h', 'entry');
      formData.append('name', 'Form Post');
      formData.append('content', 'Form content');

      const event = createRequestEvent('POST', 'https://example.com/micropub', {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Bearer ${validToken}`
        },
        body: formData
      });

      const response = await POST(event);
      expect(response.status).toBe(201);
    });

    it('should reject unsupported content types', async () => {
      const event = createRequestEvent('POST', 'https://example.com/micropub', {
        headers: {
          'Content-Type': 'text/plain',
          Authorization: `Bearer ${validToken}`
        },
        body: 'Plain text'
      });

      await expectHttpError(POST(event), 415, 'Unsupported content type');
    });
  });

  describe('Response Format', () => {
    it('should return 201 Created with Location header', async () => {
      const event = createRequestEvent('POST', 'https://example.com/micropub', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${validToken}`
        },
        body: JSON.stringify({
          type: ['h-entry'],
          properties: {
            name: ['Test Post'],
            content: ['Test content'],
            slug: ['test-slug']
          }
        })
      });

      const response = await POST(event);

      expect(response.status).toBe(201);
      expect(response.headers.get('Location')).toBeTruthy();
      expect(response.headers.get('Location')).toContain('/blog/');
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });
  });
});
