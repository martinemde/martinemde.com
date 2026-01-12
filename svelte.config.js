import { mdsvex } from 'mdsvex';
import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { createHighlighter } from 'shiki';

// Create a highlighter instance for mdsvex
const highlighter = await createHighlighter({
  themes: ['catppuccin-latte', 'catppuccin-macchiato'],
  langs: ['ruby', 'javascript', 'typescript', 'html', 'css', 'bash', 'json']
});

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://svelte.dev/docs/kit/integrations
  // for more information about preprocessors
  preprocess: [
    vitePreprocess(),
    mdsvex({
      extensions: ['.md', '.svx'],
      smartypants: true,
      highlight: {
        highlighter: async (code, lang = 'text') => {
          const html = highlighter.codeToHtml(code, {
            lang,
            themes: {
              light: 'catppuccin-latte',
              dark: 'catppuccin-macchiato'
            },
            defaultColor: false
          });
          // Escape backticks and backslashes for Svelte template
          const escaped = html.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
          return `{@html \`${escaped}\` }`;
        }
      }
    })
  ],
  kit: {
    // adapter-cloudflare for Cloudflare Workers deployment
    adapter: adapter({}),
    // CSRF protection is handled via custom implementation in hooks.server.ts
    // This allows us to allowlist specific routes like /auth/indieauth/token
    csrf: {
      trustedOrigins: ['*']
    }
  },
  extensions: ['.svelte', '.md', '.svx']
};

export default config;
