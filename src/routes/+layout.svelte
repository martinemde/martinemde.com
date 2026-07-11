<script lang="ts">
  import './layout.css';
  import '../app.css';
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import { PUBLIC_APP_URL } from '$env/static/public';

  let { children } = $props();

  // Derive the page title from the current page data
  const pageTitle = $derived(
    page.data.metadata?.title ? `${page.data.metadata.title} - Martin Emde` : 'Martin Emde'
  );

  // Derive the page description
  const pageDescription = $derived(page.data.metadata?.description || undefined);

  // Derive the page image - convert relative URLs to absolute
  const pageImage = $derived.by(() => {
    const image = page.data.metadata?.image;
    if (!image) return undefined;
    // If it's already absolute, return as-is
    if (image.startsWith('http://') || image.startsWith('https://')) return image;
    // Convert relative path to absolute URL
    return `${PUBLIC_APP_URL}${image}`;
  });

  // Get the current page URL
  const pageUrl = $derived(`${PUBLIC_APP_URL}${page.url.pathname}`);

  // Determine content type - article for blog posts, website otherwise
  const contentType = $derived(
    page.url.pathname.startsWith('/blog/') && page.data.metadata?.slug ? 'article' : 'website'
  );

  // Active-section + status-line path for the redesigned chrome
  const path = $derived(page.url.pathname);
  const isBlog = $derived(path === '/blog' || path.startsWith('/blog/'));
  const isProjects = $derived(path.startsWith('/projects'));
  const isAbout = $derived(path.startsWith('/about'));
  const pathDisplay = $derived('martinemde.com' + (path === '/' ? '' : path));
</script>

<svelte:head>
  <title>{pageTitle}</title>

  {#if pageDescription}
    <meta name="description" content={pageDescription} />
  {/if}

  <!-- Dynamic links using PUBLIC_APP_URL -->
  <link
    rel="alternate"
    href="{PUBLIC_APP_URL}/rss.xml"
    type="application/rss+xml"
    title="Martin Emde"
  />
  <link rel="authorization_endpoint" href="{PUBLIC_APP_URL}/auth/indieauth/authorize" />
  <link rel="token_endpoint" href="{PUBLIC_APP_URL}/auth/indieauth/token" />
  <link rel="micropub" href="{PUBLIC_APP_URL}/micropub" />

  <meta property="og:title" content={pageTitle} />
  <meta property="og:url" content={pageUrl} />
  <meta property="og:type" content={contentType} />
  <meta name="twitter:title" content={pageTitle} />

  {#if pageDescription}
    <meta property="og:description" content={pageDescription} />
    <meta name="twitter:description" content={pageDescription} />
  {/if}

  {#if pageImage}
    <meta property="og:image" content={pageImage} />
    <meta name="twitter:image" content={pageImage} />
    <meta name="twitter:card" content="summary_large_image" />
  {:else}
    <meta name="twitter:card" content="summary" />
  {/if}
</svelte:head>
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
