<script lang="ts">
  import { onMount } from 'svelte';
  import { LogOut, User, Sparkles } from 'lucide-svelte';
  import { resolve } from '$app/paths';
  import { authStore } from '$lib/auth/state.svelte';

  const { state, isLoggedIn } = authStore;

  // Load auth state from localStorage on component mount
  onMount(() => {
    authStore.loadFromStorage();
  });

  function handleLogout() {
    authStore.logout();
  }
</script>

{#if isLoggedIn}
  <div class="flex items-center gap-3">
    {#if state.user}
      <div class="flex items-center gap-2">
        <User class="size-4 text-surface-600-400" />
        <span class="text-sm text-surface-600-400">{state.user.name || state.user.email}</span>
      </div>
    {/if}
    <button
      onclick={handleLogout}
      class="inline-flex items-center gap-2 rounded-lg border border-surface-300-700 px-3 py-1.5 text-sm transition-colors hover:bg-surface-100-900"
      aria-label="Log out"
    >
      <LogOut class="size-4" />
      <span>Logout</span>
    </button>
  </div>
{:else}
  <a
    href={resolve('/llm')}
    class="inline-flex items-center gap-2 rounded-lg border border-tertiary-300-700 px-3 py-1.5 text-sm transition-colors hover:bg-tertiary-100-900"
  >
    <Sparkles class="size-4" />
    <span class="sr-only sm:not-sr-only sm:inline">Connect an LLM</span>
  </a>
{/if}
