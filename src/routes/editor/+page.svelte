<script lang="ts">
  import type { PageServerData } from './$types';
  import { Upload } from 'lucide-svelte';

  let { data }: { data: PageServerData } = $props();

  // Form state
  let title = $state('');
  let content = $state('');
  let slug = $state('');
  let description = $state('');
  let categories = $state('');
  let autoSlug = $state(true);

  // UI state
  let submitting = $state(false);
  let error = $state('');
  let success = $state('');
  let uploadingImage = $state(false);

  // Preview state
  let activeTab: 'edit' | 'preview' = $state('edit');
  let previewHtml = $state('');
  let previewLoading = $state(false);

  // Auto-generate slug from title
  $effect(() => {
    if (autoSlug && title) {
      slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    error = '';
    success = '';
    submitting = true;

    try {
      const response = await fetch('/micropub', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: ['h-entry'],
          properties: {
            name: [title],
            content: [content],
            slug: [slug],
            description: description ? [description] : undefined,
            category: categories ? categories.split(',').map((c) => c.trim()) : undefined,
            published: [new Date().toISOString()]
          }
        })
      });

      if (response.ok) {
        const location = response.headers.get('Location');
        success = `Post created successfully! View at: ${location}`;
        // Reset form
        title = '';
        content = '';
        slug = '';
        description = '';
        categories = '';
      } else {
        const errorText = await response.text();
        error = `Failed to create post: ${errorText}`;
      }
    } catch (err) {
      error = `Error: ${err instanceof Error ? err.message : 'Unknown error'}`;
    } finally {
      submitting = false;
    }
  }

  async function handleImageUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    uploadingImage = true;
    error = '';

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/micropub/media', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const imageUrl = response.headers.get('Location');
        if (imageUrl) {
          // Insert markdown image syntax at cursor or end
          const imageMd = `![${file.name}](${imageUrl})`;
          content = content ? `${content}\n\n${imageMd}` : imageMd;
        }
      } else {
        const errorText = await response.text();
        error = `Failed to upload image: ${errorText}`;
      }
    } catch (err) {
      error = `Error uploading image: ${err instanceof Error ? err.message : 'Unknown error'}`;
    } finally {
      uploadingImage = false;
      // Reset input
      input.value = '';
    }
  }

  async function updatePreview() {
    if (!content) {
      previewHtml = '<p class="text-surface-600-400">Start writing to see preview...</p>';
      return;
    }

    previewLoading = true;

    try {
      const response = await fetch('/api/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ markdown: content })
      });

      if (response.ok) {
        const data = await response.json();
        previewHtml = data.html;
      } else {
        previewHtml = '<p class="text-error-500">Failed to render preview</p>';
      }
    } catch (err) {
      previewHtml = '<p class="text-error-500">Error rendering preview</p>';
    } finally {
      previewLoading = false;
    }
  }

  // Update preview when switching to preview tab
  $effect(() => {
    if (activeTab === 'preview') {
      updatePreview();
    }
  });
</script>

<svelte:head>
  <title>Blog Editor - Martin Emde</title>
</svelte:head>

<div class="mx-auto max-w-4xl">
  <div class="mb-8 flex items-center justify-between">
    <h1 class="preset-typo-display-1">Blog Editor</h1>
    <div class="flex items-center gap-4">
      <span class="text-sm text-surface-600-400">
        Logged in as {data.user.login}
      </span>
      <a href="/auth/logout" class="anchor text-sm">Logout</a>
    </div>
  </div>

  {#if error}
    <div class="mb-4 rounded-lg bg-error-50-950 p-4 text-error-900-50">
      {error}
    </div>
  {/if}

  {#if success}
    <div class="mb-4 rounded-lg bg-success-50-950 p-4 text-success-900-50">
      {success}
    </div>
  {/if}

  <form onsubmit={handleSubmit} class="space-y-6">
    <div>
      <label for="title" class="mb-2 block text-sm font-medium text-surface-700-300">
        Title <span class="text-error-500">*</span>
      </label>
      <input
        type="text"
        id="title"
        bind:value={title}
        required
        class="w-full rounded-lg border border-surface-200-800 bg-surface-50-950 px-4 py-2 text-surface-950-50 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
    </div>

    <div>
      <label for="slug" class="mb-2 block text-sm font-medium text-surface-700-300">
        Slug <span class="text-error-500">*</span>
      </label>
      <div class="flex items-center gap-2">
        <input
          type="text"
          id="slug"
          bind:value={slug}
          required
          disabled={autoSlug}
          class="flex-1 rounded-lg border border-surface-200-800 bg-surface-50-950 px-4 py-2 text-surface-950-50 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
        />
        <label class="flex items-center gap-2 text-sm text-surface-700-300">
          <input type="checkbox" bind:checked={autoSlug} class="rounded" />
          Auto-generate
        </label>
      </div>
    </div>

    <div>
      <label for="description" class="mb-2 block text-sm font-medium text-surface-700-300">
        Description
      </label>
      <input
        type="text"
        id="description"
        bind:value={description}
        placeholder="Short preview description"
        class="w-full rounded-lg border border-surface-200-800 bg-surface-50-950 px-4 py-2 text-surface-950-50 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
    </div>

    <div>
      <label for="categories" class="mb-2 block text-sm font-medium text-surface-700-300">
        Categories
      </label>
      <input
        type="text"
        id="categories"
        bind:value={categories}
        placeholder="Comma-separated (e.g., ruby, rails, web)"
        class="w-full rounded-lg border border-surface-200-800 bg-surface-50-950 px-4 py-2 text-surface-950-50 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
    </div>

    <div>
      <div class="mb-2 flex items-center justify-between">
        <label for="content" class="text-sm font-medium text-surface-700-300">
          Content (Markdown) <span class="text-error-500">*</span>
        </label>
        <label class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-surface-200-800 bg-surface-50-950 px-3 py-1 text-sm text-surface-700-300 hover:bg-surface-100-900">
          <Upload class="h-4 w-4" />
          {uploadingImage ? 'Uploading...' : 'Upload Image'}
          <input
            type="file"
            accept="image/*"
            onchange={handleImageUpload}
            disabled={uploadingImage}
            class="hidden"
          />
        </label>
      </div>

      <!-- Tabs -->
      <div class="mb-2 flex gap-2 border-b border-surface-200-800">
        <button
          type="button"
          onclick={() => (activeTab = 'edit')}
          class="px-4 py-2 text-sm {activeTab === 'edit'
            ? 'border-b-2 border-primary-500 text-primary-500'
            : 'text-surface-600-400 hover:text-surface-700-300'}"
        >
          Edit
        </button>
        <button
          type="button"
          onclick={() => (activeTab = 'preview')}
          class="px-4 py-2 text-sm {activeTab === 'preview'
            ? 'border-b-2 border-primary-500 text-primary-500'
            : 'text-surface-600-400 hover:text-surface-700-300'}"
        >
          Preview {previewLoading ? '(loading...)' : ''}
        </button>
      </div>

      <!-- Edit mode -->
      {#if activeTab === 'edit'}
        <textarea
          id="content"
          bind:value={content}
          required
          rows="20"
          class="w-full rounded-lg border border-surface-200-800 bg-surface-50-950 px-4 py-2 font-mono text-sm text-surface-950-50 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
        ></textarea>
      {/if}

      <!-- Preview mode -->
      {#if activeTab === 'preview'}
        <div
          class="prose prose-sm dark:prose-invert min-h-[500px] w-full rounded-lg border border-surface-200-800 bg-surface-50-950 p-4"
        >
          {@html previewHtml}
        </div>
      {/if}
    </div>

    <div class="flex justify-end gap-4">
      <a
        href="/"
        class="rounded-lg border border-surface-200-800 px-6 py-2 text-surface-700-300 hover:bg-surface-100-900"
      >
        Cancel
      </a>
      <button
        type="submit"
        disabled={submitting}
        class="rounded-lg bg-primary-500 px-6 py-2 text-white hover:bg-primary-600 disabled:opacity-50"
      >
        {submitting ? 'Creating...' : 'Create Post'}
      </button>
    </div>
  </form>
</div>
