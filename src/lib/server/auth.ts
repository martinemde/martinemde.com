import { sealData, unsealData } from 'iron-session';
import { env } from '$env/dynamic/private';
import type { RequestEvent } from '@sveltejs/kit';

export interface SessionData {
  user?: {
    id: number;
    login: string;
    name: string | null;
    avatar_url: string;
  };
  githubToken?: string;
  oauthState?: string;
  indieAuthRequest?: {
    me: string;
    clientId: string;
    redirectUri: string;
    state: string;
    codeChallenge?: string;
    codeChallengeMethod?: string;
  };
}

export interface AuthCode {
  githubToken: string;
  me: string;
  clientId: string;
  redirectUri: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  issuedAt: number;
}

/**
 * Get session options lazily to avoid accessing env vars during prerendering
 */
function getSessionOptions() {
  const secret = env.SESSION_SECRET;

  if (!secret) {
    throw new Error('SESSION_SECRET environment variable is not set');
  }

  if (secret.length < 32) {
    throw new Error(
      `SESSION_SECRET is too short (${secret.length} characters). Minimum 32 characters required for iron-session encryption.`
    );
  }

  return {
    password: secret,
    ttl: 60 * 60 * 24 * 7 // 7 days
  };
}

const COOKIE_NAME = 'micropub_session';

/**
 * Get session data from request cookies
 */
export async function getSession(event: RequestEvent): Promise<SessionData> {
  const sessionCookie = event.cookies.get(COOKIE_NAME);

  if (!sessionCookie) {
    return {};
  }

  try {
    const session = await unsealData<SessionData>(sessionCookie, getSessionOptions());
    return session;
  } catch (error) {
    console.error('Failed to unseal session:', error);
    return {};
  }
}

/**
 * Set session data in response cookies
 */
export async function setSession(event: RequestEvent, data: SessionData): Promise<void> {
  const sealed = await sealData(data, getSessionOptions());

  event.cookies.set(COOKIE_NAME, sealed, {
    path: '/',
    httpOnly: true,
    secure: event.url.protocol === 'https:',
    sameSite: 'lax',
    maxAge: getSessionOptions().ttl
  });
}

/**
 * Clear session cookie
 */
export function clearSession(event: RequestEvent): void {
  event.cookies.delete(COOKIE_NAME, { path: '/' });
}

/**
 * Exchange OAuth code for access token
 */
export async function exchangeCodeForToken(code: string): Promise<string> {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code
    })
  });

  if (!response.ok) {
    throw new Error('Failed to exchange code for token');
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error_description || data.error);
  }

  return data.access_token;
}

/**
 * Generate random state for OAuth CSRF protection
 */
export function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Build GitHub OAuth authorization URL
 */
export function getAuthorizationUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'repo',
    state
  });

  return `https://github.com/login/oauth/authorize?${params}`;
}

/**
 * Create an IndieAuth authorization code (sealed)
 */
export async function createAuthCode(data: Omit<AuthCode, 'issuedAt'>): Promise<string> {
  const authCode: AuthCode = {
    ...data,
    issuedAt: Date.now()
  };

  return await sealData(authCode, {
    password: env.SESSION_SECRET!,
    ttl: 600 // 10 minutes
  });
}

// Store for used authorization codes (prevents replay attacks)
const usedAuthCodes = new Set<string>();

/**
 * Verify and decode an IndieAuth authorization code
 * Ensures codes can only be used once
 */
export async function verifyAuthCode(code: string): Promise<AuthCode | null> {
  // Check if code has already been used
  if (usedAuthCodes.has(code)) {
    return null;
  }

  try {
    const data = await unsealData<AuthCode>(code, {
      password: env.SESSION_SECRET!,
      ttl: 600
    });

    // Check if code is expired (10 minutes)
    if (Date.now() - data.issuedAt > 600000) {
      return null;
    }

    // Mark code as used
    usedAuthCodes.add(code);

    // Clean up old codes after 15 minutes (longer than TTL to prevent race conditions)
    setTimeout(() => {
      usedAuthCodes.delete(code);
    }, 900000);

    return data;
  } catch {
    return null;
  }
}

/**
 * Verify PKCE code challenge
 */
export async function verifyCodeChallenge(
  verifier: string,
  challenge: string,
  method: string = 'S256'
): Promise<boolean> {
  if (method === 'plain') {
    return verifier === challenge;
  }

  if (method === 'S256') {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    return base64 === challenge;
  }

  return false;
}
