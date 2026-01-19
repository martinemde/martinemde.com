import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import type { PluginOption } from 'vite';

export default defineConfig({
  // Type assertion needed due to Vite version mismatch between vitest and main dependencies
  plugins: [tailwindcss(), sveltekit()] as PluginOption[],
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
