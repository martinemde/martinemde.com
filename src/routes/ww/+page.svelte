<script lang="ts">
  import { ClipboardPaste, ExternalLink, Copy, CopyCheck, X } from 'lucide-svelte';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';

  let input = $state('');
  let error = $state('');
  let copied = $state(false);

  // Clean a word-wrapped URL: strip whitespace, terminal box-drawing glyphs,
  // zero-width characters, and leading quote prefixes like "> " that terminals
  // and chat apps love to inject.
  function cleanUrl(raw: string): string {
    return (
      raw
        // Box drawing (U+2500–U+257F) and block elements (U+2580–U+259F)
        .replace(/[\u2500-\u259F]/g, '')
        // Zero-width / BOM
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        // All whitespace (spaces, tabs, newlines)
        .replace(/\s+/g, '')
        // Leading quote markers left over from email / markdown quoting
        .replace(/^[>|]+/, '')
    );
  }

  let cleaned = $derived(cleanUrl(input));

  // Only allow http(s) URLs — refuse javascript:, data:, etc.
  function parseSafeUrl(value: string): URL | null {
    if (!value) return null;
    try {
      const url = new URL(value);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
      return url;
    } catch {
      return null;
    }
  }

  let safeUrl = $derived(parseSafeUrl(cleaned));

  async function readClipboard(): Promise<string | null> {
    try {
      if (!navigator.clipboard?.readText) {
        error = 'Clipboard access is unavailable. Paste into the box instead.';
        return null;
      }
      const text = await navigator.clipboard.readText();
      return text;
    } catch {
      error = 'Could not read clipboard. Paste into the box instead.';
      return null;
    }
  }

  async function handlePaste() {
    error = '';
    const text = await readClipboard();
    if (text === null) return;
    input = text;
  }

  async function handlePasteAndGo() {
    error = '';
    const text = await readClipboard();
    if (text === null) return;
    input = text;
    const url = parseSafeUrl(cleanUrl(text));
    if (!url) {
      error = "That doesn't look like a valid http(s) URL.";
      return;
    }
    window.location.href = url.toString();
  }

  function handleGo() {
    error = '';
    if (!safeUrl) {
      error = "That doesn't look like a valid http(s) URL.";
      return;
    }
    window.location.href = safeUrl.toString();
  }

  async function handleCopy() {
    if (!cleaned) return;
    try {
      await navigator.clipboard.writeText(cleaned);
      copied = true;
      setTimeout(() => (copied = false), 1500);
    } catch {
      error = 'Could not copy to clipboard.';
    }
  }

  function handleClear() {
    input = '';
    error = '';
  }
</script>

<svelte:head>
  <title>Fix a word-wrapped URL - Martin Emde</title>
  <meta
    name="description"
    content="Paste a URL that got mangled by line wrapping and get it back as a single, clickable link."
  />
</svelte:head>

<div>
  <Breadcrumbs crumbs={[{ label: 'Home', href: '/' }, { label: 'Unwrap URL' }]} />

  <div class="mx-auto max-w-xl">
    <h1 class="mb-2 text-2xl font-bold sm:text-3xl">Fix a word-wrapped URL and go</h1>
    <p class="mb-6 text-sm text-surface-600-400">
      Paste a URL that got broken across lines. We'll strip the newlines, spaces, and any terminal
      frame characters, then send you on your way.
    </p>

    <div class="flex flex-col gap-3">
      <div class="flex gap-2">
        <button
          type="button"
          onclick={handlePaste}
          class="btn inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-surface-300-700 bg-surface-50-950 px-4 py-3 text-sm font-medium hover:bg-surface-100-900"
        >
          <ClipboardPaste size={18} />
          Paste
        </button>
        <button
          type="button"
          onclick={handlePasteAndGo}
          class="btn inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-500 px-4 py-3 text-sm font-medium text-white hover:bg-primary-600"
        >
          <ExternalLink size={18} />
          Paste &amp; go
        </button>
      </div>

      <div class="relative">
        <textarea
          bind:value={input}
          rows="6"
          placeholder="…or paste the broken URL here"
          spellcheck="false"
          autocapitalize="off"
          class="w-full resize-y rounded-lg border border-surface-200-800 bg-surface-50-950 px-3 py-2 font-mono text-sm break-all text-surface-950-50 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none"
        ></textarea>
        {#if input}
          <button
            type="button"
            onclick={handleClear}
            aria-label="Clear"
            class="absolute top-2 right-2 rounded p-1 text-surface-600-400 hover:bg-surface-200-800"
          >
            <X size={16} />
          </button>
        {/if}
      </div>

      {#if error}
        <p class="text-sm text-error-500">{error}</p>
      {/if}

      {#if cleaned}
        <div class="rounded-lg border border-surface-200-800 bg-surface-100-900 p-3">
          <div class="mb-2 text-xs font-medium tracking-wide text-surface-600-400 uppercase">
            {safeUrl ? 'Cleaned URL' : 'Cleaned (not a valid http URL)'}
          </div>
          <div class="mb-3 font-mono text-sm break-all">
            {#if safeUrl}
              <a href={safeUrl.toString()} class="anchor" rel="external noopener noreferrer"
                >{cleaned}</a
              >
            {:else}
              <span class="text-surface-700-300">{cleaned}</span>
            {/if}
          </div>
          <div class="flex gap-2">
            <button
              type="button"
              onclick={handleCopy}
              class="btn inline-flex items-center gap-2 rounded-lg border border-surface-300-700 px-3 py-2 text-sm hover:bg-surface-200-800"
            >
              {#if copied}
                <CopyCheck size={16} class="text-tertiary-500" />
                Copied
              {:else}
                <Copy size={16} />
                Copy
              {/if}
            </button>
            <button
              type="button"
              onclick={handleGo}
              disabled={!safeUrl}
              class="btn inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-500 px-3 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
            >
              <ExternalLink size={16} />
              Go
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>
