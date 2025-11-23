# Instructions for LLMs Working on This Project

This is Martin Emde's personal technical blog and portfolio site built with SvelteKit and deployed to Cloudflare Pages.

## Package Manager

**IMPORTANT**: This project uses **Bun** as its package manager, not npm or yarn.

### Installation Commands

- **Install dependencies**: `bun install`
- **Add a package**: `bun add <package-name>`
- **Add a dev dependency**: `bun add -d <package-name>`
- **Remove a package**: `bun remove <package-name>`
- **Run scripts**: `bun run <script-name>` or just `bun <script-name>`

### Lockfile

- The project uses `bun.lock` for dependency locking
- **Never** commit `package-lock.json` or `yarn.lock` files
- Always use `bun install` after adding or removing dependencies to update `bun.lock`
- The build environment (Cloudflare Pages) uses `bun install --frozen-lockfile`

### If Bun is Not Available Locally

If you need to install packages and bun is not available in your environment:

1. Install bun first: `curl -fsSL https://bun.sh/install | bash`
2. Use the full path if needed: `~/.bun/bin/bun install`
3. Ensure `bun.lock` is updated and committed

## Development Commands

- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run preview` - Preview production build
- `bun run check` - Type check (svelte-kit sync + svelte-check)
- `bun run check:watch` - Type check in watch mode
- `bun run lint` - Lint and format check
- `bun run format` - Format code with Prettier

## Technology Stack

- **Framework**: SvelteKit 2.x with Svelte 5.x (using runes syntax)
- **Styling**: Tailwind CSS 4.x (via Vite plugin)
- **UI Framework**: Skeleton 4.3.0 with Catppuccin theme
- **Content**: MDsveX 0.12.3 for markdown blog posts
- **Syntax Highlighting**: Shiki 3.14.0 with dual-theme support
- **Icons**: Lucide Svelte 0.553.0
- **Deployment**: Cloudflare Pages with Workers adapter
- **Package Manager**: Bun
- **TypeScript**: 5.9.3 with strict mode

## Project Structure

```
martinemde.com/
├── src/
│   ├── routes/                    # SvelteKit file-based routes
│   │   ├── +layout.svelte        # Root layout (header, nav, footer)
│   │   ├── +layout.ts            # Root prerender config
│   │   ├── +page.svelte          # Homepage (recent posts)
│   │   ├── about/                # About page
│   │   ├── blog/                 # Blog routes
│   │   │   ├── +page.svelte      # Blog listing page
│   │   │   ├── +page.ts          # Load all posts
│   │   │   ├── [slug]/           # Dynamic blog post route
│   │   │   │   ├── +page.svelte  # Individual post display
│   │   │   │   └── +page.ts      # Load single post
│   │   │   └── [slug].txt/       # Raw markdown endpoint
│   │   │       └── +server.ts    # Serve post as plain text
│   │   ├── [...segments]/        # Catch-all for old URL redirects
│   │   ├── rss.xml/              # RSS feed endpoint
│   │   │   └── +server.ts        # Generate RSS XML
│   │   └── llms.txt/             # LLM-friendly post index
│   │       └── +server.ts        # Plain text post listing
│   ├── content/
│   │   └── blog/                 # Markdown blog posts (*.md)
│   ├── lib/
│   │   ├── components/           # Reusable Svelte components
│   │   │   ├── CodeBlock.svelte  # Syntax highlighting
│   │   │   └── ShareButtons.svelte # Share/copy buttons
│   │   ├── utils/
│   │   │   └── posts.ts          # Blog post utilities
│   │   └── images/               # SVG and image assets
│   ├── app.html                  # HTML shell (theme setup)
│   ├── app.css                   # Global styles
│   └── app.d.ts                  # TypeScript declarations
├── static/                       # Public assets
│   ├── favicon.ico
│   ├── robots.txt
│   └── headshot.jpeg
└── Configuration files (see below)
```

## Theme and Styling

This project uses Skeleton's **Catppuccin** theme. The theme is set in `src/app.html` with `data-theme="catppuccin"`.

### Color Class Patterns

**ALWAYS use Skeleton's adaptive color classes, NEVER hardcoded colors:**

```svelte
<!-- ✅ Correct: Adaptive colors -->
<div class="bg-surface-50-950">        <!-- Light: 50, Dark: 950 -->
<div class="text-surface-950-50">      <!-- Inverted from bg -->
<div class="text-surface-600-400">     <!-- Subtle text -->
<div class="border-surface-200-800">   <!-- Adaptive borders -->
<a class="anchor">                      <!-- Theme-aware links -->

<!-- ❌ Incorrect: Hardcoded colors -->
<div class="bg-white dark:bg-gray-950">
<div class="text-black dark:text-white">
```

### Syntax Highlighting

Code blocks use **dual-theme syntax highlighting** via Shiki:

- Light theme: `catppuccin-latte`
- Dark theme: `catppuccin-macchiato`
- Automatic switching via CSS `light-dark()` function
- No JavaScript required for theme switching
- Code blocks in markdown are automatically highlighted via MDsveX

### Typography

- Body font: System font stack
- Code font: `Fira Mono`
- Prose styling: `@tailwindcss/typography` plugin
- Form styling: `@tailwindcss/forms` plugin

## Content Management (Blog Posts)

### Blog Post Location

All blog posts are stored in `/src/content/blog/*.md` as markdown files.

### Required Frontmatter

Every blog post MUST include these frontmatter fields:

```yaml
---
title: 'Post Title'
date: 2025-10-25
slug: post-slug
published: true
description: 'Short preview description'
author: Martin Emde
---
```

**Field Descriptions:**

- `title` (required): Post title displayed in listings and on the post page
- `date` (required): Publication date in YYYY-MM-DD format
- `slug` (required): URL-friendly identifier used in `/blog/[slug]`
- `published` (optional, default: true): Set to false to hide drafts
- `description` (optional): Preview text shown on listing pages and in RSS
- `author` (optional): Author name

### Blog Post Processing Pipeline

1. MDsveX preprocessor transforms `.md` files to Svelte components at build time
2. Frontmatter becomes `metadata` export
3. Content becomes `default` export (renderable Svelte component)
4. Shiki applies dual-theme syntax highlighting to code blocks
5. Posts are loaded via Vite glob imports in `src/lib/utils/posts.ts`

### Blog Post Utilities

Located in `src/lib/utils/posts.ts`:

```typescript
getAllPosts()          // Load all published posts, sorted newest first
getRecentPosts(limit)  // Get N most recent posts
getPostBySlug(slug)    // Load single post with content + metadata
getRawPostBySlug(slug) // Get raw markdown (for RSS/text endpoints)
```

## Routing and Pages

### Route Structure

| Route                | Purpose                          | Type       |
| -------------------- | -------------------------------- | ---------- |
| `/`                  | Homepage with 5 recent posts     | Page       |
| `/about`             | About page                       | Page       |
| `/blog`              | All blog posts listing           | Page       |
| `/blog/[slug]`       | Individual blog post             | Page       |
| `/blog/[slug].txt`   | Raw markdown as plain text       | Endpoint   |
| `/rss.xml`           | RSS 2.0 feed (last 20 posts)     | Endpoint   |
| `/llms.txt`          | LLM-friendly post index          | Endpoint   |
| `/[...segments]`     | Catch-all for old date-based URLs | Redirect   |

### Prerendering Strategy

- **Most pages are prerendered** to static HTML at build time
- Root layout sets `prerender = true` in `+layout.ts`
- Homepage, about page, and blog listing are all static
- Catch-all redirect route uses `prerender = false` for dynamic redirects
- Some pages use `csr = dev` to avoid JavaScript in production builds

### URL Redirects

The catch-all route (`/[...segments]/+page.ts`) handles old date-based URL patterns:

- Old format: `/YYYY/MM/DD/slug`
- Redirects to: `/blog/slug`
- Validates that the date in URL matches the post's frontmatter date
- Returns 301 permanent redirects

## Component Patterns (Svelte 5)

### Runes Syntax

This project uses Svelte 5's **runes syntax**:

```svelte
<script lang="ts">
  // Props destructuring
  let { children, title = 'Default' } = $props();

  // Reactive state
  let copied = $state(false);

  // Derived state
  let uppercaseTitle = $derived(title.toUpperCase());
</script>
```

### Component Conventions

1. **Always use TypeScript** in components: `<script lang="ts">`
2. **Use theme-aware classes**: Follow Skeleton color patterns
3. **Prefer composition**: Use slots and children props
4. **Include accessibility**: Add ARIA labels where needed
5. **Keep components focused**: Single responsibility principle

### Key Components

**ShareButtons.svelte** (`src/lib/components/ShareButtons.svelte`):

- Two buttons: "LLM" (copy `.txt` link) and "Share" (native share API or clipboard)
- Uses lucide-svelte icons: `Copy`, `CopyCheck`, `Share2`
- Shows visual feedback with icon change on copy
- Props: `url` (string)

**CodeBlock.svelte** (`src/lib/components/CodeBlock.svelte`):

- Wraps Shiki syntax highlighting
- Props: `code`, `lang` (default: 'ruby'), `theme`
- Falls back to unstyled `<pre>` if highlighting fails
- Adds overflow scrolling and rounded corners

## Route Loader Patterns

### Page Load Functions

```typescript
// +page.ts
import type { PageLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getPostBySlug } from '$lib/utils/posts';

export const load: PageLoad = async ({ params }) => {
  const post = await getPostBySlug(params.slug);

  if (!post) {
    throw error(404, 'Post not found');
  }

  return post;
};

export const prerender = true;
```

### Server Endpoints

```typescript
// +server.ts
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ setHeaders }) => {
  setHeaders({
    'Content-Type': 'application/xml',
    'Cache-Control': 'max-age=3600'
  });

  const xml = generateRSS();

  return new Response(xml);
};
```

## Special Features

### 1. LLM-Friendly Content Access

The site provides special endpoints for LLM consumption:

- **`/blog/[slug].txt`**: Individual posts as plain text markdown
- **`/llms.txt`**: Index of all posts with links to `.txt` versions
- **ShareButtons**: Include "LLM" button to copy `.txt` URL

### 2. RSS Feed (`/rss.xml`)

- Last 20 posts included
- Full HTML content in `<content:encoded>` using CDATA
- Rendered via `marked` library
- Proper XML escaping
- Cache control: 1 hour (`max-age=3600`)

### 3. Date-Based URL Redirects

- Catch-all route handles legacy URLs: `/YYYY/MM/DD/slug`
- Validates date matches post metadata
- Returns 301 permanent redirects to `/blog/slug`

## Build and Deployment

### Cloudflare Pages Configuration

- **Adapter**: `@sveltejs/adapter-cloudflare` (for Workers)
- **Build command**: `bun run build`
- **Install command**: `bun install --frozen-lockfile`
- **Output**: `.cloudflare/worker.js` and `.cloudflare/public/`
- **Config file**: `wrangler.jsonc`

### Build Process

1. SvelteKit syncs generated types
2. MDsveX preprocesses markdown files
3. Vite bundles the application
4. Tailwind processes CSS
5. Adapter generates Cloudflare Worker and static assets
6. Static pages are prerendered to HTML

### Environment Requirements

- Node.js 20+ (for Cloudflare Pages)
- Bun for local development
- TypeScript 5.9+

## Code Quality

### Formatting (Prettier)

- **Single quotes** in strings
- **No trailing commas**
- **Print width**: 100 characters
- **Plugins**: Svelte parser, Tailwind class sorting (`prettier-plugin-tailwindcss`)
- **Command**: `bun run format` (write) or `bun run lint` (check)

### Linting (ESLint)

- ESLint 9+ with flat config (`eslint.config.js`)
- TypeScript support via `typescript-eslint`
- Svelte-specific rules via `eslint-plugin-svelte`
- Prettier integration (no conflicting rules)
- `no-undef` disabled (TypeScript handles this)
- **Command**: `bun run lint`

### Type Checking

- Strict mode enabled
- Run with: `bun run check` or `bun run check:watch`
- Uses `svelte-check` for Svelte-specific type checking
- Module resolution: `bundler`

## Important Conventions

### Do's

- ✅ Use Bun for all package management
- ✅ Use Skeleton's adaptive color classes (`surface-*`, `anchor`)
- ✅ Use Svelte 5 runes syntax (`$props`, `$state`, `$derived`)
- ✅ Prerender pages when possible (`export const prerender = true`)
- ✅ Include all required frontmatter in blog posts
- ✅ Use TypeScript in all new files
- ✅ Format code with Prettier before committing
- ✅ Keep components small and focused
- ✅ Use theme-aware patterns (avoid hardcoded colors)

### Don'ts

- ❌ Don't use npm or yarn (use Bun)
- ❌ Don't commit `package-lock.json` or `yarn.lock`
- ❌ Don't use hardcoded colors (use Skeleton classes)
- ❌ Don't use old Svelte syntax (use runes)
- ❌ Don't skip frontmatter fields in blog posts
- ❌ Don't add emojis unless explicitly requested
- ❌ Don't create unnecessary files (prefer editing existing ones)
- ❌ Don't use manual dark mode classes (theme handles this)

## Common Tasks

### Adding a New Blog Post

1. Create file: `src/content/blog/my-post.md`
2. Add required frontmatter (title, date, slug, published)
3. Write content in markdown
4. Code blocks will be automatically highlighted
5. Post will appear on `/blog` and homepage if published
6. Build and deploy to see it live

### Adding a New Component

1. Create file in `src/lib/components/MyComponent.svelte`
2. Use TypeScript: `<script lang="ts">`
3. Use runes syntax for props and state
4. Use theme-aware Skeleton classes
5. Export props via `let { prop } = $props()`
6. Import and use: `import MyComponent from '$lib/components/MyComponent.svelte'`

### Modifying Styles

1. Use Skeleton theme classes when possible
2. For global styles, edit `src/app.css`
3. Tailwind utilities are available everywhere
4. Theme colors: `surface-*`, `primary-*`, `secondary-*`, `tertiary-*`
5. Run `bun run format` to sort Tailwind classes

### Adding a Route

1. Create folder in `src/routes/`
2. Add `+page.svelte` for the page component
3. Add `+page.ts` for data loading (optional)
4. Add `+server.ts` for API endpoints (optional)
5. Set `export const prerender = true` if possible
6. Use `+layout.svelte` for shared layout (optional)

## Troubleshooting

### Build Fails

1. Check TypeScript errors: `bun run check`
2. Check linting errors: `bun run lint`
3. Verify all dependencies are installed: `bun install`
4. Clear build cache: `rm -rf .svelte-kit`

### Styling Issues

1. Verify Skeleton classes are correct (check docs)
2. Check that theme is set in `src/app.html`
3. Ensure Tailwind classes are properly sorted
4. Use browser dev tools to inspect computed styles

### Blog Post Not Showing

1. Check `published: true` in frontmatter
2. Verify all required frontmatter fields present
3. Check date format is YYYY-MM-DD
4. Ensure file is in `src/content/blog/`
5. Rebuild: `bun run build`

## References

- [SvelteKit Docs](https://kit.svelte.dev/docs)
- [Svelte 5 Docs](https://svelte-5-preview.vercel.app/docs)
- [Skeleton UI Docs](https://www.skeleton.dev/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [MDsveX Docs](https://mdsvex.pngwn.io/)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)

## Project Metadata

- **Repository**: martinemde.github.io
- **Owner**: Martin Emde
- **Primary Language**: TypeScript, Svelte
- **Deployment**: Cloudflare Pages
- **License**: (check repository)
