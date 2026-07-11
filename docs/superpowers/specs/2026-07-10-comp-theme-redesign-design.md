# Comp-matched theme redesign

## Goal

Redesign the site's theme and content pages to match the look and feel of the
provided design comps (`Martin Emde.dc.html`), using the **Teal & Violet**
accent variation, keeping the existing MonoLisa font (but adopting the comp's
sizing), and driving dark/light purely from the system preference as today.

Use real site content throughout. Do not invent data. Do not mention RubyGems in
new hero/chip copy.

## Non-goals

- No manual light/dark toggle (system-only, as now).
- No restyling of standalone tool routes (loans, shaders, models, toy, dimsum,
  tossball, editor, llm, ww, vote, auth). They inherit the new global chrome,
  background, and fonts but keep their internal UI.
- No new blog-post frontmatter fields required. Tags render only if already
  present on a post.

## Architecture

### Design-token layer

The comp's look is driven by a small set of CSS custom properties. Define them
once in `src/app.css` on `:root` using `light-dark()`, driven by the existing
`color-scheme: light dark`. No `.dark` class and no JS are involved — this keeps
theme selection purely system-based.

Teal & Violet values (from the comp's `renderVals`):

| token       | light (`oklch`)     | dark (`oklch`)      | role                     |
| ----------- | ------------------- | ------------------- | ------------------------ |
| `--bg`      | `0.976 0.008 85`    | `0.185 0.012 70`    | warm page background     |
| `--surface` | `0.945 0.011 85`    | `0.235 0.014 70`    | cards, footer            |
| `--code`    | `0.928 0.013 85`    | `0.262 0.015 70`    | inline code / code bg    |
| `--border`  | `0.875 0.013 80`    | `0.33 0.012 70`     | hairlines                |
| `--text`    | `0.27 0.013 75`     | `0.925 0.01 80`     | body text                |
| `--muted`   | `0.475 0.015 75`    | `0.70 0.014 75`     | secondary text           |
| `--faint`   | `0.65 0.013 75`     | `0.52 0.012 70`     | tertiary text            |
| `--accent`  | `0.545 0.10 200`    | `0.81 0.11 195`     | primary accent (teal)    |
| `--accent2` | `0.52 0.14 305`     | `0.77 0.11 305`     | secondary accent (violet)|

Each is declared as e.g.
`--bg: light-dark(oklch(0.976 0.008 85), oklch(0.185 0.012 70));`

Skeleton and the `espresso` theme remain installed and untouched — they still
back the standalone tool pages. Only the redesigned content pages and shared
chrome consume the new tokens directly.

`::selection` background uses `color-mix(in oklch, var(--accent) 30%, transparent)`
to match the comp.

### Font mapping (keep MonoLisa, adopt comp sizing)

The comp uses Recursive's variable axes. Map its two visual roles onto the two
existing MonoLisa families (both are variable, weight 1–900, with italics):

- **Proportional** role (name, page headings, post titles, prose): `MonoLisaText`
  (`var(--font-body)`). Where the comp used the CASL/wght axes, use font-weight +
  tight negative letter-spacing. Where it used slant, use italic.
- **Mono** role (`//` eyebrows, nav items, dates, "N min read", tags, footer
  status line, inline/inline-block code, breadcrumb): `MonoLisaCode`
  (`var(--font-mono)`).

Adopt the comp's font sizes, weights, and letter-spacing (representative values):

- Home name `h1`: ~58px, weight ~600, letter-spacing `-0.025em`, line-height 1.02.
- Page `h1` (blog/projects/about): ~46px, weight ~600, letter-spacing `-0.025em`.
- Post `h1`: ~38px, weight ~600, letter-spacing `-0.02em`, `text-wrap: balance`.
- Section labels ("01 Writing"): ~15px, weight ~580.
- Eyebrow `//` lines: ~12–12.5px mono, letter-spacing `0.05em`, color `--accent`.
- Mono meta (dates/read/tags/nav/footer): ~11–12.5px.
- Body/intro copy: ~17–19px, line-height 1.7–1.8, color `--muted` (intros) or
  `--text` (prose).

Sizes may be expressed in `rem` equivalents for consistency with the codebase as
long as the rendered result matches the comp.

## Shared chrome (`src/routes/+layout.svelte`)

Container width: `max-width: 1040px`, horizontal padding `32px` (mobile-reduced).

### Header

- Sticky (`position: sticky; top: 0`), `z-index` above content.
- Translucent background `color-mix(in oklch, var(--bg) 86%, transparent)` with
  `backdrop-filter: saturate(1.2) blur(8px)`, bottom `1px solid var(--border)`.
- Left: accent rounded-square logo dot (`11px`, `border-radius: 3px`,
  `background: var(--accent)`, soft accent ring via `box-shadow`) + "Martin Emde"
  wordmark (`MonoLisaText`, weight ~600, `-0.01em`), linking home.
- Nav: `/blog`, `/projects`, `/about` (mono; the leading `/` at reduced opacity).
  Active route (current section, and post pages count as `blog`) colored
  `--accent` with heavier weight; others `--muted`.
- Theme indicator (right, non-interactive — no toggle):
  - Desktop: a small square + text `theme:dark` / `theme:light`.
  - The label text switches via a `prefers-color-scheme` CSS rule (two spans, the
    inactive one `display:none`) — no JS.
  - Mobile: the text is hidden; only the square remains. The square is filled
    with the **opposite** of the background:
    `background: light-dark(<dark color>, <light color>)` so it reads as a light
    blip on dark bg and a dark blip on light bg.

### Footer

Terminal status-line, `background: var(--surface)`, top border, mono ~11.5px:

- Pulse dot (`--accent`, `mePulse` keyframes) + current path
  (`martinemde.com{page.url.pathname}` — display the real current path).
- Accent name label: `Teal & Violet` (color `--faint`).
- Spacer.
- `© 2025 Martin Emde` (color `--faint`).
- `theme:dark` / `theme:light` (same CSS swap as header).
- Version `v2026.7` followed by a blinking cursor `_` (`meBlink` keyframes,
  color `--accent`).

Keyframes `mePulse` and `meBlink` are defined in `app.css`.

## Pages

All content pages use real data and existing loaders/utilities
(`getRecentPosts`, `getAllPosts`, `getReadingTime`, `formatPostDate`,
`$lib/data/projects`). Reading time uses the existing `getReadingTime`.

### Home (`src/routes/+page.svelte`)

1. Hero: eyebrow `//` line, `Martin Emde` `h1`, the existing real bio paragraph
   (AI Developer Tools Engineer at Gusto; founding member of gem.coop; GitHub),
   then affiliation chips.
   - Chips are drawn only from existing real facts — e.g. Gusto, `gem.coop — PLC`,
     and a real current project such as `skillet`. Each chip: mono, `--surface`
     background, `--border`, a small accent/accent2 dot. No invented facts; no
     RubyGems.
2. `01 Writing`: section header row (number `--faint`, "Writing", hairline rule,
   `all posts →` link to `/blog`) + the 3 most recent posts as rows
   (date + reading time column | title + description).
3. `02 Selected projects`: section header row (`all projects →` to `/projects`) +
   the first 4 projects from `projects.ts` as 2-column cards. Each card shows the
   project's existing lucide `icon` (colored `--accent`) beside the name, plus
   tag chip, description, and link label. Cards get accent border on hover.
4. "elsewhere" links row: existing real external links (GitHub, ruby.social).

### Blog index (`src/routes/blog/+page.svelte`)

- Header: `// N posts` eyebrow (N = post count), `Blog` `h1`, short description.
- Post list: each post a row `grid-template-columns: 130px 1fr` —
  left column date + reading time (mono); right column title, description, and
  tag chips. Tags render only if the post's metadata has them; otherwise the tag
  row is omitted. Row hover tints with a translucent `--surface`.

### Blog post (`src/routes/blog/[slug]/+page.svelte`)

- Constrain article to `max-width: 680px`.
- Breadcrumb button back to `/blog` rendered as `~/blog/<slug>` (mono, `~/blog/`
  in `--faint`).
- `h1` title, then a meta row: date · reading time · optional tag chip (tag only
  if present), separated by a small dot, hairline bottom border.
- Header image (`metadata.image`) kept if present, restyled to tokens.
- Prose (`.prose`) retuned to the token palette (do not rely on
  `dark:prose-invert`): body `--text`, headings proportional, links colored
  `--accent` with a translucent accent bottom-border, blockquotes with an accent
  left-border on a tinted `--surface`/`--accent` mix, and inline `code` as token
  "chips" (`--code` bg, `--accent` text, `--border`). A `NOTE`-style callout
  treatment is available for blockquotes.
- **Shiki code blocks are kept** for real syntax highlighting. Their container is
  restyled to token colors (`--code` bg, `--border`, rounded). The comp's
  decorative "terminal window" chrome (traffic-light dots + filename bar) is not
  auto-derivable from markdown fences and is out of scope; a lighter token-based
  container is used instead.
- Footer: `Share this article` + restyled `LLM` / `Share` buttons
  (existing `ShareButtons` component, restyled to tokens).

### Projects (`src/routes/projects/+page.svelte`)

- Header: eyebrow, `Projects` `h1`, existing description.
- List layout from the comp: each project a row
  `grid-template-columns: 200px 1fr 150px` (responsive collapse on mobile) —
  the project's existing lucide `icon` (colored `--accent`) + name | description |
  tag + link label (`↗`). The comp's plain accent square is replaced by the real
  icon. Uses the existing `projects.ts` data (including each project's existing
  `linktext`/`icon`). Row hover tints with translucent `--surface`.

### About (`src/routes/about/+page.svelte`)

- `// who` eyebrow, `About` `h1`, the existing real about copy (Gusto, gem.coop,
  GitHub, Bluesky), and a "find me" links block. No invented biography.

## Testing / verification

- `bun run check` (types) and `bun run lint` pass.
- Existing tests (`bun run test`) still pass; `ShareButtons` behavior unchanged.
- `bun run build` succeeds (prerender of content pages).
- Manual/visual verification via `bun run dev` (or `/run`): home, blog index, a
  blog post, projects, about, each in both light and dark system settings, and at
  mobile width (theme indicator collapses to the opposite-color blip; project and
  post-list grids collapse gracefully).

## Deviation from CLAUDE.md (noted)

CLAUDE.md instructs always using Skeleton adaptive color classes. This redesign
intentionally moves the content pages and shared chrome to the bespoke token
layer above to faithfully match the comp. Skeleton and the espresso theme remain
in place for the standalone tool pages, which are unchanged.
