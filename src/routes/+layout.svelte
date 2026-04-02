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
<div class="top-glow min-h-screen bg-surface-50-950 text-surface-950-50">
  <!-- Header -->
  <header class="relative z-10">
    <div class="mx-auto max-w-3xl px-6">
      <div class="flex items-center justify-between py-8">
        <a href={resolve('/')} class="site-name nav-link text-xl font-bold">Martin Emde</a>
        <nav class="font-mono-ui flex items-center gap-1 text-sm text-surface-600-400">
          <a href={resolve('/blog')} class="nav-link px-2 py-1 lowercase">blog</a>
          <span class="opacity-40 select-none">&middot;</span>
          <a href={resolve('/projects')} class="nav-link px-2 py-1 lowercase">projects</a>
          <span class="opacity-40 select-none">&middot;</span>
          <a href={resolve('/about')} class="nav-link px-2 py-1 lowercase">about</a>
        </nav>
      </div>
    </div>
  </header>
  <!-- Main Content -->
  <main class="relative z-10 mx-auto max-w-3xl px-6 py-12">
    {@render children()}
  </main>
  <!-- Footer -->
  <footer class="relative z-10 py-12">
    <div class="mx-auto max-w-3xl px-6">
      <div class="flex items-end justify-between">
        <p class="text-sm text-surface-600-400">
          &copy; {new Date().getFullYear()} Martin Emde
        </p>
        <span class="signoff">:wq</span>
      </div>
    </div>
  </footer>
</div>
