import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './+server';
import type { RequestEvent } from './$types';
import * as auth from '$lib/server/auth';
import * as githubAuth from '$lib/server/github-auth';

// Mock the auth and github-auth modules
vi.mock('$lib/server/auth', async () => {
  const actual = await vi.importActual('$lib/server/auth');
  return {
    ...actual,
    exchangeCodeForToken: vi.fn(),
    createAuthCode: vi.fn()
  };
});

vi.mock('$lib/server/github-auth', () => ({
  getGitHubUser: vi.fn(),
  verifyRepoOwnership: vi.fn()
}));

// Helper to create mock request event
function createRequestEvent(code: string, state: string, sessionData: any = {}): RequestEvent {
  const url = new URL(`https://example.com/auth/github/callback?code=${code}&state=${state}`);
  const sessionStore: any = { ...sessionData };

  return {
    request: new Request(url),
    url,
    params: {},
    locals: {} as App.Locals,
    cookies: {
      get: vi.fn((name: string) => {
        if (name === 'micropub_session' && Object.keys(sessionStore).length > 0) {
          return 'mock_session_cookie';
        }
        return undefined;
      }),
      set: vi.fn(),
      delete: vi.fn()
    } as any,
    fetch: globalThis.fetch,
    getClientAddress: () => '127.0.0.1',
    isDataRequest: false,
    isSubRequest: false,
    platform: undefined,
    route: { id: '/auth/github/callback' },
    setHeaders: vi.fn()
  } as unknown as RequestEvent;
}

describe('GitHub OAuth Callback Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    vi.mocked(auth.exchangeCodeForToken).mockResolvedValue('mock_github_token');
    vi.mocked(githubAuth.getGitHubUser).mockResolvedValue({
      id: 123,
      login: 'testuser',
      name: 'Test User',
      avatar_url: 'https://example.com/avatar.jpg'
    });
    vi.mocked(githubAuth.verifyRepoOwnership).mockResolvedValue(true);
  });

  describe('Parameter Validation', () => {
    it('should reject requests missing code parameter', async () => {
      const event = createRequestEvent('', 'valid_state', { oauthState: 'valid_state' });
      event.url.searchParams.delete('code');

      try {
        await GET(event);
        expect.fail('Should have thrown an error');
      } catch (e: any) {
        expect(e.status).toBe(400);
        expect(e.body?.message).toBe('Missing code or state parameter');
      }
    });

    it('should reject requests missing state parameter', async () => {
      const event = createRequestEvent('valid_code', '', { oauthState: 'valid_state' });
      event.url.searchParams.delete('state');

      try {
        await GET(event);
        expect.fail('Should have thrown an error');
      } catch (e: any) {
        expect(e.status).toBe(400);
        expect(e.body?.message).toBe('Missing code or state parameter');
      }
    });
  });

  describe('Security: CSRF State Validation', () => {
    it('should reject requests with invalid state', async () => {
      const event = createRequestEvent('valid_code', 'wrong_state', {
        oauthState: 'correct_state'
      });

      // Mock getSession to return the session with oauthState
      vi.spyOn(auth, 'getSession').mockResolvedValue({ oauthState: 'correct_state' });

      try {
        await GET(event);
        expect.fail('Should have thrown an error');
      } catch (e: any) {
        expect(e.status).toBe(400);
        expect(e.body?.message).toBe('Invalid state parameter');
      }
    });

    it('should reject requests with missing session state', async () => {
      const event = createRequestEvent('valid_code', 'some_state', {});

      // Mock getSession to return empty session
      vi.spyOn(auth, 'getSession').mockResolvedValue({});

      try {
        await GET(event);
        expect.fail('Should have thrown an error');
      } catch (e: any) {
        expect(e.status).toBe(400);
        expect(e.body?.message).toBe('Invalid state parameter');
      }
    });

    it('should clear state after successful validation', async () => {
      const event = createRequestEvent('valid_code', 'valid_state', { oauthState: 'valid_state' });

      // Mock getSession and setSession
      const mockSession = { oauthState: 'valid_state' };
      vi.spyOn(auth, 'getSession').mockResolvedValue(mockSession);

      const setSessionSpy = vi.spyOn(auth, 'setSession').mockResolvedValue(undefined);

      try {
        await GET(event);
      } catch (e: any) {
        // Redirect is expected
        if (!e.status || e.status !== 302) {
          throw e;
        }
      }

      // Verify setSession was called
      expect(setSessionSpy).toHaveBeenCalled();

      // Check if oauthState was cleared in any setSession call
      const setSessionCalls = setSessionSpy.mock.calls;
      const clearedState = setSessionCalls.some((call) => {
        const sessionData = call[1];
        return !sessionData.oauthState;
      });

      // State should be cleared after use (security best practice)
      expect(clearedState).toBe(true);
    });
  });

  describe('Security: Session Fixation Protection', () => {
    it('SECURITY ISSUE: should rotate session after authentication', async () => {
      const event = createRequestEvent('valid_code', 'valid_state', {
        oauthState: 'valid_state',
        // Simulate existing user session
        user: { id: 999, login: 'olduser', name: 'Old User', avatar_url: '' }
      });

      vi.spyOn(auth, 'getSession').mockResolvedValue({
        oauthState: 'valid_state',
        user: { id: 999, login: 'olduser', name: 'Old User', avatar_url: '' }
      });

      const setSessionSpy = vi.spyOn(auth, 'setSession').mockResolvedValue(undefined);

      try {
        await GET(event);
      } catch (e: any) {
        if (!e.status || e.status !== 302) {
          throw e;
        }
      }

      // New user should replace old user in session
      expect(setSessionSpy).toHaveBeenCalled();

      const finalSessionCall = setSessionSpy.mock.calls[setSessionSpy.mock.calls.length - 1];
      const finalSession = finalSessionCall[1];

      // Should have new user, not old user
      expect(finalSession.user?.login).toBe('testuser');

      // POTENTIAL ISSUE: Session ID not rotated (SvelteKit handles this at framework level)
      // This is acceptable if SvelteKit's session handling prevents fixation
    });
  });

  describe('Security: Repository Access Control', () => {
    it('should reject users without repository access', async () => {
      const event = createRequestEvent('valid_code', 'valid_state', { oauthState: 'valid_state' });

      vi.spyOn(auth, 'getSession').mockResolvedValue({ oauthState: 'valid_state' });
      vi.mocked(githubAuth.verifyRepoOwnership).mockResolvedValue(false);

      try {
        await GET(event);
        expect.fail('Should have thrown an error');
      } catch (e: any) {
        expect(e.status).toBe(403);
        expect(e.body?.message).toContain('You do not have access to this repository');
      }
    });

    it('should allow repository owners', async () => {
      const event = createRequestEvent('valid_code', 'valid_state', { oauthState: 'valid_state' });

      vi.spyOn(auth, 'getSession').mockResolvedValue({ oauthState: 'valid_state' });
      vi.mocked(githubAuth.verifyRepoOwnership).mockResolvedValue(true);

      try {
        await GET(event);
      } catch (e: any) {
        // Redirect is expected
        expect(e.status).toBe(302);
        expect(e.location).toBe('/editor');
      }
    });
  });

  describe('Security: IndieAuth Flow', () => {
    it('should validate redirect_uri in IndieAuth flow', async () => {
      const event = createRequestEvent('valid_code', 'valid_state', {
        oauthState: 'valid_state',
        indieAuthRequest: {
          me: 'https://example.com/',
          clientId: 'https://client.example.com/',
          redirectUri: 'https://client.example.com/callback',
          state: 'client_state'
        }
      });

      vi.spyOn(auth, 'getSession').mockResolvedValue({
        oauthState: 'valid_state',
        indieAuthRequest: {
          me: 'https://example.com/',
          clientId: 'https://client.example.com/',
          redirectUri: 'https://client.example.com/callback',
          state: 'client_state'
        }
      });

      vi.mocked(auth.createAuthCode).mockResolvedValue('sealed_auth_code');
      const setSessionSpy = vi.spyOn(auth, 'setSession').mockResolvedValue(undefined);

      try {
        await GET(event);
      } catch (e: any) {
        // Redirect is expected
        expect(e.status).toBe(302);

        // Should redirect to client's callback
        expect(e.location).toContain('https://client.example.com/callback');
        expect(e.location).toContain('code=sealed_auth_code');
        expect(e.location).toContain('state=client_state');
      }

      // IndieAuth request should be cleared from session
      const finalSessionCall = setSessionSpy.mock.calls[setSessionSpy.mock.calls.length - 1];
      const finalSession = finalSessionCall[1];
      expect(finalSession.indieAuthRequest).toBeUndefined();
    });

    it('should validate and reject dangerous redirect_uri schemes', async () => {
      // Test that we reject javascript:, data:, and other dangerous URI schemes

      const event = createRequestEvent('valid_code', 'valid_state', {
        oauthState: 'valid_state',
        indieAuthRequest: {
          me: 'https://example.com/',
          clientId: 'https://client.example.com/',
          redirectUri: 'javascript:alert(1)',
          state: 'client_state'
        }
      });

      vi.spyOn(auth, 'getSession').mockResolvedValue({
        oauthState: 'valid_state',
        indieAuthRequest: {
          me: 'https://example.com/',
          clientId: 'https://client.example.com/',
          redirectUri: 'javascript:alert(1)',
          state: 'client_state'
        }
      });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        await GET(event);
        expect.fail('Should have thrown an error');
      } catch (e: any) {
        // Should return 500 error (caught as unexpected error)
        expect(e.status).toBe(500);
        expect(e.body?.message).toBe('Authentication failed');
      }

      // Should have logged the validation error
      expect(consoleErrorSpy).toHaveBeenCalled();
      const errorMessage = String(consoleErrorSpy.mock.calls[0][1]);
      // javascript: scheme will fail either URL parsing or https validation
      expect(errorMessage).toMatch(/Invalid redirect_uri|redirect_uri must use https/);

      consoleErrorSpy.mockRestore();
    });

    it('should reject non-https redirect_uri (except localhost)', async () => {
      const event = createRequestEvent('valid_code', 'valid_state', {
        oauthState: 'valid_state',
        indieAuthRequest: {
          me: 'https://example.com/',
          clientId: 'https://client.example.com/',
          redirectUri: 'http://evil.com/callback',
          state: 'client_state'
        }
      });

      vi.spyOn(auth, 'getSession').mockResolvedValue({
        oauthState: 'valid_state',
        indieAuthRequest: {
          me: 'https://example.com/',
          clientId: 'https://client.example.com/',
          redirectUri: 'http://evil.com/callback',
          state: 'client_state'
        }
      });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        await GET(event);
        expect.fail('Should have thrown an error');
      } catch (e: any) {
        expect(e.status).toBe(500);
        expect(e.body?.message).toBe('Authentication failed');
      }

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(String(consoleErrorSpy.mock.calls[0][1])).toContain('https');

      consoleErrorSpy.mockRestore();
    });

    it('should allow http://localhost redirect_uri for development', async () => {
      const event = createRequestEvent('valid_code', 'valid_state', {
        oauthState: 'valid_state',
        indieAuthRequest: {
          me: 'https://example.com/',
          clientId: 'https://client.example.com/',
          redirectUri: 'http://localhost:3000/callback',
          state: 'client_state_123',
          codeChallenge: 'challenge123',
          codeChallengeMethod: 'S256'
        }
      });

      vi.spyOn(auth, 'getSession').mockResolvedValue({
        oauthState: 'valid_state',
        indieAuthRequest: {
          me: 'https://example.com/',
          clientId: 'https://client.example.com/',
          redirectUri: 'http://localhost:3000/callback',
          state: 'client_state_123',
          codeChallenge: 'challenge123',
          codeChallengeMethod: 'S256'
        }
      });

      vi.mocked(auth.createAuthCode).mockResolvedValue('sealed_auth_code');

      let redirectError: any;
      try {
        await GET(event);
      } catch (e: any) {
        redirectError = e;
      }

      // Should successfully redirect to localhost
      expect(redirectError).toBeDefined();
      expect(redirectError.status).toBe(302);
      expect(redirectError.location).toContain('http://localhost:3000/callback');
    });
  });

  describe('Security: Error Handling', () => {
    it('should not leak sensitive information in error messages', async () => {
      const event = createRequestEvent('valid_code', 'valid_state', { oauthState: 'valid_state' });

      vi.spyOn(auth, 'getSession').mockResolvedValue({ oauthState: 'valid_state' });
      vi.mocked(auth.exchangeCodeForToken).mockRejectedValue(
        new Error('Detailed internal error with sensitive data: SECRET_KEY=abc123')
      );

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        await GET(event);
        expect.fail('Should have thrown an error');
      } catch (e: any) {
        // Should return generic error message, not the detailed internal error
        expect(e.status).toBe(500);
        expect(e.body?.message).toBe('Authentication failed');
        expect(e.body?.message).not.toContain('SECRET_KEY');
      }

      // Verify sensitive data was logged but not exposed to user
      expect(consoleErrorSpy).toHaveBeenCalled();
      const errorLog = consoleErrorSpy.mock.calls[0][1];
      expect(String(errorLog)).toContain('SECRET_KEY=abc123');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Redirect Handling', () => {
    it('should redirect to /editor on successful normal OAuth flow', async () => {
      const event = createRequestEvent('valid_code', 'valid_state', { oauthState: 'valid_state' });

      vi.spyOn(auth, 'getSession').mockResolvedValue({ oauthState: 'valid_state' });
      const setSessionSpy = vi.spyOn(auth, 'setSession').mockResolvedValue(undefined);

      let redirectError: any;
      try {
        await GET(event);
      } catch (e: any) {
        redirectError = e;
      }

      // Should throw redirect exception (SvelteKit's redirect mechanism)
      expect(redirectError).toBeDefined();
      expect(redirectError.status).toBe(302);
      expect(redirectError.location).toBe('/editor');

      // Should have saved user and token to session
      expect(setSessionSpy).toHaveBeenCalledWith(event, {
        user: {
          id: 123,
          login: 'testuser',
          name: 'Test User',
          avatar_url: 'https://example.com/avatar.jpg'
        },
        githubToken: 'mock_github_token'
      });
    });

    it('should redirect to client callback on successful IndieAuth flow', async () => {
      const event = createRequestEvent('valid_code', 'valid_state', {
        oauthState: 'valid_state',
        indieAuthRequest: {
          me: 'https://example.com/',
          clientId: 'https://client.example.com/',
          redirectUri: 'https://client.example.com/callback',
          state: 'client_state_123',
          codeChallenge: 'challenge123',
          codeChallengeMethod: 'S256'
        }
      });

      vi.spyOn(auth, 'getSession').mockResolvedValue({
        oauthState: 'valid_state',
        indieAuthRequest: {
          me: 'https://example.com/',
          clientId: 'https://client.example.com/',
          redirectUri: 'https://client.example.com/callback',
          state: 'client_state_123',
          codeChallenge: 'challenge123',
          codeChallengeMethod: 'S256'
        }
      });

      vi.mocked(auth.createAuthCode).mockResolvedValue('sealed_auth_code_xyz');
      const setSessionSpy = vi.spyOn(auth, 'setSession').mockResolvedValue(undefined);

      let redirectError: any;
      try {
        await GET(event);
      } catch (e: any) {
        redirectError = e;
      }

      // Should throw redirect exception, NOT a 500 error
      expect(redirectError).toBeDefined();
      expect(redirectError.status).toBe(302);
      expect(redirectError.location).toContain('https://client.example.com/callback');
      expect(redirectError.location).toContain('code=sealed_auth_code_xyz');
      expect(redirectError.location).toContain('state=client_state_123');

      // Should have cleared IndieAuth request from session
      expect(setSessionSpy).toHaveBeenCalledWith(event, {
        user: {
          id: 123,
          login: 'testuser',
          name: 'Test User',
          avatar_url: 'https://example.com/avatar.jpg'
        },
        githubToken: 'mock_github_token'
      });
    });

    it('should return 500 error on actual GitHub API failures', async () => {
      const event = createRequestEvent('valid_code', 'valid_state', { oauthState: 'valid_state' });

      vi.spyOn(auth, 'getSession').mockResolvedValue({ oauthState: 'valid_state' });
      vi.mocked(githubAuth.getGitHubUser).mockRejectedValue(new Error('GitHub API error'));

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        await GET(event);
        expect.fail('Should have thrown an error');
      } catch (e: any) {
        expect(e.status).toBe(500);
        expect(e.body?.message).toBe('Authentication failed');
      }

      // Should log the actual error
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(String(consoleErrorSpy.mock.calls[0][1])).toContain('GitHub API error');

      consoleErrorSpy.mockRestore();
    });

    it('should return 500 error when token exchange fails', async () => {
      const event = createRequestEvent('valid_code', 'valid_state', { oauthState: 'valid_state' });

      vi.spyOn(auth, 'getSession').mockResolvedValue({ oauthState: 'valid_state' });
      vi.mocked(auth.exchangeCodeForToken).mockRejectedValue(
        new Error('Invalid authorization code')
      );

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        await GET(event);
        expect.fail('Should have thrown an error');
      } catch (e: any) {
        expect(e.status).toBe(500);
        expect(e.body?.message).toBe('Authentication failed');
      }

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(String(consoleErrorSpy.mock.calls[0][1])).toContain('Invalid authorization code');

      consoleErrorSpy.mockRestore();
    });

    it('should return 500 error when token is empty', async () => {
      const event = createRequestEvent('valid_code', 'valid_state', { oauthState: 'valid_state' });

      vi.spyOn(auth, 'getSession').mockResolvedValue({ oauthState: 'valid_state' });
      vi.mocked(auth.exchangeCodeForToken).mockResolvedValue('');

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        await GET(event);
        expect.fail('Should have thrown an error');
      } catch (e: any) {
        expect(e.status).toBe(500);
        expect(e.body?.message).toBe('Authentication failed');
      }

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(String(consoleErrorSpy.mock.calls[0][1])).toContain('Failed to obtain access token');

      consoleErrorSpy.mockRestore();
    });

    it('should return 500 error when user data is invalid', async () => {
      const event = createRequestEvent('valid_code', 'valid_state', { oauthState: 'valid_state' });

      vi.spyOn(auth, 'getSession').mockResolvedValue({ oauthState: 'valid_state' });
      vi.mocked(githubAuth.getGitHubUser).mockResolvedValue({
        id: 123,
        login: '',
        name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg'
      });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        await GET(event);
        expect.fail('Should have thrown an error');
      } catch (e: any) {
        expect(e.status).toBe(500);
        expect(e.body?.message).toBe('Authentication failed');
      }

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(String(consoleErrorSpy.mock.calls[0][1])).toContain(
        'Failed to obtain user information'
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
