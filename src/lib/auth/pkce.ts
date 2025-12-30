/**
 * PKCE (Proof Key for Code Exchange) utilities for OAuth 2.0
 * Implements code verifier and challenge generation using Web Crypto API
 */

const VERIFIER_STORAGE_KEY = 'pkce_code_verifier';

/**
 * Generates a cryptographically random code verifier
 * Returns a URL-safe base64 encoded string (43-128 characters)
 */
export function generateCodeVerifier(): string {
  // Generate 32 random bytes (256 bits)
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);

  // Convert to base64url encoding (URL-safe, no padding)
  return base64UrlEncode(randomBytes);
}

/**
 * Creates a SHA-256 code challenge from a code verifier
 * Returns a base64url encoded hash
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  // Convert verifier string to bytes
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);

  // Generate SHA-256 hash
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  // Convert to base64url encoding
  return base64UrlEncode(new Uint8Array(hashBuffer));
}

/**
 * Stores the code verifier in sessionStorage
 * Verifier is needed later to exchange the authorization code for tokens
 */
export function storeVerifier(verifier: string): void {
  if (typeof sessionStorage === 'undefined') {
    throw new Error('sessionStorage is not available');
  }
  sessionStorage.setItem(VERIFIER_STORAGE_KEY, verifier);
}

/**
 * Retrieves the stored code verifier from sessionStorage
 * Returns null if not found
 */
export function retrieveVerifier(): string | null {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }
  return sessionStorage.getItem(VERIFIER_STORAGE_KEY);
}

/**
 * Clears the code verifier from sessionStorage
 * Should be called after successful token exchange
 */
export function clearVerifier(): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  sessionStorage.removeItem(VERIFIER_STORAGE_KEY);
}

/**
 * Encodes a byte array to base64url format
 * Base64url is URL-safe (uses - and _ instead of + and /)
 * and has no padding (no = characters)
 */
function base64UrlEncode(buffer: Uint8Array): string {
  // Convert buffer to base64
  const base64 = btoa(String.fromCharCode(...buffer));

  // Make it URL-safe and remove padding
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
