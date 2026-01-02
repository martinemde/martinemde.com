import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from './+server';
import { createAuthCode } from '$lib/server/auth';
import { getAccessToken } from '$lib/server/token-store';
import type { RequestEvent } from '@sveltejs/kit';

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
  body: any,
  contentType: string = 'application/json'
): RequestEvent {
  const url = new URL('https://example.com/auth/indieauth/token');

  let requestBody: BodyInit;
  let headers: Record<string, string> = {
    'Content-Type': contentType
  };

  if (contentType.includes('application/json')) {
    requestBody = JSON.stringify(body);
  } else {
    const formData = new FormData();
    for (const [key, value] of Object.entries(body)) {
      formData.append(key, value as string);
    }
    requestBody = formData;
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
    cookies: {} as any,
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

      await expect(POST(event)).rejects.toThrow('Content-Type must be');
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

      await expect(POST(event)).rejects.toThrow('Missing required parameters');
    });

    it('should reject requests missing code', async () => {
      const event = createRequestEvent({
        grant_type: 'authorization_code',
        client_id: 'https://client.example.com/',
        redirect_uri: 'https://client.example.com/callback'
      });

      await expect(POST(event)).rejects.toThrow('Missing required parameters');
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

      await expect(POST(event)).rejects.toThrow('Missing required parameters');
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

      await expect(POST(event)).rejects.toThrow('Missing required parameters');
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

      await expect(POST(event)).rejects.toThrow('grant_type must be authorization_code');
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

      await expect(POST(event)).rejects.toThrow('Invalid or expired authorization code');
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

      await expect(POST(event)).rejects.toThrow('client_id does not match');
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

      await expect(POST(event)).rejects.toThrow('redirect_uri does not match');
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

      await expect(POST(event)).rejects.toThrow('code_verifier is required');
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

      await expect(POST(event)).rejects.toThrow('Invalid code_verifier');
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
});
