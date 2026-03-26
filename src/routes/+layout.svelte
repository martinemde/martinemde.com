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
<div class="min-h-screen bg-surface-50-950 text-surface-950-50">
  <!-- Header -->
  <header class="py-8">
    <div class="mx-auto max-w-2xl px-6">
      <div class="flex items-baseline justify-between">
        <a href={resolve('/')} class="font-serif text-xl font-bold tracking-tight text-primary-500"
          >Martin Emde</a
        >
        <nav class="nav-editorial flex items-center gap-6">
          <a
            href={resolve('/blog')}
            class="text-surface-600-400 transition-colors hover:text-primary-500">Blog</a
          >
          <a
            href={resolve('/projects')}
            class="text-surface-600-400 transition-colors hover:text-primary-500">Projects</a
          >
          <a
            href={resolve('/about')}
            class="text-surface-600-400 transition-colors hover:text-primary-500">About</a
          >
        </nav>
      </div>
    </div>
  </header>
  <!-- Main Content -->
  <main class="mx-auto max-w-2xl px-6 py-12">
    {@render children()}
  </main>
  <!-- Footer -->
  <footer class="py-12">
    <div class="meta-editorial mx-auto max-w-2xl px-6 text-center text-surface-500">
      <p>&copy; 2025 Martin Emde</p>
    </div>
  </footer>
</div>
