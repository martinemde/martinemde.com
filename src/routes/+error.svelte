<script lang="ts">
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import { onMount } from 'svelte';
  import { Sparkles, Home, ArrowLeft } from 'lucide-svelte';
  import { authStore } from '$lib/auth/state.svelte';

  const { state: authState, isLoggedIn } = authStore;

  let limerick = $state('');
  let loading = $state(false);
  let error = $state('');

  // Load auth state on mount
  onMount(() => {
    authStore.loadFromStorage();

    // If logged in, generate limerick
    if (authStore.isLoggedIn && page.status === 404) {
      generateLimerick();
    }
  });

  async function generateLimerick() {
    if (!authState.apiKey) {
      error = 'No API key found. Please log in again.';
      return;
    }

    loading = true;
    error = '';
    limerick = '';

    const missingUrl = page.url.pathname;
    const prompt = `Write a humorous limerick about trying to find a web page at the URL "${missingUrl}" but getting a 404 error (page not found). Be creative and funny. Only output the limerick, nothing else.`;

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authState.apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Martin Emde - 404 Limerick Generator'
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.2-3b-instruct:free',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 200,
          temperature: 0.9
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      limerick = data.choices[0]?.message?.content || 'Failed to generate limerick';
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to generate limerick';
      console.error('Error generating limerick:', err);
    } finally {
      loading = false;
    }
  }
</script>

<div class="flex min-h-[60vh] flex-col items-center justify-center text-center">
  <div class="mb-8">
    <h1 class="mb-4 text-9xl font-bold text-primary-500">
      {page.status || 404}
    </h1>
    <h2 class="preset-typo-display mb-2">
      {page.error?.message || 'Page Not Found'}
    </h2>
    <p class="text-surface-600-400">The page you're looking for doesn't exist.</p>
  </div>

  {#if page.status === 404}
    {#if !isLoggedIn}
      <!-- Not logged in: Show login prompt -->
      <div class="mb-8 max-w-md rounded-lg border border-tertiary-300-700 bg-surface-100-900 p-6">
        <div class="mb-4 flex justify-center">
          <Sparkles class="size-12 text-tertiary-500" />
        </div>
        <h3 class="mb-2 text-lg font-semibold">Want something more entertaining?</h3>
        <p class="mb-4 text-sm text-surface-600-400">
          Connect your LLM to get a personalized limerick about this missing page!
        </p>
        <a
          href={resolve('/llm')}
          class="inline-flex items-center gap-2 rounded-lg bg-tertiary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-tertiary-600"
        >
          <Sparkles class="size-4" />
          <span>Connect an LLM</span>
        </a>
      </div>
    {:else}
      <!-- Logged in: Show limerick -->
      <div class="mb-8 max-w-2xl rounded-lg border border-primary-300-700 bg-surface-100-900 p-6">
        {#if loading}
          <div class="flex items-center justify-center gap-3">
            <div
              class="size-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"
            ></div>
            <p class="text-surface-600-400">Composing a limerick about your missing page...</p>
          </div>
        {:else if error}
          <div class="text-error-500">
            <p class="font-semibold">Oops!</p>
            <p class="text-sm">{error}</p>
          </div>
        {:else if limerick}
          <div>
            <div class="mb-3 flex justify-center">
              <Sparkles class="size-8 text-primary-500" />
            </div>
            <h3 class="mb-3 text-lg font-semibold">A Limerick for Your 404</h3>
            <pre
              class="font-serif text-base leading-relaxed whitespace-pre-wrap italic">{limerick}</pre>
          </div>
        {/if}
      </div>
    {/if}
  {/if}

  <!-- Navigation buttons -->
  <div class="flex gap-4">
    <button
      onclick={() => window.history.back()}
      class="inline-flex items-center gap-2 rounded-lg border border-surface-300-700 px-4 py-2 transition-colors hover:bg-surface-100-900"
    >
      <ArrowLeft class="size-4" />
      <span>Go Back</span>
    </button>
    <a
      href={resolve('/')}
      class="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-white transition-colors hover:bg-primary-600"
    >
      <Home class="size-4" />
      <span>Go Home</span>
    </a>
  </div>
</div>
