# Comp-matched Theme Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin the shared chrome and content pages (home, blog index, blog post, projects, about) to match the provided comps using the Teal & Violet palette, keeping MonoLisa with comp sizing and system-driven light/dark.

**Architecture:** Introduce a bespoke CSS custom-property token layer (`src/theme.css`) resolved with `light-dark()` off the existing `color-scheme: light dark` — no `.dark` class, no theme JS. Rebuild the layout chrome and each content page's markup/scoped styles against these tokens. Skeleton/espresso stays installed and untouched for the standalone tool routes.

**Tech Stack:** SvelteKit 2 + Svelte 5 runes, Tailwind CSS 4, MDsveX, Shiki, `@tailwindcss/typography`, Vitest, Bun.

## Global Constraints

- Package manager is **Bun**. Run scripts with `bun run <script>`. Never introduce npm/yarn lockfiles.
- Dark/light is **system-only** via `prefers-color-scheme` / `light-dark()`. No manual toggle, no persistence, no theme JS.
- Accent variation is **Teal & Violet** only. Token values are copied verbatim in Task 1 — do not alter them.
- Keep the existing **MonoLisa** fonts (`MonoLisaText` = `var(--font-body)`, `MonoLisaCode` = `var(--font-mono)`). Adopt the comp's sizing; do not swap font families.
- **Use real content only. Invent no data.** Do not mention "RubyGems" in any newly drafted hero/chip/eyebrow copy. (The existing `projects.ts` "RubyGems & Bundler" entry is pre-existing real data and stays on the Projects page.)
- Blog-post tags render **only if present** in a post's metadata. No post currently defines tags.
- Scope: shared chrome + the five content pages. Do not restyle standalone tool routes.
- Every task ends green on `bun run check` and `bun run lint`. Commit with `jj commit -m "..."` (this repo uses jujutsu; there is no `git add`/staging step).

---

## File Structure

- Create `src/theme.css` — token layer, global background/selection, keyframes, theme-label swap helpers, prose + code retune, shared chip/section utility classes.
- Modify `src/app.css` — import `./theme.css`; the existing `.shiki` rule gets a token border.
- Modify `src/lib/utils/posts.ts` — add `formatPostDateShort()` and an optional `tags?: string[]` passthrough on `PostMetadata`.
- Create `src/lib/utils/posts.test.ts` — unit test for `formatPostDateShort()`.
- Modify `src/routes/+layout.svelte` — sticky header + status-line footer against tokens.
- Modify `src/routes/+page.ts` — load 3 recent posts.
- Modify `src/routes/+page.svelte` — home layout.
- Modify `src/routes/blog/+page.svelte` — blog index layout.
- Modify `src/routes/blog/[slug]/+page.svelte` — blog post layout.
- Modify `src/lib/components/ShareButtons.svelte` — restyle to tokens.
- Modify `src/routes/projects/+page.svelte` — projects list layout (keep lucide icons).
- Modify `src/routes/about/+page.svelte` — about layout.

Note on verification: this is a visual redesign. Except for the pure `formatPostDateShort` helper (real unit test in Task 2), each task is verified by `bun run check`, `bun run lint`, and visual inspection via `bun run dev` in both system color schemes and at mobile width. Existing tests must keep passing.

---

### Task 1: Design-token layer + global styles + prose/code retune

**Files:**

- Create: `src/theme.css`
- Modify: `src/app.css` (add import; add border to `.shiki`)

**Interfaces:**

- Produces: global CSS custom properties `--bg --surface --code --border --text --muted --faint --accent --accent2`; keyframes `mePulse`, `meBlink`; helper classes `.theme-when-light` / `.theme-when-dark`; retuned `.prose`. All later tasks consume these.

- [ ] **Step 1: Create `src/theme.css`**

```css
/*
 * Comp-matched design tokens (Teal & Violet), system-driven light/dark.
 * Resolves via light-dark() off `color-scheme: light dark` (set in app.css).
 * No .dark class and no JS — theme follows the OS setting only.
 */
:root {
  --bg: light-dark(oklch(0.976 0.008 85), oklch(0.185 0.012 70));
  --surface: light-dark(oklch(0.945 0.011 85), oklch(0.235 0.014 70));
  --code: light-dark(oklch(0.928 0.013 85), oklch(0.262 0.015 70));
  --border: light-dark(oklch(0.875 0.013 80), oklch(0.33 0.012 70));
  --text: light-dark(oklch(0.27 0.013 75), oklch(0.925 0.01 80));
  --muted: light-dark(oklch(0.475 0.015 75), oklch(0.7 0.014 75));
  --faint: light-dark(oklch(0.65 0.013 75), oklch(0.52 0.012 70));
  --accent: light-dark(oklch(0.545 0.1 200), oklch(0.81 0.11 195));
  --accent2: light-dark(oklch(0.52 0.14 305), oklch(0.77 0.11 305));
}

body {
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
}

::selection {
  background: color-mix(in oklch, var(--accent) 30%, transparent);
}

@keyframes mePulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}
@keyframes meBlink {
  0%,
  49% {
    opacity: 1;
  }
  50%,
  100% {
    opacity: 0;
  }
}

/* No-JS theme label swap: show the label matching the OS scheme. */
.theme-when-light {
  display: none;
}
.theme-when-dark {
  display: inline;
}
@media (prefers-color-scheme: light) {
  .theme-when-light {
    display: inline;
  }
  .theme-when-dark {
    display: none;
  }
}

/* Shared eyebrow / section / chip utilities used across content pages. */
.eyebrow {
  font-family: var(--font-mono);
  font-weight: 480;
  font-size: 0.78rem;
  letter-spacing: 0.05em;
  color: var(--accent);
}

/* Blog-post prose retuned to tokens (replaces dark:prose-invert). */
.prose {
  --tw-prose-body: var(--text);
  --tw-prose-headings: var(--text);
  --tw-prose-links: var(--accent);
  --tw-prose-bold: var(--text);
  --tw-prose-quotes: var(--text);
  --tw-prose-quote-borders: var(--accent);
  --tw-prose-code: var(--accent);
  --tw-prose-hr: var(--border);
  --tw-prose-bullets: var(--faint);
  --tw-prose-counters: var(--faint);
  --tw-prose-captions: var(--muted);
  --tw-prose-pre-bg: var(--code);
  --tw-prose-pre-code: var(--text);
  --tw-prose-th-borders: var(--border);
  --tw-prose-td-borders: var(--border);
  color: var(--text);
}
.prose a {
  color: var(--accent);
  text-decoration: none;
  border-bottom: 1px solid color-mix(in oklch, var(--accent) 40%, transparent);
}
.prose a:hover {
  border-bottom-color: var(--accent);
}
.prose :not(pre) > code {
  font-family: var(--font-mono);
  background: var(--code);
  color: var(--accent);
  border: 1px solid var(--border);
  border-radius: 5px;
  padding: 1px 6px;
  font-size: 0.86em;
  font-weight: 450;
}
/* Remove typography's backtick pseudo-quotes around inline code. */
.prose :not(pre) > code::before,
.prose :not(pre) > code::after {
  content: none;
}
.prose blockquote {
  font-style: normal;
  font-weight: inherit;
  border-left: 3px solid var(--accent);
  background: color-mix(in oklch, var(--accent) 8%, var(--surface));
  border-radius: 0 10px 10px 0;
  padding: 1.25rem 1.5rem;
  margin: 1.75rem 0;
}
.prose blockquote p:first-of-type::before,
.prose blockquote p:last-of-type::after {
  content: none;
}
.prose h2,
.prose h3,
.prose h4 {
  font-family: var(--font-body);
  letter-spacing: -0.01em;
}
```

- [ ] **Step 2: Import the token layer from `src/app.css`**

Add the import directly after the espresso import (line 5) so tokens/keyframes are available globally:

```css
@import './espresso.css'; /* Custom Themes */
@import './theme.css'; /* Comp-matched design tokens (Teal & Violet) */
@import './fonts.css'; /* MonoLisa webfonts (@font-face) */
```

- [ ] **Step 3: Give Shiki code blocks a token border in `src/app.css`**

Change the existing `.shiki` block (currently starting at line 39) to add a border:

```css
/* Style code blocks */
.shiki {
  padding: 1rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  overflow-x: auto;
  margin: 1.5rem 0;
}
```

- [ ] **Step 4: Verify types and lint**

Run: `bun run check && bun run lint`
Expected: both pass (0 errors).

- [ ] **Step 5: Visual smoke check**

Run: `bun run dev` and open `/` and a blog post (e.g. `/blog/claude-code-commands-deprecated`). Confirm the warm background, token text colors, and retuned inline code / blockquote render in both light and dark OS settings. Stop the dev server.

- [ ] **Step 6: Commit**

```bash
jj commit -m "Add Teal & Violet design token layer

Introduce a system-driven light-dark() token layer and retune prose and
Shiki code blocks to it, backing the comp-matched redesign."
```

---

### Task 2: Posts utilities — short date formatter + optional tags

**Files:**

- Modify: `src/lib/utils/posts.ts` (add `tags` to `PostMetadata`, pass through in `normalizeMetadata`, add `formatPostDateShort`)
- Test: `src/lib/utils/posts.test.ts`

**Interfaces:**

- Produces:
  - `formatPostDateShort(date: Date): string` → e.g. `"Jan 22, 2026"`.
  - `PostMetadata.tags?: string[]` — present only when a post's frontmatter defines a `tags` array of strings.

- [ ] **Step 1: Write the failing test**

Create `src/lib/utils/posts.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatPostDateShort } from './posts';

describe('formatPostDateShort', () => {
  it('formats a date as short month, day, year', () => {
    // Noon local time to match how post dates are normalized.
    const date = new Date(2026, 0, 22, 12, 0, 0);
    expect(formatPostDateShort(date)).toBe('Jan 22, 2026');
  });

  it('formats a two-digit day without leading zero', () => {
    const date = new Date(2025, 10, 30, 12, 0, 0);
    expect(formatPostDateShort(date)).toBe('Nov 30, 2025');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test -- src/lib/utils/posts.test.ts`
Expected: FAIL — `formatPostDateShort` is not exported.

- [ ] **Step 3: Add the `tags` field to `PostMetadata`**

In `src/lib/utils/posts.ts`, extend the interface (after the `image` line):

```ts
export interface PostMetadata {
  title: string;
  date: Date; // Normalized to Date object at load time
  author?: string;
  description?: string;
  published?: boolean;
  slug: string;
  image?: string; // Optional header image URL
  tags?: string[]; // Optional list of tags; rendered only when present
}
```

- [ ] **Step 4: Pass tags through `normalizeMetadata`**

In the returned object inside `normalizeMetadata`, add a `tags` line after `image`:

```ts
    image: typeof meta.image === 'string' ? meta.image : undefined,
    tags: Array.isArray(meta.tags)
      ? meta.tags.filter((t): t is string => typeof t === 'string')
      : undefined
```

- [ ] **Step 5: Add `formatPostDateShort`**

Add after the existing `formatPostDate` function:

```ts
/**
 * Format a post date compactly, e.g. "Jan 22, 2026" (for list/meta rows).
 */
export function formatPostDateShort(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `bun run test -- src/lib/utils/posts.test.ts`
Expected: PASS (both cases).

- [ ] **Step 7: Verify types and lint**

Run: `bun run check && bun run lint`
Expected: both pass.

- [ ] **Step 8: Commit**

```bash
jj commit -m "Add short date formatter and optional post tags

Add formatPostDateShort for compact meta rows and pass an optional tags
array through post metadata, rendered only when a post defines it."
```

---

### Task 3: Shared chrome — sticky header + status-line footer

**Files:**

- Modify: `src/routes/+layout.svelte` (replace the visual wrapper; keep the `<svelte:head>` block unchanged)

**Interfaces:**

- Consumes: tokens and `.theme-when-*` helpers from Task 1; `page` from `$app/state`; `resolve` from `$app/paths` (both already imported).

- [ ] **Step 1: Add derived nav/path state to the `<script>`**

In `src/routes/+layout.svelte`, after the existing `contentType` derived (around line 34), add:

```ts
// Active-section + status-line path for the redesigned chrome
const path = $derived(page.url.pathname);
const isBlog = $derived(path === '/blog' || path.startsWith('/blog/'));
const isProjects = $derived(path.startsWith('/projects'));
const isAbout = $derived(path.startsWith('/about'));
const pathDisplay = $derived('martinemde.com' + (path === '/' ? '' : path));
```

- [ ] **Step 2: Replace the markup wrapper**

Replace everything from `<div class="min-h-screen bg-surface-50-950 text-surface-950-50">` through the closing `</div>` at end of file (the current lines 73–101) with:

```svelte
<div class="site">
  <header class="site-header">
    <div class="bar">
      <a class="brand" href={resolve('/')}>
        <span class="brand-mark"></span>
        <span class="brand-name">Martin Emde</span>
      </a>
      <nav class="nav">
        <a class="nav-link" class:active={isBlog} href={resolve('/blog')}>
          <span class="slash">/</span>blog
        </a>
        <a class="nav-link" class:active={isProjects} href={resolve('/projects')}>
          <span class="slash">/</span>projects
        </a>
        <a class="nav-link" class:active={isAbout} href={resolve('/about')}>
          <span class="slash">/</span>about
        </a>
        <span class="theme-ind" aria-hidden="true">
          <span class="theme-blip"></span>
          <span class="theme-text"
            >theme:<span class="theme-when-dark">dark</span><span class="theme-when-light"
              >light</span
            ></span
          >
        </span>
      </nav>
    </div>
  </header>

  <main class="site-main">
    {@render children()}
  </main>

  <footer class="site-footer">
    <div class="statusline">
      <span class="sl-path"><span class="sl-pulse"></span>{pathDisplay}</span>
      <span class="sl-accent">Teal &amp; Violet</span>
      <span class="sl-spacer"></span>
      <span class="sl-dim">© 2025 Martin Emde</span>
      <span class="sl-dim"
        >theme:<span class="theme-when-dark">dark</span><span class="theme-when-light">light</span
        ></span
      >
      <span class="sl-ver">v2026.7<span class="sl-cursor">_</span></span>
    </div>
  </footer>
</div>

<style>
  .site {
    display: flex;
    min-height: 100vh;
    flex-direction: column;
  }

  /* Header */
  .site-header {
    position: sticky;
    top: 0;
    z-index: 20;
    border-bottom: 1px solid var(--border);
    background: color-mix(in oklch, var(--bg) 86%, transparent);
    backdrop-filter: saturate(1.2) blur(8px);
  }
  .bar {
    margin: 0 auto;
    display: flex;
    max-width: 1040px;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    padding: 16px 32px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 11px;
    color: var(--text);
  }
  .brand-mark {
    height: 11px;
    width: 11px;
    border-radius: 3px;
    background: var(--accent);
    box-shadow: 0 0 0 4px color-mix(in oklch, var(--accent) 16%, transparent);
  }
  .brand-name {
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 17px;
    letter-spacing: -0.01em;
  }
  .nav {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .nav-link {
    font-family: var(--font-mono);
    font-weight: 460;
    font-size: 13.5px;
    letter-spacing: 0.01em;
    padding: 7px 11px;
    color: var(--muted);
  }
  .nav-link .slash {
    opacity: 0.5;
  }
  .nav-link.active {
    color: var(--accent);
    font-weight: 560;
  }

  /* Theme indicator (non-interactive) */
  .theme-ind {
    margin-left: 14px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    padding: 7px 12px;
  }
  .theme-blip {
    height: 10px;
    width: 10px;
    border-radius: 3px;
    background: var(--text); /* opposite of the background */
  }
  .theme-text {
    font-family: var(--font-mono);
    font-weight: 480;
    font-size: 11.5px;
    letter-spacing: 0.02em;
    color: var(--muted);
  }

  /* Main */
  .site-main {
    margin: 0 auto;
    width: 100%;
    max-width: 1040px;
    flex: 1;
    padding: 0 32px;
  }

  /* Footer status line */
  .site-footer {
    border-top: 1px solid var(--border);
    background: var(--surface);
  }
  .statusline {
    margin: 0 auto;
    display: flex;
    max-width: 1040px;
    align-items: center;
    gap: 20px;
    padding: 11px 32px;
    font-family: var(--font-mono);
    font-weight: 460;
    font-size: 11.5px;
    color: var(--muted);
  }
  .sl-path {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .sl-pulse {
    height: 7px;
    width: 7px;
    border-radius: 50%;
    background: var(--accent);
    animation: mePulse 2.4s ease-in-out infinite;
  }
  .sl-accent,
  .sl-dim {
    color: var(--faint);
  }
  .sl-spacer {
    flex: 1;
  }
  .sl-ver {
    display: inline-flex;
    align-items: center;
  }
  .sl-cursor {
    margin-left: 1px;
    color: var(--accent);
    animation: meBlink 1.1s step-end infinite;
  }

  @media (max-width: 640px) {
    .bar,
    .site-main,
    .statusline {
      padding-left: 20px;
      padding-right: 20px;
    }
    .theme-text {
      display: none; /* collapse to just the blip on mobile */
    }
    .sl-accent {
      display: none;
    }
  }
</style>
```

- [ ] **Step 3: Verify types and lint**

Run: `bun run check && bun run lint`
Expected: both pass.

- [ ] **Step 4: Visual check**

Run: `bun run dev`. Confirm across `/`, `/blog`, `/projects`, `/about`: sticky blurred header, active nav item in teal, theme indicator showing `theme:dark`/`theme:light` matching the OS, footer status line with pulse dot + real path + blinking cursor. Narrow to mobile width: header label collapses to the opposite-color blip. Stop the server.

- [ ] **Step 5: Commit**

```bash
jj commit -m "Redesign shared header and footer chrome

Replace the layout chrome with a sticky blurred header, teal active nav,
a system-reflecting theme indicator, and a terminal status-line footer."
```

---

### Task 4: Home page

**Files:**

- Modify: `src/routes/+page.ts` (load 3 recent posts)
- Modify: `src/routes/+page.svelte`

**Interfaces:**

- Consumes: `getRecentPosts`, `formatPostDateShort`, `getReadingTime` from `$lib/utils/posts`; `projects` from `$lib/data/projects`; tokens + `.eyebrow` from Task 1.

- [ ] **Step 1: Load 3 recent posts in `src/routes/+page.ts`**

Change the `getRecentPosts(5)` call to `getRecentPosts(3)`:

```ts
export const load: PageLoad = async () => {
  // Load the 3 most recent blog posts for the homepage "Writing" section
  const recentPosts = await getRecentPosts(3);

  return {
    recentPosts
  };
};
```

- [ ] **Step 2: Replace `src/routes/+page.svelte`**

```svelte
<script lang="ts">
  import type { PageData } from './$types';
  import { formatPostDateShort, getReadingTime } from '$lib/utils/posts';
  import { projects } from '$lib/data/projects';
  import { resolve } from '$app/paths';

  let { data }: { data: PageData } = $props();

  const featured = projects.slice(0, 4);
  const linkLabel = (p: (typeof projects)[number]) => p.linktext ?? p.name;
</script>

<svelte:head>
  <title>Martin Emde</title>
  <meta name="description" content="Software Engineer, Enthusiast of Things" />
</svelte:head>

<section class="hero">
  <div class="eyebrow">// software engineer · enthusiast of things</div>
  <h1 class="hero-name">Martin Emde</h1>
  <p class="hero-lede">
    AI Developer Tools Engineer at
    <a href="https://gusto.com" rel="external">Gusto</a>. Founding member of
    <a href="https://gem.coop" rel="external">gem.coop</a>. See also:
    <a href="https://github.com/martinemde" rel="external">GitHub</a>.
  </p>
  <div class="chips">
    <span class="chip"><span class="dot dot-a"></span>Gusto</span>
    <span class="chip"><span class="dot dot-b"></span>gem.coop</span>
    <span class="chip"><span class="dot dot-a"></span>open source</span>
  </div>
</section>

<section class="block">
  <div class="section-head">
    <span class="sec-num">01</span>
    <h2 class="sec-title">Writing</h2>
    <span class="rule"></span>
    <a class="sec-link" href={resolve('/blog')}>all posts →</a>
  </div>
  <div class="post-list">
    {#each data.recentPosts as post (post.slug)}
      <a class="post-row" href={resolve(`/blog/${post.slug}`)}>
        <div class="post-meta">
          <span class="post-date">{formatPostDateShort(post.date)}</span>
          <span class="post-read">{getReadingTime(post.slug)}</span>
        </div>
        <div>
          <div class="post-title">{post.title}</div>
          {#if post.description}
            <div class="post-desc">{post.description}</div>
          {/if}
        </div>
      </a>
    {/each}
  </div>
</section>

<section class="block">
  <div class="section-head">
    <span class="sec-num">02</span>
    <h2 class="sec-title">Selected projects</h2>
    <span class="rule"></span>
    <a class="sec-link" href={resolve('/projects')}>all projects →</a>
  </div>
  <div class="proj-grid">
    <!-- project.url values are pre-resolved in projects.ts; the rule is a false positive here -->
    <!-- eslint-disable svelte/no-navigation-without-resolve -->
    {#each featured as project (project.name)}
      {@const Icon = project.icon}
      <a
        class="proj-card"
        href={project.url}
        rel={project.url.startsWith('/') ? undefined : 'external'}
      >
        <div class="proj-card-head">
          <span class="proj-name">
            <Icon size={17} />
            {project.name}
          </span>
        </div>
        <div class="proj-card-desc">{project.description}</div>
        <div class="proj-card-link">{linkLabel(project)} ↗</div>
      </a>
    {/each}
    <!-- eslint-enable svelte/no-navigation-without-resolve -->
  </div>
</section>

<section class="elsewhere block">
  <span class="else-label">elsewhere:</span>
  <a href="https://github.com/martinemde" rel="external">github/@martinemde ↗</a>
  <a href="https://ruby.social/@martinemde" rel="external">ruby.social/@martinemde ↗</a>
</section>

<style>
  a {
    color: inherit;
    text-decoration: none;
  }

  .hero {
    max-width: 680px;
    padding: 88px 0 12px;
  }
  .hero .eyebrow {
    margin-bottom: 26px;
    font-size: 12.5px;
  }
  .hero-name {
    margin: 0 0 26px;
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 58px;
    line-height: 1.02;
    letter-spacing: -0.025em;
  }
  .hero-lede {
    margin: 0 0 34px;
    max-width: 600px;
    font-size: 19px;
    line-height: 1.7;
    color: var(--muted);
    text-wrap: pretty;
  }
  .hero-lede a {
    color: var(--accent);
    border-bottom: 1px solid color-mix(in oklch, var(--accent) 40%, transparent);
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 8px;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: 1px solid var(--border);
    border-radius: 7px;
    background: var(--surface);
    padding: 6px 11px;
    font-family: var(--font-mono);
    font-weight: 460;
    font-size: 12px;
    color: var(--muted);
  }
  .dot {
    height: 6px;
    width: 6px;
    border-radius: 50%;
  }
  .dot-a {
    background: var(--accent);
  }
  .dot-b {
    background: var(--accent2);
  }

  .block {
    padding: 56px 0 8px;
  }
  .section-head {
    display: flex;
    align-items: baseline;
    gap: 14px;
    margin-bottom: 30px;
  }
  .sec-num {
    font-family: var(--font-mono);
    font-weight: 520;
    font-size: 12px;
    color: var(--faint);
  }
  .sec-title {
    margin: 0;
    font-family: var(--font-body);
    font-weight: 580;
    font-size: 15px;
    letter-spacing: 0.01em;
    color: var(--text);
  }
  .rule {
    flex: 1;
    height: 1px;
    background: var(--border);
  }
  .sec-link {
    font-family: var(--font-mono);
    font-weight: 460;
    font-size: 12px;
    color: var(--muted);
  }
  .sec-link:hover {
    color: var(--accent);
  }

  .post-list {
    display: flex;
    flex-direction: column;
  }
  .post-row {
    display: grid;
    grid-template-columns: 118px 1fr;
    gap: 22px;
    align-items: start;
    border-top: 1px solid var(--border);
    padding: 22px 4px;
  }
  .post-row:hover {
    background: color-mix(in oklch, var(--surface) 50%, transparent);
  }
  .post-meta {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding-top: 3px;
    font-family: var(--font-mono);
  }
  .post-date {
    font-weight: 480;
    font-size: 11.5px;
    color: var(--muted);
  }
  .post-read {
    font-weight: 440;
    font-size: 11px;
    color: var(--faint);
  }
  .post-title {
    margin-bottom: 7px;
    font-family: var(--font-body);
    font-weight: 540;
    font-size: 18px;
    line-height: 1.3;
    letter-spacing: -0.01em;
    color: var(--text);
  }
  .post-desc {
    max-width: 560px;
    font-size: 14.5px;
    line-height: 1.6;
    color: var(--muted);
    text-wrap: pretty;
  }

  .proj-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  .proj-card {
    display: block;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--surface);
    padding: 20px 22px;
    color: var(--text);
  }
  .proj-card:hover {
    border-color: var(--accent);
  }
  .proj-card-head {
    margin-bottom: 11px;
  }
  .proj-name {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    font-family: var(--font-body);
    font-weight: 580;
    font-size: 17px;
    letter-spacing: -0.01em;
  }
  .proj-name :global(svg) {
    color: var(--accent);
  }
  .proj-card-desc {
    margin-bottom: 14px;
    min-height: 44px;
    font-size: 14px;
    line-height: 1.6;
    color: var(--muted);
    text-wrap: pretty;
  }
  .proj-card-link {
    font-family: var(--font-mono);
    font-weight: 460;
    font-size: 11.5px;
    color: var(--accent);
  }

  .elsewhere {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 28px;
    margin-top: 8px;
    border-top: 1px solid var(--border);
    padding: 26px 0 88px;
    font-family: var(--font-mono);
    font-weight: 480;
    font-size: 12.5px;
  }
  .else-label {
    font-size: 11.5px;
    letter-spacing: 0.04em;
    color: var(--faint);
  }
  .elsewhere a {
    color: var(--muted);
  }
  .elsewhere a:hover {
    color: var(--accent);
  }

  @media (max-width: 640px) {
    .hero {
      padding-top: 56px;
    }
    .hero-name {
      font-size: 42px;
    }
    .hero-lede {
      font-size: 17px;
    }
    .proj-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
```

- [ ] **Step 3: Verify types and lint**

Run: `bun run check && bun run lint`
Expected: both pass.

- [ ] **Step 4: Visual check**

Run: `bun run dev`, open `/`. Confirm hero, three real chips (Gusto / gem.coop / open source), the `01 Writing` list (3 recent posts with short date + reading time), `02 Selected projects` cards showing lucide icons (gem.coop, Studio, BanchoBox, dotfiles) with hover accent border, and the `elsewhere` links. Check light + dark + mobile. Stop the server.

- [ ] **Step 5: Commit**

```bash
jj commit -m "Redesign home page to comp layout

Rebuild the hero, Writing list, Selected projects cards (keeping the
lucide icons), and elsewhere links against the token palette."
```

---

### Task 5: Blog index

**Files:**

- Modify: `src/routes/blog/+page.svelte`

**Interfaces:**

- Consumes: `data.posts` (array of `Post`), `formatPostDateShort`, `getReadingTime`, tokens; `post.tags` renders only when present.

- [ ] **Step 1: Replace `src/routes/blog/+page.svelte`**

```svelte
<script lang="ts">
  import type { PageData } from './$types';
  import { formatPostDateShort, getReadingTime } from '$lib/utils/posts';
  import { resolve } from '$app/paths';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Blog - Martin Emde</title>
  <meta name="description" content="Technical blog posts about software engineering" />
</svelte:head>

<section class="head">
  <div class="eyebrow">// {data.posts.length} posts</div>
  <h1 class="page-title">Blog</h1>
  <p class="page-lede">
    Notes on Ruby, packaging, developer tooling, and building with AI on the command line.
  </p>
</section>

<section class="list-wrap">
  <div class="post-list">
    {#each data.posts as post (post.slug)}
      <a class="post-row" href={resolve(`/blog/${post.slug}`)}>
        <div class="post-meta">
          <span class="post-date">{formatPostDateShort(post.date)}</span>
          <span class="post-read">{getReadingTime(post.slug)}</span>
        </div>
        <div>
          <div class="post-title">{post.title}</div>
          {#if post.description}
            <div class="post-desc">{post.description}</div>
          {/if}
          {#if post.tags && post.tags.length}
            <div class="tags">
              {#each post.tags as tag (tag)}
                <span class="tag">{tag}</span>
              {/each}
            </div>
          {/if}
        </div>
      </a>
    {/each}
  </div>
</section>

<style>
  a {
    color: inherit;
    text-decoration: none;
  }

  .head {
    padding: 80px 0 40px;
  }
  .page-title {
    margin: 0 0 16px;
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 46px;
    line-height: 1.05;
    letter-spacing: -0.025em;
  }
  .eyebrow {
    margin-bottom: 18px;
    font-size: 12px;
  }
  .page-lede {
    margin: 0;
    max-width: 560px;
    font-size: 17px;
    line-height: 1.7;
    color: var(--muted);
    text-wrap: pretty;
  }

  .list-wrap {
    padding-bottom: 88px;
  }
  .post-list {
    display: flex;
    flex-direction: column;
  }
  .post-row {
    display: grid;
    grid-template-columns: 130px 1fr;
    gap: 24px;
    align-items: start;
    border-top: 1px solid var(--border);
    padding: 26px 6px;
  }
  .post-row:hover {
    background: color-mix(in oklch, var(--surface) 50%, transparent);
  }
  .post-meta {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-top: 4px;
    font-family: var(--font-mono);
  }
  .post-date {
    font-weight: 480;
    font-size: 12px;
    color: var(--muted);
  }
  .post-read {
    font-weight: 440;
    font-size: 11px;
    color: var(--faint);
  }
  .post-title {
    margin-bottom: 9px;
    font-family: var(--font-body);
    font-weight: 560;
    font-size: 22px;
    line-height: 1.25;
    letter-spacing: -0.015em;
    color: var(--text);
  }
  .post-desc {
    max-width: 600px;
    margin-bottom: 13px;
    font-size: 15px;
    line-height: 1.65;
    color: var(--muted);
    text-wrap: pretty;
  }
  .tags {
    display: flex;
    gap: 7px;
  }
  .tag {
    font-family: var(--font-mono);
    font-weight: 460;
    font-size: 10.5px;
    letter-spacing: 0.03em;
    color: var(--faint);
    border: 1px solid var(--border);
    border-radius: 5px;
    padding: 3px 8px;
  }

  @media (max-width: 640px) {
    .head {
      padding-top: 56px;
    }
    .page-title {
      font-size: 38px;
    }
    .post-row {
      grid-template-columns: 1fr;
      gap: 10px;
    }
    .post-meta {
      flex-direction: row;
      gap: 12px;
    }
  }
</style>
```

- [ ] **Step 2: Verify types and lint**

Run: `bun run check && bun run lint`
Expected: both pass.

- [ ] **Step 3: Visual check**

Run: `bun run dev`, open `/blog`. Confirm eyebrow post count, `Blog` title, and the post rows (date + reading time left; title + description right; no tag row since no post defines tags). Check light + dark + mobile (rows stack). Stop the server.

- [ ] **Step 4: Commit**

```bash
jj commit -m "Redesign blog index to comp layout

Rebuild the blog listing as comp-style rows with date and reading-time
meta, optional tag chips, and token styling."
```

---

### Task 6: Blog post + ShareButtons

**Files:**

- Modify: `src/routes/blog/[slug]/+page.svelte`
- Modify: `src/lib/components/ShareButtons.svelte`

**Interfaces:**

- Consumes: `data.metadata` (`PostMetadata`), `data.content` (Svelte component), `formatPostDateShort`, `getReadingTime`; retuned `.prose` from Task 1.

- [ ] **Step 1: Replace `src/routes/blog/[slug]/+page.svelte`**

```svelte
<script lang="ts">
  import type { PageData } from './$types';
  import ShareButtons from '$lib/components/ShareButtons.svelte';
  import { formatPostDateShort, getReadingTime } from '$lib/utils/posts';
  import { resolve } from '$app/paths';

  let { data }: { data: PageData } = $props();

  const readingTime = $derived(getReadingTime(data.metadata.slug));
</script>

<article class="post">
  <a class="back" href={resolve('/blog')}>
    <span class="back-path">~/blog/</span>{data.metadata.slug}
  </a>

  <h1 class="post-title">{data.metadata.title}</h1>

  <div class="meta">
    <span class="meta-date">{formatPostDateShort(data.metadata.date)}</span>
    <span class="meta-dot"></span>
    <span class="meta-read">{readingTime}</span>
    <span class="meta-spacer"></span>
    {#if data.metadata.tags && data.metadata.tags.length}
      <span class="meta-tag">{data.metadata.tags[0]}</span>
    {/if}
  </div>

  {#if data.metadata.image}
    <img class="post-image" src={data.metadata.image} alt={data.metadata.title} />
  {/if}

  <div class="prose prose-lg max-w-none">
    <data.content />
  </div>

  <footer class="post-footer">
    <span class="share-label">Share this article</span>
    <ShareButtons
      slug={data.metadata.slug}
      title={data.metadata.title}
      description={data.metadata.description}
    />
  </footer>
</article>

<style>
  .post {
    max-width: 680px;
    margin: 0 auto;
    padding: 48px 0 88px;
  }
  .back {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 36px;
    font-family: var(--font-mono);
    font-weight: 460;
    font-size: 12px;
    color: var(--muted);
    text-decoration: none;
  }
  .back-path {
    color: var(--faint);
  }
  .back:hover {
    color: var(--accent);
  }
  .post-title {
    margin: 0 0 20px;
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 38px;
    line-height: 1.12;
    letter-spacing: -0.02em;
    text-wrap: balance;
    color: var(--text);
  }
  .meta {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 36px;
    padding-bottom: 28px;
    border-bottom: 1px solid var(--border);
    font-family: var(--font-mono);
  }
  .meta-date {
    font-weight: 480;
    font-size: 12px;
    color: var(--muted);
  }
  .meta-dot {
    height: 3px;
    width: 3px;
    border-radius: 50%;
    background: var(--faint);
  }
  .meta-read {
    font-weight: 440;
    font-size: 12px;
    color: var(--faint);
  }
  .meta-spacer {
    flex: 1;
  }
  .meta-tag {
    font-weight: 460;
    font-size: 10.5px;
    letter-spacing: 0.03em;
    color: var(--accent);
    border: 1px solid color-mix(in oklch, var(--accent) 40%, var(--border));
    border-radius: 5px;
    padding: 3px 8px;
  }
  .post-image {
    width: 100%;
    max-height: 24rem;
    object-fit: cover;
    border-radius: 0.75rem;
    margin-bottom: 2rem;
    background: var(--surface);
  }
  .post-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-top: 44px;
    padding-top: 24px;
    border-top: 1px solid var(--border);
  }
  .share-label {
    font-family: var(--font-mono);
    font-weight: 460;
    font-size: 12px;
    color: var(--faint);
  }
</style>
```

- [ ] **Step 2: Restyle `src/lib/components/ShareButtons.svelte` to tokens**

Replace the `CopyButton` `class` and the `<button>` `class` (the two Skeleton-class strings) with token-based classes, and add a scoped `<style>` block. New markup section:

```svelte
<div class="share">
  <CopyButton
    getData={getLlmUrl}
    name="LLM"
    copiedName="LLM"
    iconSize={16}
    class="share-btn"
    ariaLabel="Copy a link to the plain text of this post"
    title="Copy a link to the plain text of this post"
  />
  <button onclick={shareArticle} class="share-btn" aria-label="Share article">
    <Share2 size={16} />
    <span>Share</span>
  </button>
</div>

<style>
  .share {
    display: flex;
    gap: 8px;
  }
  .share :global(.share-btn) {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: 1px solid var(--border);
    border-radius: 7px;
    padding: 6px 12px;
    font-family: var(--font-mono);
    font-weight: 460;
    font-size: 12px;
    color: var(--muted);
    background: transparent;
    cursor: pointer;
    transition:
      color 0.15s ease,
      border-color 0.15s ease;
  }
  .share :global(.share-btn:hover) {
    color: var(--accent);
    border-color: color-mix(in oklch, var(--accent) 40%, var(--border));
  }
</style>
```

(The `:global(.share-btn)` selector is required because the class is applied inside the child `CopyButton` component; scoped styles alone would not reach it.)

- [ ] **Step 3: Verify types and lint**

Run: `bun run check && bun run lint`
Expected: both pass.

- [ ] **Step 4: Verify existing ShareButtons test still passes**

Run: `bun run test -- src/lib/components/ShareButtons.test.ts`
Expected: PASS (behavior unchanged; only styling changed).

- [ ] **Step 5: Visual check**

Run: `bun run dev`, open `/blog/claude-code-commands-deprecated` (has code + links) and `/blog/ghostty-focus-shaders` (`.svx`). Confirm the `~/blog/slug` back-link, title, meta row, retuned prose (accent links, inline code chips, blockquote), Shiki code blocks in token containers, and the restyled LLM/Share buttons. Check light + dark. Stop the server.

- [ ] **Step 6: Commit**

```bash
jj commit -m "Redesign blog post page and share buttons

Rebuild the post header, meta row, and footer against tokens, and
restyle the LLM/Share buttons to the mono status-line aesthetic."
```

---

### Task 7: Projects page

**Files:**

- Modify: `src/routes/projects/+page.svelte`

**Interfaces:**

- Consumes: `projects` from `$lib/data/projects` (keeps each project's `icon` and optional `linktext`); tokens + `.eyebrow`.

- [ ] **Step 1: Replace `src/routes/projects/+page.svelte`**

```svelte
<script lang="ts">
  import { projects } from '$lib/data/projects';

  const linkLabel = (p: (typeof projects)[number]) => p.linktext ?? p.name;
</script>

<svelte:head>
  <title>Projects - Martin Emde</title>
  <meta name="description" content="Open source projects and other things made by Martin Emde" />
</svelte:head>

<section class="head">
  <div class="eyebrow">// open source &amp; experiments</div>
  <h1 class="page-title">Projects</h1>
  <p class="page-lede">A selection of open source projects and other things I've built.</p>
</section>

<section class="list-wrap">
  <div class="proj-list">
    <!-- project.url values are pre-resolved in projects.ts; the rule is a false positive here -->
    <!-- eslint-disable svelte/no-navigation-without-resolve -->
    {#each projects as project (project.name)}
      {@const Icon = project.icon}
      <a
        class="proj-row"
        href={project.url}
        rel={project.url.startsWith('/') ? undefined : 'external'}
      >
        <div class="proj-name">
          <Icon size={17} />
          <span>{project.name}</span>
        </div>
        <div class="proj-desc">{project.description}</div>
        <div class="proj-link">{linkLabel(project)} ↗</div>
      </a>
    {/each}
    <!-- eslint-enable svelte/no-navigation-without-resolve -->
  </div>
</section>

<style>
  a {
    color: inherit;
    text-decoration: none;
  }

  .head {
    padding: 80px 0 40px;
  }
  .eyebrow {
    margin-bottom: 18px;
    font-size: 12px;
  }
  .page-title {
    margin: 0 0 16px;
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 46px;
    line-height: 1.05;
    letter-spacing: -0.025em;
  }
  .page-lede {
    margin: 0;
    max-width: 560px;
    font-size: 17px;
    line-height: 1.7;
    color: var(--muted);
    text-wrap: pretty;
  }

  .list-wrap {
    padding-bottom: 88px;
  }
  .proj-list {
    border-top: 1px solid var(--border);
  }
  .proj-row {
    display: grid;
    grid-template-columns: 200px 1fr 150px;
    gap: 24px;
    align-items: center;
    border-bottom: 1px solid var(--border);
    padding: 22px 8px;
    color: var(--text);
  }
  .proj-row:hover {
    background: color-mix(in oklch, var(--surface) 55%, transparent);
  }
  .proj-name {
    display: flex;
    align-items: center;
    gap: 11px;
    font-family: var(--font-body);
    font-weight: 580;
    font-size: 17px;
    letter-spacing: -0.01em;
  }
  .proj-name :global(svg) {
    flex: none;
    color: var(--accent);
  }
  .proj-desc {
    font-size: 14.5px;
    line-height: 1.6;
    color: var(--muted);
    text-wrap: pretty;
  }
  .proj-link {
    justify-self: end;
    font-family: var(--font-mono);
    font-weight: 440;
    font-size: 11.5px;
    color: var(--faint);
  }

  @media (max-width: 720px) {
    .head {
      padding-top: 56px;
    }
    .page-title {
      font-size: 38px;
    }
    .proj-row {
      grid-template-columns: 1fr;
      gap: 6px;
    }
    .proj-link {
      justify-self: start;
    }
  }
</style>
```

- [ ] **Step 2: Verify types and lint**

Run: `bun run check && bun run lint`
Expected: both pass.

- [ ] **Step 3: Visual check**

Run: `bun run dev`, open `/projects`. Confirm the list rows with lucide icon + name | description | link label, hover tint, and that the existing "RubyGems & Bundler" entry still appears (pre-existing real data). Check light + dark + mobile (rows stack). Stop the server.

- [ ] **Step 4: Commit**

```bash
jj commit -m "Redesign projects page to comp list layout

Rebuild the projects page as comp-style rows keeping the lucide icons and
real project data."
```

---

### Task 8: About page

**Files:**

- Modify: `src/routes/about/+page.svelte`

**Interfaces:**

- Consumes: tokens + `.eyebrow`. Uses existing real about copy and links only.

- [ ] **Step 1: Replace `src/routes/about/+page.svelte`**

```svelte
<svelte:head>
  <title>About - Martin Emde</title>
  <meta name="description" content="About Martin Emde" />
</svelte:head>

<section class="about">
  <div class="eyebrow">// who</div>
  <h1 class="page-title">About</h1>

  <div class="body">
    <p>
      AI Developer Tools Engineer at
      <a href="https://gusto.com" rel="external">Gusto</a>. Founding member of
      <a href="https://gem.coop" rel="external">gem.coop</a>.
    </p>
  </div>

  <div class="find">
    <div class="find-label">find me</div>
    <a href="https://github.com/martinemde" rel="external">
      <span class="find-net">github</span> @martinemde ↗
    </a>
    <a href="https://bsky.app/profile/martinemde.com" rel="external">
      <span class="find-net">bluesky</span> @martinemde.com ↗
    </a>
  </div>
</section>

<style>
  a {
    color: inherit;
    text-decoration: none;
  }

  .about {
    max-width: 680px;
    padding: 80px 0 88px;
  }
  .eyebrow {
    margin-bottom: 18px;
    font-size: 12px;
  }
  .page-title {
    margin: 0 0 32px;
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 46px;
    line-height: 1.05;
    letter-spacing: -0.025em;
  }
  .body {
    font-size: 17.5px;
    line-height: 1.8;
    color: var(--text);
  }
  .body p {
    margin: 0 0 22px;
  }
  .body a {
    color: var(--accent);
    border-bottom: 1px solid color-mix(in oklch, var(--accent) 40%, transparent);
  }
  .find {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-top: 40px;
    padding-top: 26px;
    border-top: 1px solid var(--border);
    font-family: var(--font-mono);
    font-weight: 480;
    font-size: 13.5px;
    color: var(--muted);
  }
  .find-label {
    font-size: 11.5px;
    letter-spacing: 0.04em;
    color: var(--faint);
  }
  .find a:hover {
    color: var(--accent);
  }
  .find-net {
    color: var(--faint);
  }

  @media (max-width: 640px) {
    .about {
      padding-top: 56px;
    }
    .page-title {
      font-size: 38px;
    }
  }
</style>
```

- [ ] **Step 2: Verify types and lint**

Run: `bun run check && bun run lint`
Expected: both pass.

- [ ] **Step 3: Visual check**

Run: `bun run dev`, open `/about`. Confirm `// who` eyebrow, `About` title, the real bio paragraph, and the `find me` links (GitHub, Bluesky). Check light + dark. Stop the server.

- [ ] **Step 4: Commit**

```bash
jj commit -m "Redesign about page to comp layout

Rebuild the about page with the comp's eyebrow/title/find-me structure
using the existing real bio and links."
```

---

### Task 9: Full verification sweep

**Files:** none (verification only)

- [ ] **Step 1: Type check, lint, tests, build**

Run: `bun run check && bun run lint && bun run test && bun run build`
Expected: all pass; build completes and prerenders the content pages without errors.

- [ ] **Step 2: Cross-page visual sweep**

Run: `bun run dev`. In both light and dark OS settings, and at desktop + mobile widths, walk `/`, `/blog`, a blog post, `/projects`, `/about`. Confirm: consistent chrome, correct active nav, footer status line reflects the real path, theme indicator matches the OS scheme and collapses to the opposite-color blip on mobile, and no horizontal overflow. Spot-check one standalone tool route (e.g. `/loans`) to confirm it still renders under the new chrome. Stop the server.

- [ ] **Step 3: Commit any final fixes**

If the sweep surfaced fixes, apply them and commit:

```bash
jj commit -m "Polish redesign after full verification sweep"
```

If nothing needed fixing, skip this step.
