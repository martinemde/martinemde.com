// Vitest setup file for test configuration
import { vi } from 'vitest';

// Mock SvelteKit environment modules globally
// These virtual modules are provided by SvelteKit but need to be mocked in tests

// Private environment variables (server-side only)
vi.mock('$env/dynamic/private', () => ({
  env: {
    GITHUB_CLIENT_ID: 'test_client_id',
    GITHUB_CLIENT_SECRET: 'test_client_secret',
    GITHUB_OWNER: 'test_owner',
    GITHUB_REPO: 'test_repo',
    SESSION_SECRET: 'test_session_secret_key_for_testing_only_32_chars',
    MICROPUB_BACKEND: 'test'
  }
}));

// Public environment variables (available to client)
vi.mock('$env/dynamic/public', () => ({
  env: {
    PUBLIC_APP_URL: 'https://example.com'
  }
}));

// Static environment variables (build-time)
vi.mock('$env/static/private', () => ({
  GITHUB_CLIENT_ID: 'test_client_id',
  GITHUB_CLIENT_SECRET: 'test_client_secret',
  GITHUB_OWNER: 'test_owner',
  GITHUB_REPO: 'test_repo',
  SESSION_SECRET: 'test_session_secret_key_for_testing_only_32_chars',
  MICROPUB_BACKEND: 'test'
}));

vi.mock('$env/static/public', () => ({
  PUBLIC_APP_URL: 'https://example.com'
}));

// Mock SvelteKit app environment
vi.mock('$app/environment', () => ({
  dev: true,
  browser: false,
  building: false,
  version: 'test'
}));
