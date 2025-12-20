<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { exchangeCodeForKey } from '$lib/auth/openrouter';
  import { authStore } from '$lib/auth/state.svelte';

  let { data } = $props();

  let status = $state<'loading' | 'success' | 'error'>('loading');
  let errorMessage = $state<string>('');

  onMount(async () => {
    // Check for error from OpenRouter
    if (data.error) {
      status = 'error';
      errorMessage = data.error;
      return;
    }

    // Check for authorization code
    if (!data.code) {
      status = 'error';
      errorMessage = 'No authorization code received';
      return;
    }

    // Exchange code for API key
    try {
      const result = await exchangeCodeForKey(data.code);
      authStore.login(result.apiKey, result.user);
      status = 'success';

      // Redirect to LLM landing page after brief delay
      setTimeout(() => {
        goto(resolve('/llm'));
      }, 1500);
    } catch (err) {
      status = 'error';
      errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    }
  });
</script>

<div class="flex min-h-[50vh] items-center justify-center">
  <div class="variant-filled-surface max-w-md space-y-4 card p-8 text-center">
    {#if status === 'loading'}
      <div class="space-y-4">
        <div
          class="mx-auto size-12 animate-spin rounded-full border-4 border-surface-200-800 border-t-primary-500"
        ></div>
        <h1 class="h2 text-surface-950-50">Completing login...</h1>
        <p class="text-surface-600-400">Please wait while we exchange your authorization code.</p>
      </div>
    {:else if status === 'success'}
      <div class="space-y-4">
        <div class="mx-auto size-12 rounded-full bg-success-500/20 p-3">
          <svg
            class="size-full text-success-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"
            ></path>
          </svg>
        </div>
        <h1 class="h2 text-surface-950-50">Connected successfully!</h1>
        <p class="text-surface-600-400">Taking you to your AI toys...</p>
      </div>
    {:else if status === 'error'}
      <div class="space-y-4">
        <div class="mx-auto size-12 rounded-full bg-error-500/20 p-3">
          <svg
            class="size-full text-error-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
        </div>
        <h1 class="h2 text-surface-950-50">Login failed</h1>
        <p class="text-error-500">{errorMessage}</p>
        <a href={resolve('/')} class="preset-filled-primary btn">Return to home</a>
      </div>
    {/if}
  </div>
</div>
