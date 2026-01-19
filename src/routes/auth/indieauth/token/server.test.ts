import { describe, it, expect, vi } from 'vitest';
import { POST } from './+server';
import { createAuthCode } from '$lib/server/auth';
import { getAccessToken } from '$lib/server/token-store';
import type { RequestEvent, RequestEvent as FullRequestEvent } from './$types';

// Type for SvelteKit's thrown errors (env mocks are in vitest-setup.ts)
interface SvelteKitThrowable {
  status: number;
  body: { message?: string };
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

// Token request body type
interface TokenRequestBody {
  grant_type?: string;
  code?: string;
  client_id?: string;
  redirect_uri?: string;
  code_verifier?: string;
}

// Helper to create a PKCE code challenge
async function createCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Helper to create mock request event
function createRequestEvent(
  body: TokenRequestBody,
  contentType: string = 'application/json'
): RequestEvent {
  const url = new URL('https://example.com/auth/indieauth/token');

  let requestBody: BodyInit;
  const headers: Record<string, string> = {
    'Content-Type': contentType
  };

  if (contentType.includes('application/json')) {
    requestBody = JSON.stringify(body);
  } else if (contentType.includes('application/x-www-form-urlencoded')) {
    // Use URLSearchParams for form-urlencoded (FormData sets multipart/form-data)
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined) {
        params.append(key, value);
      }
    }
    requestBody = params.toString();
  } else {
    // For other content types (like text/plain), use empty string
    requestBody = '';
  }

  const request = new Request(url, {
    method: 'POST',
    headers,
    body: requestBody
  });

  return {
    request,
    url,
    params: {},
    locals: {} as App.Locals,
    cookies: {} as unknown as FullRequestEvent['cookies'],
    fetch: globalThis.fetch,
    getClientAddress: () => '127.0.0.1',
    isDataRequest: false,
    isSubRequest: false,
    platform: undefined,
    route: { id: '/auth/indieauth/token' },
    setHeaders: vi.fn()
  } as unknown as RequestEvent;
}

describe('IndieAuth Token Endpoint', () => {
  describe('Content-Type Support', () => {
    it('should accept application/json', async () => {
      const authCode = await createAuthCode({
        githubToken: 'github_token_123',
        me: 'https://example.com/',
        clientId: 'https://client.example.com/',
        redirectUri: 'https://client.example.com/callback'
      });

      const event = createRequestEvent(
        {
          grant_type: 'authorization_code',
          code: authCode,
          client_id: 'https://client.example.com/',
          redirect_uri: 'https://client.example.com/callback'
        },
        'application/json'
      );

      const response = await POST(event);
      expect(response.status).toBe(200);
    });

    it('should accept application/x-www-form-urlencoded', async () => {
      const authCode = await createAuthCode({
        githubToken: 'github_token_123',
        me: 'https://example.com/',
        clientId: 'https://client.example.com/',
        redirectUri: 'https://client.example.com/callback'
      });

      const event = createRequestEvent(
        {
          grant_type: 'authorization_code',
          code: authCode,
          client_id: 'https://client.example.com/',
          redirect_uri: 'https://client.example.com/callback'
        },
        'application/x-www-form-urlencoded'
      );

      const response = await POST(event);
      expect(response.status).toBe(200);
    });

    it('should reject unsupported content types', async () => {
      const event = createRequestEvent({}, 'text/plain');

      await expectHttpError(POST(event), 415, 'Content-Type must be');
    });
  });

  describe('Parameter Validation', () => {
    it('should reject requests missing grant_type', async () => {
      const authCode = await createAuthCode({
        githubToken: 'github_token_123',
        me: 'https://example.com/',
        clientId: 'https://client.example.com/',
        redirectUri: 'https://client.example.com/callback'
      });

      const event = createRequestEvent({
        code: authCode,
        client_id: 'https://client.example.com/',
        redirect_uri: 'https://client.example.com/callback'
      });

      await expectHttpError(POST(event), 400, 'Missing required parameters');
    });

    it('should reject requests missing code', async () => {
      const event = createRequestEvent({
        grant_type: 'authorization_code',
        client_id: 'https://client.example.com/',
        redirect_uri: 'https://client.example.com/callback'
      });

      await expectHttpError(POST(event), 400, 'Missing required parameters');
    });

    it('should reject requests missing client_id', async () => {
      const authCode = await createAuthCode({
        githubToken: 'github_token_123',
        me: 'https://example.com/',
        clientId: 'https://client.example.com/',
        redirectUri: 'https://client.example.com/callback'
      });

      const event = createRequestEvent({
        grant_type: 'authorization_code',
        code: authCode,
        redirect_uri: 'https://client.example.com/callback'
      });

      await expectHttpError(POST(event), 400, 'Missing required parameters');
    });

    it('should reject requests missing redirect_uri', async () => {
      const authCode = await createAuthCode({
        githubToken: 'github_token_123',
        me: 'https://example.com/',
        clientId: 'https://client.example.com/',
        redirectUri: 'https://client.example.com/callback'
      });

      const event = createRequestEvent({
        grant_type: 'authorization_code',
        code: authCode,
        client_id: 'https://client.example.com/'
      });

      await expectHttpError(POST(event), 400, 'Missing required parameters');
    });

    it('should reject invalid grant_type', async () => {
      const authCode = await createAuthCode({
        githubToken: 'github_token_123',
        me: 'https://example.com/',
        clientId: 'https://client.example.com/',
        redirectUri: 'https://client.example.com/callback'
      });

      const event = createRequestEvent({
        grant_type: 'invalid_grant',
        code: authCode,
        client_id: 'https://client.example.com/',
        redirect_uri: 'https://client.example.com/callback'
      });

      await expectHttpError(POST(event), 400, 'grant_type must be authorization_code');
    });
  });

  describe('Authorization Code Validation', () => {
    it('should reject invalid authorization code', async () => {
      const event = createRequestEvent({
        grant_type: 'authorization_code',
        code: 'invalid_code',
        client_id: 'https://client.example.com/',
        redirect_uri: 'https://client.example.com/callback'
      });

      await expectHttpError(POST(event), 400, 'Invalid or expired authorization code');
    });

    it('should reject mismatched client_id', async () => {
      const authCode = await createAuthCode({
        githubToken: 'github_token_123',
        me: 'https://example.com/',
        clientId: 'https://client.example.com/',
        redirectUri: 'https://client.example.com/callback'
      });

      const event = createRequestEvent({
        grant_type: 'authorization_code',
        code: authCode,
        client_id: 'https://different-client.example.com/',
        redirect_uri: 'https://client.example.com/callback'
      });

      await expectHttpError(POST(event), 400, 'client_id does not match');
    });

    it('should reject mismatched redirect_uri', async () => {
      const authCode = await createAuthCode({
        githubToken: 'github_token_123',
        me: 'https://example.com/',
        clientId: 'https://client.example.com/',
        redirectUri: 'https://client.example.com/callback'
      });

      const event = createRequestEvent({
        grant_type: 'authorization_code',
        code: authCode,
        client_id: 'https://client.example.com/',
        redirect_uri: 'https://client.example.com/different-callback'
      });

      await expectHttpError(POST(event), 400, 'redirect_uri does not match');
    });
  });

  describe('PKCE Validation', () => {
    it('should verify PKCE code_verifier (S256)', async () => {
      const verifier = 'test_verifier_' + Math.random();
      const challenge = await createCodeChallenge(verifier);

      const authCode = await createAuthCode({
        githubToken: 'github_token_123',
        me: 'https://example.com/',
        clientId: 'https://client.example.com/',
        redirectUri: 'https://client.example.com/callback',
        codeChallenge: challenge,
        codeChallengeMethod: 'S256'
      });

      const event = createRequestEvent({
        grant_type: 'authorization_code',
        code: authCode,
        client_id: 'https://client.example.com/',
        redirect_uri: 'https://client.example.com/callback',
        code_verifier: verifier
      });

      const response = await POST(event);
      expect(response.status).toBe(200);
    });

    it('should verify PKCE code_verifier (plain)', async () => {
      const verifier = 'plain_verifier_' + Math.random();

      const authCode = await createAuthCode({
        githubToken: 'github_token_123',
        me: 'https://example.com/',
        clientId: 'https://client.example.com/',
        redirectUri: 'https://client.example.com/callback',
        codeChallenge: verifier,
        codeChallengeMethod: 'plain'
      });

      const event = createRequestEvent({
        grant_type: 'authorization_code',
        code: authCode,
        client_id: 'https://client.example.com/',
        redirect_uri: 'https://client.example.com/callback',
        code_verifier: verifier
      });

      const response = await POST(event);
      expect(response.status).toBe(200);
    });

    it('should reject missing code_verifier when code_challenge was used', async () => {
      const verifier = 'test_verifier_' + Math.random();
      const challenge = await createCodeChallenge(verifier);

      const authCode = await createAuthCode({
        githubToken: 'github_token_123',
        me: 'https://example.com/',
        clientId: 'https://client.example.com/',
        redirectUri: 'https://client.example.com/callback',
        codeChallenge: challenge,
        codeChallengeMethod: 'S256'
      });

      const event = createRequestEvent({
        grant_type: 'authorization_code',
        code: authCode,
        client_id: 'https://client.example.com/',
        redirect_uri: 'https://client.example.com/callback'
      });

      await expectHttpError(POST(event), 400, 'code_verifier is required');
    });

    it('should reject invalid code_verifier', async () => {
      const verifier = 'test_verifier_' + Math.random();
      const challenge = await createCodeChallenge(verifier);

      const authCode = await createAuthCode({
        githubToken: 'github_token_123',
        me: 'https://example.com/',
        clientId: 'https://client.example.com/',
        redirectUri: 'https://client.example.com/callback',
        codeChallenge: challenge,
        codeChallengeMethod: 'S256'
      });

      const event = createRequestEvent({
        grant_type: 'authorization_code',
        code: authCode,
        client_id: 'https://client.example.com/',
        redirect_uri: 'https://client.example.com/callback',
        code_verifier: 'wrong_verifier'
      });

      await expectHttpError(POST(event), 400, 'Invalid code_verifier');
    });
  });

  describe('Token Response', () => {
    it('should return valid IndieAuth token response', async () => {
      const authCode = await createAuthCode({
        githubToken: 'github_token_123',
        me: 'https://example.com/',
        clientId: 'https://client.example.com/',
        redirectUri: 'https://client.example.com/callback'
      });

      const event = createRequestEvent({
        grant_type: 'authorization_code',
        code: authCode,
        client_id: 'https://client.example.com/',
        redirect_uri: 'https://client.example.com/callback'
      });

      const response = await POST(event);
      const data = await response.json();

      expect(data).toHaveProperty('access_token');
      expect(data).toHaveProperty('token_type', 'Bearer');
      expect(data).toHaveProperty('scope', 'create update');
      expect(data).toHaveProperty('me', 'https://example.com/');
    });

    it('should issue tokens that can be used for micropub', async () => {
      const authCode = await createAuthCode({
        githubToken: 'github_token_123',
        me: 'https://example.com/',
        clientId: 'https://client.example.com/',
        redirectUri: 'https://client.example.com/callback'
      });

      const event = createRequestEvent({
        grant_type: 'authorization_code',
        code: authCode,
        client_id: 'https://client.example.com/',
        redirect_uri: 'https://client.example.com/callback'
      });

      const response = await POST(event);
      const data = await response.json();

      // Verify the token is stored and can be retrieved
      const tokenData = getAccessToken(data.access_token);
      expect(tokenData).toBeTruthy();
      expect(tokenData?.githubToken).toBe('github_token_123');
      expect(tokenData?.me).toBe('https://example.com/');
      expect(tokenData?.scope).toBe('create update');
    });
  });

  describe('Security: Authorization Code Replay Protection', () => {
    it('should prevent authorization code reuse', async () => {
      const authCode = await createAuthCode({
        githubToken: 'github_token_123',
        me: 'https://example.com/',
        clientId: 'https://client.example.com/',
        redirectUri: 'https://client.example.com/callback'
      });

      const requestParams = {
        grant_type: 'authorization_code',
        code: authCode,
        client_id: 'https://client.example.com/',
        redirect_uri: 'https://client.example.com/callback'
      };

      // First use of the code should succeed
      const event1 = createRequestEvent(requestParams);
      const response1 = await POST(event1);
      expect(response1.status).toBe(200);

      // Second use of the same code should fail
      const event2 = createRequestEvent(requestParams);
      try {
        await POST(event2);
        expect.fail('Should have thrown an error for reused code');
      } catch (e) {
        const err = e as SvelteKitThrowable;
        expect(err.status).toBe(400);
        expect(err.body.message).toContain('Invalid or expired authorization code');
      }
    });

    it('should invalidate code after first successful use', async () => {
      const authCode = await createAuthCode({
        githubToken: 'github_token_456',
        me: 'https://example.com/',
        clientId: 'https://client.example.com/',
        redirectUri: 'https://client.example.com/callback'
      });

      const requestParams = {
        grant_type: 'authorization_code',
        code: authCode,
        client_id: 'https://client.example.com/',
        redirect_uri: 'https://client.example.com/callback'
      };

      // Exchange code for token
      const event1 = createRequestEvent(requestParams);
      await POST(event1);

      // Attempt to reuse code after 1 second
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const event2 = createRequestEvent(requestParams);
      try {
        await POST(event2);
        expect.fail('Should have thrown an error for reused code');
      } catch (e) {
        const err = e as SvelteKitThrowable;
        expect(err.status).toBe(400);
        expect(err.body.message).toContain('Invalid or expired authorization code');
      }
    });
  });

  describe('Security: Timing Attack Protection', () => {
    it('should have consistent timing for invalid vs valid codes', async () => {
      // This test ensures we don't leak information via timing
      const validCode = await createAuthCode({
        githubToken: 'github_token_123',
        me: 'https://example.com/',
        clientId: 'https://client.example.com/',
        redirectUri: 'https://client.example.com/callback'
      });

      // Measure time for valid code
      const start1 = Date.now();
      const event1 = createRequestEvent({
        grant_type: 'authorization_code',
        code: validCode,
        client_id: 'https://client.example.com/',
        redirect_uri: 'https://client.example.com/callback'
      });
      await POST(event1);
      const time1 = Date.now() - start1;

      // Measure time for invalid code
      const start2 = Date.now();
      const event2 = createRequestEvent({
        grant_type: 'authorization_code',
        code: 'invalid_code_xxx',
        client_id: 'https://client.example.com/',
        redirect_uri: 'https://client.example.com/callback'
      });
      try {
        await POST(event2);
      } catch {
        // Expected to fail
      }
      const time2 = Date.now() - start2;

      // Timing should be relatively similar (within 100ms)
      // This is a loose check - in production use constant-time comparison
      expect(Math.abs(time1 - time2)).toBeLessThan(100);
    });
  });
});
