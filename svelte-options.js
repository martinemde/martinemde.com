import { readFileSync } from 'node:fs';
import { mdsvex } from 'mdsvex';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { createHighlighter } from 'shiki';

// Create a highlighter instance for mdsvex
const highlighter = await createHighlighter({
  themes: ['catppuccin-latte', 'catppuccin-macchiato'],
  langs: ['ruby', 'javascript', 'typescript', 'html', 'css', 'bash', 'json', 'md']
});

/*
 * Catppuccin Latte is a low-contrast palette: most of its accents land between
 * 2.3:1 and 3.5:1 on its own #eff1f5 background, so highlighted code was the
 * least legible text on the site in light mode. Each colour below is re-solved
 * in OKLCH for >= 4.5:1 (WCAG 1.4.3) against that background with its hue and
 * chroma held fixed, so the palette still reads as Latte, just darker. The four
 * greys are given slightly different targets (4.5 / 4.7 / 5.0 / 5.2) so the
 * comment-vs-punctuation ramp survives being pushed up against the floor.
 *
 * Macchiato only needed its two dimmest greys lifted; the rest already passed.
 */
const colorReplacements = {
  'catppuccin-latte': {
    '#dc8a78': '#a55948', // rosewater
    '#dd7878': '#b05052', // flamingo
    '#ea76cb': '#b24297', // pink
    '#e64553': '#cf2d41', // maroon
    '#fe640b': '#ce3400', // peach
    '#df8e1d': '#a75a00', // yellow
    '#40a02b': '#188000', // green
    '#179299': '#007a82', // teal
    '#04a5e5': '#0073b1', // sky
    '#209fb5': '#00798e', // sapphire
    '#1e66f5': '#1b63f2', // blue
    '#7287fd': '#5363d6', // lavender
    '#6c6f85': '#616379', // subtext0
    '#7c7f93': '#64667a', // overlay2
    '#8c8fa1': '#686a7c', // overlay1
    '#9ca0b0': '#6a6d7c' // overlay0
  },
  'catppuccin-macchiato': {
    '#8087a2': '#868ea9', // overlay1
    '#6e738d': '#888da8' // overlay0
  }
};

/**
 * Images in post bodies load lazily: article previews on the stream sit in
 * closed <details>, which doesn't stop an eager image from downloading. Local
 * uploads also swap to the WebP copies from scripts/optimize-images.ts, with
 * their dimensions so the page doesn't shift as they arrive.
 *
 * @type {import('svelte/compiler').PreprocessorGroup}
 */
const postImages = {
  name: 'post-images',
  markup({ content, filename }) {
    if (!/\.(md|svx)$/.test(filename ?? '')) return;
    /** @type {Record<string, import('./src/lib/utils/images.ts').OptimizedImage>} */
    let optimized = {};
    try {
      optimized = JSON.parse(readFileSync('src/lib/generated/optimized-images.json', 'utf8'));
    } catch {
      // Not generated (e.g. under Vitest): keep the originals.
    }
    const code = content.replace(/<img\b[^>]*>/g, (tag) => {
      let attributes = '';
      if (!/\sloading=/.test(tag)) attributes += ' loading="lazy" decoding="async"';
      const src = tag.match(/\ssrc="([^"]+)"/)?.[1];
      const image = src && optimized[src.replace(/^https:\/\/martinemde\.com(?=\/)/, '')];
      if (image) {
        tag = tag.replace(`src="${src}"`, `src="${image.src}"`);
        attributes += ` srcset="${image.srcset}" sizes="${image.sizes}"`;
        if (!/\s(width|height)=/.test(tag))
          attributes += ` width="${image.width}" height="${image.height}"`;
      }
      return tag.replace(/^<img/, `<img${attributes}`);
    });
    return { code };
  }
};

/** @type {import('@sveltejs/vite-plugin-svelte').Options} */
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
            lang: lang ?? 'text',
            themes: {
              light: 'catppuccin-latte',
              dark: 'catppuccin-macchiato'
            },
            colorReplacements,
            defaultColor: false
          });
          // Escape backticks and backslashes for Svelte template
          const escaped = html.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
          return `{@html \`${escaped}\` }`;
        }
      }
    }),
    postImages
  ],
  extensions: ['.svelte', '.md', '.svx']
};

export default config;
