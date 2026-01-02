/**
 * Token Storage
 *
 * Maps IndieAuth access tokens to GitHub tokens.
 * Uses in-memory storage (tokens are lost on server restart).
 */

interface StoredToken {
  githubToken: string;
  me: string;
  scope: string;
  issuedAt: number;
  expiresAt: number;
}

// In-memory token storage
const tokenStore = new Map<string, StoredToken>();

/**
 * Generate a cryptographically random token ID
 */
function generateTokenId(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Store a new access token
 */
export function storeAccessToken(githubToken: string, me: string, scope: string): string {
  const tokenId = generateTokenId();
  const now = Date.now();
  const ttl = 60 * 60 * 24 * 30 * 1000; // 30 days in milliseconds

  tokenStore.set(tokenId, {
    githubToken,
    me,
    scope,
    issuedAt: now,
    expiresAt: now + ttl
  });

  return tokenId;
}

/**
 * Retrieve and validate an access token
 * Returns the GitHub token if valid, null otherwise
 */
export function getAccessToken(tokenId: string): {
  githubToken: string;
  me: string;
  scope: string;
} | null {
  const token = tokenStore.get(tokenId);

  if (!token) {
    return null;
  }

  // Check if expired
  if (Date.now() > token.expiresAt) {
    tokenStore.delete(tokenId);
    return null;
  }

  return {
    githubToken: token.githubToken,
    me: token.me,
    scope: token.scope
  };
}

/**
 * Revoke an access token
 */
export function revokeAccessToken(tokenId: string): boolean {
  return tokenStore.delete(tokenId);
}

/**
 * Clean up expired tokens (run periodically)
 */
export function cleanupExpiredTokens(): number {
  const now = Date.now();
  let cleaned = 0;

  for (const [tokenId, token] of tokenStore.entries()) {
    if (now > token.expiresAt) {
      tokenStore.delete(tokenId);
      cleaned++;
    }
  }

  return cleaned;
}

// Run cleanup every hour
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredTokens, 60 * 60 * 1000);
}
