import adapter from '@sveltejs/adapter-cloudflare';
import svelteOptions from './svelte-options.js';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugins: [tailwindcss(), sveltekit({ ...svelteOptions, adapter: adapter({}) })] as any,
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest-setup.ts']
  },
  resolve: {
    // Always use browser conditions to properly resolve Svelte 5 client-side entry points
    conditions: ['browser']
  }
});
