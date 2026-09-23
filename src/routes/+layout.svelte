<script lang="ts">
  import './layout.css';
  import '../app.css';
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import { afterNavigate } from '$app/navigation';
  import { PUBLIC_APP_URL } from '$env/static/public';
  import { socialMetadata } from '$lib/utils/social';
  import { createAutoHide } from '$lib/utils/autohide';

  let { children } = $props();

  const social = $derived(
    page.data.metadata ? socialMetadata(page.data.metadata, PUBLIC_APP_URL) : undefined
  );
  const pageTitle = $derived(social ? `${social.title} - Martin Emde` : 'Martin Emde');
  const pageDescription = $derived(social?.description);
  const pageImage = $derived(social?.image);
  const pageUrl = $derived(social?.url ?? new URL(page.url.pathname, PUBLIC_APP_URL).href);
  const contentType = $derived(social ? 'article' : 'website');

  // Active-section + status-line path for the redesigned chrome
  const path = $derived(page.url.pathname);
  // Dated permalinks hold both articles (blog) and everything else (stream).
  const isDated = $derived(/^\/\d{4}\//.test(path));
  const isArticle = $derived(page.data.metadata?.type === 'article');
  const isBlog = $derived(path === '/blog' || path.startsWith('/blog/') || (isDated && isArticle));
  const isStream = $derived(path === '/stream' || (isDated && !isArticle));
  const isProjects = $derived(path.startsWith('/projects'));
  const isAbout = $derived(path.startsWith('/about'));
  const pathDisplay = $derived('martinemde.com' + (path === '/' ? '' : path));

  /*
   * Auto-hiding header. Layered on as an enhancement: with no client JS (see
   * `csr = dev` on a couple of routes) the bar just stays put, as it always did.
   */
  let headerEl: HTMLElement | undefined = $state();
  let headerHidden = $state(false);

  const autoHide = createAutoHide({
    /*
     * Keyboard users shouldn't have the focused link slide out from under them.
     * Tabbing into the bar reveals it (`onfocusin` below); this keeps it there
     * for as long as focus stays inside.
     */
    hold: () => !!headerEl?.contains(document.activeElement)
  });

  $effect(() => {
    let queued = false;

    function read() {
      queued = false;
      // Clamp to the real scroll range so iOS rubber-banding past either end
      // doesn't register as a direction change.
      const limit = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      headerHidden = autoHide.update(Math.min(Math.max(window.scrollY, 0), limit));
    }

    function onScroll() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(read); // one decision per frame, not per event
    }

    autoHide.reset(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  });

  // A new page starts at the top, so start it with the bar in view.
  afterNavigate(() => {
    headerHidden = autoHide.reset(window.scrollY);
  });
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
  <link rel="canonical" href={pageUrl} />
  <meta property="og:site_name" content="Martin Emde" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:title" content={social?.title ?? pageTitle} />
  {#if social}
    <meta property="article:published_time" content={page.data.metadata.date.toISOString()} />
    {#if page.data.metadata.updated}<meta
        property="article:modified_time"
        content={page.data.metadata.updated.toISOString()}
      />{/if}
  {/if}
  <meta property="og:url" content={pageUrl} />
  <meta property="og:type" content={contentType} />
  <meta name="twitter:title" content={social?.title ?? pageTitle} />

  {#if pageDescription}
    <meta property="og:description" content={pageDescription} />
    <meta name="twitter:description" content={pageDescription} />
  {/if}

  {#if pageImage}
    <meta property="og:image" content={pageImage} />
    <meta property="og:image:alt" content={social?.imageAlt ?? ''} />
    <meta name="twitter:image:alt" content={social?.imageAlt ?? ''} />
    {#if social?.generatedImage}
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:type" content="image/png" />
    {/if}
    <meta name="twitter:image" content={pageImage} />
    <meta name="twitter:card" content="summary_large_image" />
  {:else}
    <meta name="twitter:card" content="summary" />
  {/if}
</svelte:head>
<div class="site">
  <header
    class="site-header"
    class:is-hidden={headerHidden}
    bind:this={headerEl}
    onfocusin={() => (headerHidden = autoHide.reset(window.scrollY))}
  >
    <div class="bar">
      <a class="brand" href={resolve('/')}>
        <span class="brand-mark"></span>
        <span class="brand-name">Martin Emde</span>
      </a>
      <nav class="nav" aria-label="Main navigation">
        <a class="nav-link" class:active={isStream} href={resolve('/stream')}
          ><span class="slash">/</span>stream</a
        >
        <a class="nav-link" class:active={isBlog} href={resolve('/blog')}>
          <span class="slash">/</span>blog
        </a>
        <a class="nav-link" class:active={isProjects} href={resolve('/projects')}>
          <span class="slash">/</span>projects
        </a>
        <a class="nav-link" class:active={isAbout} href={resolve('/about')}>
          <span class="slash">/</span>about
        </a>
        <button
          type="button"
          class="theme-ind"
          data-theme-toggle
          aria-label="Switch color theme"
          aria-pressed="false"
        >
          <span class="theme-blip" aria-hidden="true"></span>
          <span class="theme-text" aria-hidden="true"
            >theme:<span class="theme-when-dark">dark</span><span class="theme-when-light"
              >light</span
            ></span
          >
        </button>
      </nav>
    </div>
  </header>

  <main class="site-main">
    {@render children()}
  </main>

  <footer class="site-footer">
    <div class="statusline">
      <span class="sl-path"><span class="sl-pulse"></span>{pathDisplay}</span>
      <span class="sl-spacer"></span>
      <span class="sl-dim">© 2025 Martin Emde</span>
      <button
        type="button"
        class="sl-dim sl-theme"
        data-theme-toggle
        aria-label="Switch color theme"
        aria-pressed="false"
        >theme:<span class="theme-when-dark">dark</span><span class="theme-when-light">light</span
        ></button
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
    transition: transform 200ms ease;
  }
  /* Driven by the scroll latch in the script above; see $lib/utils/autohide. */
  .site-header.is-hidden {
    transform: translateY(-100%);
  }
  @media (prefers-reduced-motion: reduce) {
    .site-header {
      transition: none;
    }
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
    flex: 0 0 auto; /* the name sets the floor; the nav does the yielding */
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
    white-space: nowrap; /* non-negotiable: "Martin Emde" stays on one line */
  }
  .nav {
    display: flex;
    min-width: 0;
    flex: 0 1 auto;
    align-items: center;
    gap: 4px;
    /*
     * Last-resort valve. The tiers below are sized to fit without it, but if a
     * viewport ever gets narrower than they allow, the nav scrolls rather than
     * the page — the brand still doesn't wrap and nothing overflows the body.
     */
    overflow-x: auto;
    scrollbar-width: none;
    overscroll-behavior-x: contain;
  }
  .nav::-webkit-scrollbar {
    display: none;
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

  /* Theme switch — reads as the current mode, click toggles it */
  .theme-ind {
    margin-left: 14px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    padding: 7px 12px;
    cursor: pointer;
    font: inherit;
    line-height: 1;
  }
  .theme-ind:hover {
    border-color: var(--accent);
  }
  .theme-ind:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
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
  .sl-dim {
    color: var(--faint);
  }
  /* Same look as the .sl-dim span it replaced — just the button chrome removed. */
  .sl-theme {
    border: 0;
    background: none;
    padding: 0;
    font: inherit;
    letter-spacing: inherit;
    cursor: pointer;
  }
  .sl-theme:hover {
    color: var(--accent);
  }
  .sl-theme:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
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

  /*
   * Mobile top bar, fitted progressively rather than at one breakpoint.
   *
   * Tier 1 (<=640px, this block) scales every contributor fluidly between 320px
   * and 640px, so the bar tightens continuously instead of snapping and
   * overflowing, and collapses the theme button down to its blip. Each clamp()
   * reads `clamp(<at 320px>, <slope>vw + <intercept>, <at 640px>)`.
   *
   * Tier 2 (<=400px, the block after this one) drops the `/` path prefixes,
   * which buys back the last ~22px at iPhone widths.
   *
   * Everything above 640px is untouched.
   */
  @media (max-width: 640px) {
    .site {
      /* One gutter for header, main and footer keeps the brand aligned
         with the content column as it tightens. 14px -> 20px. */
      --gutter: clamp(14px, 1.875vw + 8px, 20px);
    }
    .bar,
    .site-main,
    .statusline {
      padding-left: var(--gutter);
      padding-right: var(--gutter);
    }
    .bar {
      padding-top: clamp(10px, 1.875vw + 4px, 16px);
      padding-bottom: clamp(10px, 1.875vw + 4px, 16px);
      gap: clamp(8px, 5vw - 8px, 24px);
    }
    .brand {
      gap: clamp(7px, 1.25vw + 3px, 11px);
    }
    .brand-mark {
      height: clamp(9px, 0.625vw + 7px, 11px);
      width: clamp(9px, 0.625vw + 7px, 11px);
      box-shadow: 0 0 0 3px color-mix(in oklch, var(--accent) 16%, transparent);
    }
    .brand-name {
      font-size: clamp(14px, 0.9375vw + 11px, 17px);
    }
    .nav {
      gap: clamp(1px, 0.9375vw - 2px, 4px);
    }
    .nav-link {
      font-size: clamp(11px, 0.78125vw + 8.5px, 13.5px);
      padding-left: clamp(4px, 2.1875vw - 3px, 11px);
      padding-right: clamp(4px, 2.1875vw - 3px, 11px);
      white-space: nowrap;
    }
    .theme-ind {
      margin-left: clamp(4px, 3.125vw - 6px, 14px);
      padding-left: clamp(7px, 1.5625vw + 2px, 12px);
      padding-right: clamp(7px, 1.5625vw + 2px, 12px);
    }
    .theme-blip {
      height: clamp(8px, 0.625vw + 6px, 10px);
      width: clamp(8px, 0.625vw + 6px, 10px);
    }
    .theme-text {
      display: none; /* collapse to just the blip on mobile */
    }

    /*
     * The footer statusline was the other thing overflowing on a phone — it ran
     * `v2026.7_` off the right edge, which put a horizontal scrollbar on the
     * whole document and left blank space beside the sticky header. Give the
     * path its own line and let the rest sit on a second one; nothing is lost.
     */
    .statusline {
      flex-wrap: wrap;
      gap: clamp(10px, 3.125vw, 20px);
      font-size: clamp(10.5px, 0.3125vw + 9.5px, 11.5px);
    }
    .sl-path {
      flex: 1 0 100%;
    }
    .sl-spacer {
      display: none; /* the wrap does the separating now */
    }
  }

  @media (max-width: 400px) {
    .nav-link .slash {
      display: none;
    }
  }
</style>
