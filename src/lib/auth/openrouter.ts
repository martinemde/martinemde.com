/**
 * OpenRouter OAuth integration
 * Handles OAuth PKCE flow and API key exchange
 */

import {
  generateCodeVerifier,
  generateCodeChallenge,
  storeVerifier,
  retrieveVerifier,
  clearVerifier
} from './pkce';
import type { UserInfo } from './state.svelte';

const OPENROUTER_AUTH_URL = 'https://openrouter.ai/auth';
const OPENROUTER_KEY_EXCHANGE_URL = 'https://openrouter.ai/api/v1/auth/keys';

interface KeyExchangeResponse {
  key: string;
  user?: {
    name: string;
    email: string;
  };
}

/**
 * Initiates the OAuth PKCE login flow
 * Generates PKCE credentials and redirects to OpenRouter auth page
 */
export async function initiateOAuthLogin(): Promise<void> {
  // Generate PKCE verifier and challenge
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);

  // Store verifier for later use in callback
  storeVerifier(verifier);

  // Build callback URL for OpenRouter OAuth
  const callbackUrl = `${window.location.origin}/auth/openrouter/callback`;

  // Build OpenRouter auth URL with PKCE parameters
  const authUrl = new URL(OPENROUTER_AUTH_URL);
  authUrl.searchParams.set('callback_url', callbackUrl);
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  // Redirect to OpenRouter auth page
  window.location.href = authUrl.toString();
}

/**
 * Exchanges an authorization code for an API key
 * Called in the OAuth callback route after user authorizes
 *
 * @param code - Authorization code from OpenRouter
 * @returns API key and optional user info
 * @throws Error if exchange fails or verifier is missing
 */
export async function exchangeCodeForKey(code: string): Promise<{
  apiKey: string;
  user?: UserInfo;
}> {
  // Retrieve the stored verifier
  const verifier = retrieveVerifier();
  if (!verifier) {
    throw new Error('No code verifier found. Please try logging in again.');
  }

  // Exchange code for API key
  const response = await fetch(OPENROUTER_KEY_EXCHANGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      code,
      code_verifier: verifier,
      code_challenge_method: 'S256'
    })
  });

  if (!response.ok) {
    // Clear verifier on failure
    clearVerifier();

    let errorMessage = `Key exchange failed: ${response.status} ${response.statusText}`;

    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // Use default error message if JSON parsing fails
    }

    throw new Error(errorMessage);
  }

  const data: KeyExchangeResponse = await response.json();

  // Clear verifier after successful exchange
  clearVerifier();

  return {
    apiKey: data.key,
    user: data.user
  };
}
