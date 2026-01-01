import { sealData, unsealData } from 'iron-session';
import {
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  SESSION_SECRET
} from '$env/dynamic/private';
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
}

/**
 * Get session options lazily to avoid accessing env vars during prerendering
 */
function getSessionOptions() {
  return {
    password: SESSION_SECRET!,
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
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
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
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'repo',
    state
  });

  return `https://github.com/login/oauth/authorize?${params}`;
}
