// Vitest setup file for test configuration
import { vi } from 'vitest';

// Mock SvelteKit environment modules globally. Generated dev modules rely on
// the running dev server's globals, which are not available in jsdom tests.
vi.mock('$app/env/public', () => ({
  PUBLIC_APP_URL: 'https://example.com'
}));

vi.mock('$app/env', () => ({
  dev: true,
  browser: false,
  building: false,
  version: 'test'
}));
