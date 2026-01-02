<script lang="ts">
  import { page } from '$app/state';
  import { resolve } from '$app/paths';

  const status = $derived(page.status);
  const message = $derived(page.error?.message || 'An error occurred');
</script>

<div class="flex flex-col items-center justify-center space-y-6 py-12 text-center">
  <div class="space-y-2">
    <h1 class="text-6xl font-bold text-primary-500">{status}</h1>
    <h2 class="preset-typo-h2">
      {#if status === 404}
        Page Not Found
      {:else if status >= 500}
        Server Error
      {:else}
        Error
      {/if}
    </h2>
  </div>

  <p class="max-w-md text-surface-600-400">
    {#if status === 404}
      The page you're looking for doesn't exist or may have moved.
    {:else}
      {message}
    {/if}
  </p>

  <div class="flex gap-4">
    <a href={resolve('/')} class="btn preset-filled-primary-500"> Go Home </a>
    <a href={resolve('/blog')} class="btn preset-filled-secondary-500"> View Blog </a>
  </div>
</div>
