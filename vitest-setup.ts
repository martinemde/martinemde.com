// Vitest setup file for test configuration
import { vi } from 'vitest';

// Mock SvelteKit environment modules globally
// These virtual modules are provided by SvelteKit but need to be mocked in tests

// Private environment variables (server-side only)
vi.mock('$env/dynamic/private', () => ({
  env: {}
}));

// Public environment variables (available to client)
vi.mock('$env/dynamic/public', () => ({
  env: {
    PUBLIC_APP_URL: 'https://example.com'
  }
}));

// Static environment variables (build-time)
vi.mock('$env/static/private', () => ({}));

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
