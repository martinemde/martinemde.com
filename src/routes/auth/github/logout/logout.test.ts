import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './+server';
import type { RequestEvent } from './$types';
import * as auth from '$lib/server/auth';
import { storeAccessToken, getAccessToken } from '$lib/server/token-store';

// Mock the auth module
vi.mock('$lib/server/auth', async () => {
  const actual = await vi.importActual('$lib/server/auth');
  return {
    ...actual,
    clearSession: vi.fn()
  };
});

// Helper to create mock request event
function createRequestEvent(): RequestEvent {
  const url = new URL('https://example.com/auth/github/logout');

  return {
    request: new Request(url),
    url,
    params: {},
    locals: {
      user: {
        id: 123,
        login: 'testuser',
        name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg'
      },
      githubToken: 'mock_github_token'
    } as App.Locals,
    cookies: {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn()
    } as any,
    fetch: globalThis.fetch,
    getClientAddress: () => '127.0.0.1',
    isDataRequest: false,
    isSubRequest: false,
    platform: undefined,
    route: { id: '/auth/github/logout' },
    setHeaders: vi.fn()
  } as unknown as RequestEvent;
}

describe('Logout Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Session Management', () => {
    it('should clear session cookie on logout', async () => {
      const event = createRequestEvent();
      const clearSessionSpy = vi.mocked(auth.clearSession);

      try {
        await GET(event);
      } catch (e: any) {
        // Redirect is expected
        expect(e.status).toBe(302);
      }

      expect(clearSessionSpy).toHaveBeenCalledWith(event);
    });

    it('should redirect to editor after logout', async () => {
      const event = createRequestEvent();

      try {
        await GET(event);
      } catch (e: any) {
        expect(e.status).toBe(302);
        expect(e.location).toBe('/editor');
      }
    });
  });

  describe('Security: Token Revocation', () => {
    it('should revoke all IndieAuth tokens on logout', async () => {
      // Create some IndieAuth tokens for this user
      const token1 = storeAccessToken('github_token_123', 'https://example.com/', 'create update');
      const token2 = storeAccessToken('github_token_123', 'https://example.com/', 'create update');

      // Verify tokens exist before logout
      expect(getAccessToken(token1)).toBeTruthy();
      expect(getAccessToken(token2)).toBeTruthy();

      const event = createRequestEvent();
      event.locals.githubToken = 'github_token_123';

      try {
        await GET(event);
      } catch (e: any) {
        // Redirect is expected
        expect(e.status).toBe(302);
      }

      // Tokens should be revoked after logout
      expect(getAccessToken(token1)).toBeNull();
      expect(getAccessToken(token2)).toBeNull();
    });

    it('should prevent logged out user tokens from accessing Micropub', async () => {
      // Create a token
      const accessToken = storeAccessToken(
        'github_token_abc',
        'https://example.com/',
        'create update'
      );

      // User logs out
      const event = createRequestEvent();
      event.locals.githubToken = 'github_token_abc';

      try {
        await GET(event);
      } catch (e: any) {
        expect(e.status).toBe(302);
      }

      // Token should be revoked and cannot be used to access Micropub
      const tokenData = getAccessToken(accessToken);
      expect(tokenData).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle logout when already logged out', async () => {
      const event = createRequestEvent();
      event.locals.user = undefined;
      event.locals.githubToken = undefined;

      try {
        await GET(event);
      } catch (e: any) {
        expect(e.status).toBe(302);
        expect(e.location).toBe('/editor');
      }

      // Should not throw error
      expect(auth.clearSession).toHaveBeenCalled();
    });

    it('should handle logout without active tokens', async () => {
      const event = createRequestEvent();
      event.locals.githubToken = undefined;

      try {
        await GET(event);
      } catch (e: any) {
        expect(e.status).toBe(302);
      }

      // Should succeed without errors
      expect(auth.clearSession).toHaveBeenCalled();
    });
  });
});
