import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isRedirect } from '@sveltejs/kit';
import { GET } from './+server';
import type { RequestEvent, RequestEvent as FullRequestEvent } from './$types';
import * as auth from '$lib/server/auth';
import { expectHttpError, expectRedirect } from '$lib/test-helpers';

// Mock the auth module (env mocks are in vitest-setup.ts)
vi.mock('$lib/server/auth', async () => {
  const actual = await vi.importActual('$lib/server/auth');
  return {
    ...actual,
    generateState: vi.fn(() => 'mock_oauth_state')
  };
});

// Helper to create mock request event
function createRequestEvent(params: Record<string, string>): RequestEvent {
  const searchParams = new URLSearchParams(params);
  const url = new URL(`https://example.com/auth/indieauth/authorize?${searchParams}`);

  return {
    request: new Request(url),
    url,
    params: {},
    locals: {} as App.Locals,
    cookies: {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn()
    } as unknown as FullRequestEvent['cookies'],
    fetch: globalThis.fetch,
    getClientAddress: () => '127.0.0.1',
    isDataRequest: false,
    isSubRequest: false,
    platform: undefined,
    route: { id: '/auth/indieauth/authorize' },
    setHeaders: vi.fn()
  } as unknown as RequestEvent;
}

describe('IndieAuth Authorization Endpoint Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Parameter Validation', () => {
    it('should reject requests missing me parameter', async () => {
      const event = createRequestEvent({
        client_id: 'https://client.example.com/',
        redirect_uri: 'https://client.example.com/callback',
        state: 'client_state'
      });

      await expectHttpError(GET(event), 400, 'Missing required parameters');
    });

    it('should reject requests missing client_id parameter', async () => {
      const event = createRequestEvent({
        me: 'https://example.com/',
        redirect_uri: 'https://client.example.com/callback',
        state: 'client_state'
      });

      await expectHttpError(GET(event), 400, 'Missing required parameters');
    });

    it('should reject requests missing redirect_uri parameter', async () => {
      const event = createRequestEvent({
        me: 'https://example.com/',
        client_id: 'https://client.example.com/',
        state: 'client_state'
      });

      await expectHttpError(GET(event), 400, 'Missing required parameters');
    });

    it('should reject requests missing state parameter', async () => {
      const event = createRequestEvent({
        me: 'https://example.com/',
        client_id: 'https://client.example.com/',
        redirect_uri: 'https://client.example.com/callback'
      });

      await expectHttpError(GET(event), 400, 'Missing required parameters');
    });

    it('should reject invalid response_type', async () => {
      const event = createRequestEvent({
        me: 'https://example.com/',
        client_id: 'https://client.example.com/',
        redirect_uri: 'https://client.example.com/callback',
        state: 'client_state',
        response_type: 'token'
      });

      await expectHttpError(GET(event), 400, 'Only response_type=code is supported');
    });
  });

  describe('Security: PKCE Validation', () => {
    it('should reject invalid code_challenge_method', async () => {
      const event = createRequestEvent({
        me: 'https://example.com/',
        client_id: 'https://client.example.com/',
        redirect_uri: 'https://client.example.com/callback',
        state: 'client_state',
        code_challenge: 'challenge123',
        code_challenge_method: 'MD5'
      });

      await expectHttpError(GET(event), 400, 'code_challenge_method must be S256 or plain');
    });

    it('should accept S256 code_challenge_method', async () => {
      const event = createRequestEvent({
        me: 'https://example.com/',
        client_id: 'https://client.example.com/',
        redirect_uri: 'https://client.example.com/callback',
        state: 'client_state',
        code_challenge: 'challenge123',
        code_challenge_method: 'S256'
      });

      vi.spyOn(auth, 'getSession').mockResolvedValue({});
      vi.spyOn(auth, 'setSession').mockResolvedValue(undefined);

      await expectRedirect(GET(event));
    });

    it('should accept plain code_challenge_method', async () => {
      const event = createRequestEvent({
        me: 'https://example.com/',
        client_id: 'https://client.example.com/',
        redirect_uri: 'https://client.example.com/callback',
        state: 'client_state',
        code_challenge: 'challenge123',
        code_challenge_method: 'plain'
      });

      vi.spyOn(auth, 'getSession').mockResolvedValue({});
      vi.spyOn(auth, 'setSession').mockResolvedValue(undefined);

      await expectRedirect(GET(event));
    });
  });

  describe('Security: Domain Validation', () => {
    it('should reject me parameter from different origin', async () => {
      const event = createRequestEvent({
        me: 'https://attacker.com/',
        client_id: 'https://client.example.com/',
        redirect_uri: 'https://client.example.com/callback',
        state: 'client_state'
      });

      await expectHttpError(GET(event), 400, "The 'me' parameter must match your site URL");
    });

    it('should accept me parameter from same origin', async () => {
      const event = createRequestEvent({
        me: 'https://example.com/',
        client_id: 'https://client.example.com/',
        redirect_uri: 'https://client.example.com/callback',
        state: 'client_state'
      });

      vi.spyOn(auth, 'getSession').mockResolvedValue({});
      vi.spyOn(auth, 'setSession').mockResolvedValue(undefined);

      await expectRedirect(GET(event));
    });
  });

  describe('Security: Redirect URI Validation', () => {
    it('should reject non-https redirect_uri', async () => {
      // Test with http: URI (insecure) - should be rejected
      const event = createRequestEvent({
        me: 'https://example.com/',
        client_id: 'https://client.example.com/',
        redirect_uri: 'http://client.example.com/callback',
        state: 'client_state'
      });

      vi.spyOn(auth, 'getSession').mockResolvedValue({});
      vi.spyOn(auth, 'setSession').mockResolvedValue(undefined);

      // Should only allow https:// URIs (except localhost for dev)
      await expectHttpError(GET(event), 400, 'redirect_uri must use https');
    });

    it('should reject javascript: URI scheme', async () => {
      // Test with javascript: URI (XSS vector)
      const event = createRequestEvent({
        me: 'https://example.com/',
        client_id: 'https://client.example.com/',
        redirect_uri: 'javascript:alert(document.domain)',
        state: 'client_state'
      });

      vi.spyOn(auth, 'getSession').mockResolvedValue({});
      vi.spyOn(auth, 'setSession').mockResolvedValue(undefined);

      // Should reject dangerous URI schemes
      await expect(GET(event)).rejects.toThrow();
    });

    it('should reject data: URI scheme', async () => {
      const event = createRequestEvent({
        me: 'https://example.com/',
        client_id: 'https://client.example.com/',
        redirect_uri: 'data:text/html,<script>alert(1)</script>',
        state: 'client_state'
      });

      vi.spyOn(auth, 'getSession').mockResolvedValue({});
      vi.spyOn(auth, 'setSession').mockResolvedValue(undefined);

      await expect(GET(event)).rejects.toThrow();
    });

    it('should allow localhost http URIs for development', async () => {
      // localhost http is acceptable for development
      const event = createRequestEvent({
        me: 'https://example.com/',
        client_id: 'http://localhost:3000/',
        redirect_uri: 'http://localhost:3000/callback',
        state: 'client_state'
      });

      vi.spyOn(auth, 'getSession').mockResolvedValue({});
      vi.spyOn(auth, 'setSession').mockResolvedValue(undefined);

      await expectRedirect(GET(event));
    });
  });

  describe('Security: State Management', () => {
    it('should generate unique OAuth state', async () => {
      const event = createRequestEvent({
        me: 'https://example.com/',
        client_id: 'https://client.example.com/',
        redirect_uri: 'https://client.example.com/callback',
        state: 'client_state'
      });

      vi.spyOn(auth, 'getSession').mockResolvedValue({});
      const setSessionSpy = vi.spyOn(auth, 'setSession').mockResolvedValue(undefined);

      try {
        await GET(event);
      } catch (e) {
        if (!isRedirect(e)) throw e;
        expect(e.status).toBe(302);
      }

      // Verify session includes OAuth state
      expect(setSessionSpy).toHaveBeenCalled();
      const sessionData = setSessionSpy.mock.calls[0][1];
      expect(sessionData.oauthState).toBeTruthy();
      expect(sessionData.oauthState).toBe('mock_oauth_state');
    });

    it('should preserve client state separately from OAuth state', async () => {
      const event = createRequestEvent({
        me: 'https://example.com/',
        client_id: 'https://client.example.com/',
        redirect_uri: 'https://client.example.com/callback',
        state: 'client_csrf_token'
      });

      vi.spyOn(auth, 'getSession').mockResolvedValue({});
      const setSessionSpy = vi.spyOn(auth, 'setSession').mockResolvedValue(undefined);

      try {
        await GET(event);
      } catch (e) {
        if (!isRedirect(e)) throw e;
        expect(e.status).toBe(302);
      }

      // Verify both states are stored
      const sessionData = setSessionSpy.mock.calls[0][1];
      expect(sessionData.oauthState).toBe('mock_oauth_state'); // Our state
      expect(sessionData.indieAuthRequest?.state).toBe('client_csrf_token'); // Client's state
    });
  });

  describe('Integration: Full Authorization Flow', () => {
    it('should store all request parameters in session', async () => {
      const event = createRequestEvent({
        me: 'https://example.com/',
        client_id: 'https://client.example.com/',
        redirect_uri: 'https://client.example.com/callback',
        state: 'client_state',
        code_challenge: 'challenge_abc123',
        code_challenge_method: 'S256'
      });

      vi.spyOn(auth, 'getSession').mockResolvedValue({});
      const setSessionSpy = vi.spyOn(auth, 'setSession').mockResolvedValue(undefined);

      try {
        await GET(event);
      } catch (e) {
        if (!isRedirect(e)) throw e;
        expect(e.status).toBe(302);
      }

      const sessionData = setSessionSpy.mock.calls[0][1];
      expect(sessionData.indieAuthRequest).toEqual({
        me: 'https://example.com/',
        clientId: 'https://client.example.com/',
        redirectUri: 'https://client.example.com/callback',
        state: 'client_state',
        codeChallenge: 'challenge_abc123',
        codeChallengeMethod: 'S256'
      });
    });

    it('should redirect to GitHub OAuth', async () => {
      const event = createRequestEvent({
        me: 'https://example.com/',
        client_id: 'https://client.example.com/',
        redirect_uri: 'https://client.example.com/callback',
        state: 'client_state'
      });

      vi.spyOn(auth, 'getSession').mockResolvedValue({});
      vi.spyOn(auth, 'setSession').mockResolvedValue(undefined);

      const location = await expectRedirect(GET(event));
      expect(location).toContain('github.com/login/oauth/authorize');
      expect(location).toContain('state=mock_oauth_state');
    });
  });
});
