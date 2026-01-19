import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  storeAccessToken,
  getAccessToken,
  revokeAccessToken,
  cleanupExpiredTokens,
  clearAllTokens
} from './token-store';

describe('Token Store', () => {
  beforeEach(() => {
    // Clear all tokens before each test for proper isolation
    clearAllTokens();
  });

  describe('storeAccessToken', () => {
    it('should store a token and return a token ID', () => {
      const tokenId = storeAccessToken('github_token_123', 'https://example.com/', 'create');

      expect(tokenId).toBeTruthy();
      expect(typeof tokenId).toBe('string');
      expect(tokenId.length).toBeGreaterThan(0);
    });

    it('should generate unique token IDs', () => {
      const token1 = storeAccessToken('github_token_123', 'https://example.com/', 'create');
      const token2 = storeAccessToken('github_token_456', 'https://example.com/', 'create');

      expect(token1).not.toBe(token2);
    });
  });

  describe('getAccessToken', () => {
    it('should retrieve a stored token', () => {
      const tokenId = storeAccessToken('github_token_123', 'https://example.com/', 'create update');

      const result = getAccessToken(tokenId);

      expect(result).toEqual({
        githubToken: 'github_token_123',
        me: 'https://example.com/',
        scope: 'create update'
      });
    });

    it('should return null for non-existent token', () => {
      const result = getAccessToken('nonexistent_token');

      expect(result).toBeNull();
    });

    it('should return null for expired token', () => {
      // Mock Date.now to create an expired token
      const startTime = Date.now();

      // Store token
      const tokenId = storeAccessToken('github_token_123', 'https://example.com/', 'create');

      // Fast forward time by 31 days
      vi.spyOn(Date, 'now').mockImplementation(() => startTime + 31 * 24 * 60 * 60 * 1000);

      const result = getAccessToken(tokenId);

      expect(result).toBeNull();

      // Restore Date.now
      vi.spyOn(Date, 'now').mockRestore();
    });
  });

  describe('revokeAccessToken', () => {
    it('should revoke a stored token', () => {
      const tokenId = storeAccessToken('github_token_123', 'https://example.com/', 'create');

      const revoked = revokeAccessToken(tokenId);

      expect(revoked).toBe(true);
      expect(getAccessToken(tokenId)).toBeNull();
    });

    it('should return false for non-existent token', () => {
      const revoked = revokeAccessToken('nonexistent_token');

      expect(revoked).toBe(false);
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should remove expired tokens', () => {
      const startTime = Date.now();

      // Store two tokens
      const token1 = storeAccessToken('github_token_1', 'https://example.com/', 'create');
      const token2 = storeAccessToken('github_token_2', 'https://example.com/', 'create');

      // Fast forward time by 31 days (past expiry)
      vi.spyOn(Date, 'now').mockImplementation(() => startTime + 31 * 24 * 60 * 60 * 1000);

      const cleaned = cleanupExpiredTokens();

      expect(cleaned).toBe(2);
      expect(getAccessToken(token1)).toBeNull();
      expect(getAccessToken(token2)).toBeNull();

      // Restore Date.now
      vi.spyOn(Date, 'now').mockRestore();
    });

    it('should not remove valid tokens', () => {
      const tokenId = storeAccessToken('github_token_123', 'https://example.com/', 'create');

      const cleaned = cleanupExpiredTokens();

      expect(cleaned).toBe(0);
      expect(getAccessToken(tokenId)).not.toBeNull();
    });
  });
});
