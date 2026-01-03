import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(() => ({
  plugins: [tailwindcss(), sveltekit()],
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
}));
