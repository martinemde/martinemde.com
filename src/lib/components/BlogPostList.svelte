<script lang="ts">
  import { FileText, FilePenLine } from 'lucide-svelte';
  import { browser } from '$app/environment';

  interface BlogPostFileInfo {
    filename: string;
    path: string;
    slug: string;
    date: string;
  }

  interface Props {
    onSelectPost: (path: string, isDraft: boolean) => void;
    currentPath?: string;
    hasDraft?: boolean;
  }

  let { onSelectPost, currentPath = '', hasDraft = false }: Props = $props();

  let posts = $state<BlogPostFileInfo[]>([]);
  let loading = $state(true);
  let error = $state('');

  // Load posts from API
  async function loadPosts() {
    try {
      loading = true;
      error = '';
      const response = await fetch('/api/posts');

      if (!response.ok) {
        throw new Error('Failed to load posts');
      }

      posts = await response.json();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load posts';
      console.error('Error loading posts:', err);
    } finally {
      loading = false;
    }
  }

  // Load posts when component mounts
  $effect(() => {
    if (browser) {
      loadPosts();
    }
  });

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
</script>

<div class="flex h-full flex-col">
  <div class="mb-4 flex items-center justify-between">
    <h2 class="text-surface-900-50 text-lg font-semibold">Blog Posts</h2>
    <button
      onclick={() => loadPosts()}
      disabled={loading}
      class="text-sm text-surface-600-400 hover:text-surface-700-300 disabled:opacity-50"
    >
      {loading ? 'Loading...' : 'Refresh'}
    </button>
  </div>

  {#if error}
    <div class="text-error-900-50 mb-4 rounded-lg bg-error-50-950 p-3 text-sm">
      {error}
    </div>
  {/if}

  <div class="flex-1 space-y-2 overflow-y-auto">
    <!-- Draft post (if exists) -->
    {#if hasDraft}
      <button
        onclick={() => onSelectPost('', true)}
        class="flex w-full items-start gap-3 rounded-lg border-2 border-primary-300-700 bg-primary-50-950 p-3 text-left transition-colors hover:bg-primary-100-900 {currentPath ===
        ''
          ? 'ring-2 ring-primary-500'
          : ''}"
      >
        <FilePenLine class="mt-0.5 h-5 w-5 flex-shrink-0 text-primary-600-400" />
        <div class="min-w-0 flex-1">
          <div class="text-primary-900-50 font-medium">Unsaved Draft</div>
          <div class="mt-1 text-sm text-primary-700-300">Click to continue editing</div>
        </div>
      </button>
    {/if}

    <!-- Existing posts -->
    {#if loading}
      <div class="py-8 text-center text-sm text-surface-600-400">Loading posts...</div>
    {:else if posts.length === 0}
      <div class="py-8 text-center text-sm text-surface-600-400">No blog posts found</div>
    {:else}
      {#each posts as post}
        <button
          onclick={() => onSelectPost(post.path, false)}
          class="flex w-full items-start gap-3 rounded-lg border border-surface-200-800 bg-surface-50-950 p-3 text-left transition-colors hover:bg-surface-100-900 {currentPath ===
          post.path
            ? 'ring-2 ring-primary-500'
            : ''}"
        >
          <FileText class="mt-0.5 h-5 w-5 flex-shrink-0 text-surface-600-400" />
          <div class="min-w-0 flex-1">
            <div class="text-surface-900-50 font-medium">{post.slug}</div>
            <div class="mt-1 text-sm text-surface-600-400">{formatDate(post.date)}</div>
          </div>
        </button>
      {/each}
    {/if}
  </div>
</div>
