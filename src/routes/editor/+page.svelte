<script lang="ts">
  import remarkHtml from 'remark-html';
  import remarkParse from 'remark-parse';
  import matter from 'gray-matter';
  import type { PageData } from './$types';
  import { Upload, Save } from 'lucide-svelte';
  import { resolve } from '$app/paths';
  import { unified } from 'unified';
  import { browser } from '$app/environment';
  import BlogPostList from '$lib/components/BlogPostList.svelte';

  let { data }: { data: PageData } = $props();

  const STORAGE_KEY = 'blog-editor-draft';

  interface EditorDraft {
    title: string;
    content: string;
    slug: string;
    description: string;
    categories: string;
    published: boolean;
    autoSlug: boolean;
    savedAt: string;
    currentPath: string;
  }

  // Form state
  let title = $state('');
  let content = $state('');
  let slug = $state('');
  let description = $state('');
  let categories = $state('');
  let published = $state(false);
  let autoSlug = $state(true);
  let currentPath = $state(''); // Empty string means new post, otherwise path to existing post

  // UI state
  let submitting = $state(false);
  let error = $state('');
  let success = $state('');
  let uploadingImage = $state(false);

  // Auto-save state
  let saveStatus: 'idle' | 'saving' | 'saved' = $state('idle');
  let lastSaved = $state<Date | null>(null);

  // Preview state
  let activeTab: 'edit' | 'preview' = $state('edit');
  let previewHtml = $state('');
  let previewLoading = $state(false);

  // Load draft from localStorage on mount
  $effect(() => {
    if (!browser) return;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const draft: EditorDraft = JSON.parse(saved);
        title = draft.title;
        content = draft.content;
        slug = draft.slug;
        description = draft.description;
        categories = draft.categories;
        published = draft.published ?? false;
        autoSlug = draft.autoSlug;
        currentPath = draft.currentPath || '';
        lastSaved = new Date(draft.savedAt);
        saveStatus = 'saved';
      }
    } catch (err) {
      console.error('Failed to load draft:', err);
    }
  });

  // Auto-generate slug from title
  $effect(() => {
    if (autoSlug && title) {
      slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
  });

  // Debounced auto-save to localStorage
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;

  function saveDraft() {
    if (!browser) return;

    saveStatus = 'saving';

    try {
      const draft: EditorDraft = {
        title,
        content,
        slug,
        description,
        categories,
        published,
        autoSlug,
        currentPath,
        savedAt: new Date().toISOString()
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      lastSaved = new Date();
      saveStatus = 'saved';
    } catch (err) {
      console.error('Failed to save draft:', err);
      saveStatus = 'idle';
    }
  }

  function clearDraft() {
    if (!browser) return;

    try {
      localStorage.removeItem(STORAGE_KEY);
      lastSaved = null;
      saveStatus = 'idle';
    } catch (err) {
      console.error('Failed to clear draft:', err);
    }
  }

  function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 10) return 'just now';
    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes === 1) return '1 minute ago';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours === 1) return '1 hour ago';
    if (diffInHours < 24) return `${diffInHours} hours ago`;

    return date.toLocaleDateString();
  }

  // Check if current form has unsaved changes
  function hasUnsavedChanges(): boolean {
    if (!browser) return false;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return !!(title || content || description || categories);

      const draft: EditorDraft = JSON.parse(saved);

      // Compare current state with saved draft
      return (
        title !== draft.title ||
        content !== draft.content ||
        slug !== draft.slug ||
        description !== draft.description ||
        categories !== draft.categories ||
        published !== draft.published ||
        currentPath !== draft.currentPath
      );
    } catch {
      return false;
    }
  }

  // Load a blog post from the API
  async function loadPost(path: string) {
    if (!path) {
      // Load draft from localStorage (already loaded on mount)
      return;
    }

    try {
      error = '';
      const response = await fetch(`/api/posts/read?path=${encodeURIComponent(path)}`);

      if (!response.ok) {
        throw new Error('Failed to load post');
      }

      const { content: rawContent } = await response.json();

      // Parse frontmatter
      const { data: frontmatter, content: postContent } = matter(rawContent);

      // Populate form
      title = frontmatter.title || '';
      slug = frontmatter.slug || '';
      description = frontmatter.description || '';
      published = frontmatter.published ?? false;
      categories = frontmatter.categories?.join(', ') || '';
      content = postContent;
      currentPath = path;
      autoSlug = false; // Don't auto-generate slug for existing posts

      // Clear draft from localStorage since we're loading an existing post
      clearDraft();
    } catch (err) {
      error = `Failed to load post: ${err instanceof Error ? err.message : 'Unknown error'}`;
      console.error('Error loading post:', err);
    }
  }

  // Handle selecting a post from the list
  async function handleSelectPost(path: string, isDraft: boolean) {
    // If selecting draft, just reload from localStorage (already loaded)
    if (isDraft) {
      return;
    }

    // Check if there are unsaved changes
    if (hasUnsavedChanges()) {
      const confirmed = confirm(
        'You have unsaved changes in your draft. Loading a different post will discard these changes. Continue?'
      );
      if (!confirmed) {
        return;
      }
    }

    await loadPost(path);
  }

  // Auto-save when form fields change (debounced 1 second)
  $effect(() => {
    // Watch all form fields
    const _ = [title, content, slug, description, categories, published, autoSlug];

    // Only auto-save if there's actual content
    if (!title && !content && !description && !categories) return;

    // Clear existing timeout
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    // Set new timeout
    saveTimeout = setTimeout(() => {
      saveDraft();
    }, 1000);

    // Cleanup on effect re-run or unmount
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    error = '';
    success = '';
    submitting = true;

    try {
      // Determine the date to use
      let postDate: string;
      if (currentPath) {
        // Extract date from filename for existing posts
        const filename = currentPath.split('/').pop()!;
        const match = filename.match(/^(\d{4}-\d{2}-\d{2})-/);
        postDate = match ? match[1] : new Date().toISOString().split('T')[0];
      } else {
        // New post - use current date
        postDate = new Date().toISOString().split('T')[0];
      }

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
            published: [postDate],
            'post-status': [published ? 'published' : 'draft']
          }
        })
      });

      if (response.ok) {
        const location = response.headers.get('Location');
        success = currentPath
          ? `Post updated successfully! View at: ${location}`
          : `Post created successfully! View at: ${location}`;
        // Clear draft from localStorage
        clearDraft();
        // Update currentPath if this was a new post
        if (!currentPath) {
          // Extract path from location or construct it
          const datePrefix = postDate;
          currentPath = `src/content/blog/${datePrefix}-${slug}.md`;
        }
      } else {
        const errorText = await response.text();
        error = `Failed to ${currentPath ? 'update' : 'create'} post: ${errorText}`;
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
      // Render markdown directly in the browser
      const result = await unified().use(remarkParse).use(remarkHtml).process(content);
      previewHtml = String(result);
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

<div class="mx-auto max-w-7xl px-4 py-6">
  <!-- Header -->
  <div class="mb-6 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <h1 class="text-surface-900-50 text-2xl font-bold">Blog Editor</h1>
      {#if saveStatus === 'saving'}
        <span class="flex items-center gap-1.5 text-sm text-surface-600-400">
          <Save class="h-3.5 w-3.5 animate-pulse" />
          Saving...
        </span>
      {:else if saveStatus === 'saved' && lastSaved}
        <span class="flex items-center gap-1.5 text-sm text-surface-600-400">
          <Save class="h-3.5 w-3.5" />
          Saved {formatRelativeTime(lastSaved)}
        </span>
      {/if}
    </div>
    <div class="flex items-center gap-4">
      {#if data.isAuthenticated && data.user}
        <div class="hidden items-center gap-3 sm:flex">
          <img
            src={data.user.avatar_url}
            alt={data.user.name || data.user.login}
            class="size-8 rounded-full"
          />
          <span class="text-sm text-surface-700-300">
            {data.user.name || data.user.login}
          </span>
        </div>
        <a
          data-sveltekit-reload
          href={resolve('/auth/github/logout')}
          class="rounded-lg border border-surface-200-800 px-4 py-2 text-sm hover:bg-surface-100-900"
        >
          Logout
        </a>
      {:else}
        <a
          data-sveltekit-reload
          href={resolve('/auth/github/login')}
          class="rounded-lg border border-primary-300-700 bg-primary-500 px-4 py-2 text-sm text-white hover:bg-primary-600"
        >
          Login with GitHub
        </a>
      {/if}
    </div>
  </div>

  <!-- Mobile-first two-column layout -->
  <div class="grid gap-6 {data.isAuthenticated ? 'lg:grid-cols-[320px_1fr]' : ''}">
    <!-- Left sidebar: Post list (only when authenticated) -->
    {#if data.isAuthenticated}
      <aside
        class="h-[400px] overflow-hidden rounded-lg border border-surface-200-800 bg-surface-50-950 p-4 lg:h-[calc(100vh-12rem)]"
      >
        <BlogPostList
          onSelectPost={handleSelectPost}
          {currentPath}
          hasDraft={!!localStorage.getItem?.(STORAGE_KEY) && browser}
        />
      </aside>
    {/if}

    <!-- Right main content: Editor form -->
    <main>
      {#if error}
        <div class="text-error-900-50 mb-4 rounded-lg bg-error-50-950 p-4">
          {error}
        </div>
      {/if}

      {#if success}
        <div class="text-success-900-50 mb-4 rounded-lg bg-success-50-950 p-4">
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
            class="w-full rounded-lg border border-surface-200-800 bg-surface-50-950 px-4 py-2 text-surface-950-50 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none"
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
              class="flex-1 rounded-lg border border-surface-200-800 bg-surface-50-950 px-4 py-2 text-surface-950-50 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none disabled:opacity-50"
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
            class="w-full rounded-lg border border-surface-200-800 bg-surface-50-950 px-4 py-2 text-surface-950-50 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none"
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
            class="w-full rounded-lg border border-surface-200-800 bg-surface-50-950 px-4 py-2 text-surface-950-50 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none"
          />
        </div>

        <div>
          <label class="flex items-center gap-2 text-sm font-medium text-surface-700-300">
            <input
              type="checkbox"
              bind:checked={published}
              class="rounded border-surface-200-800 text-primary-500 focus:ring-2 focus:ring-primary-500"
            />
            Published (uncheck to save as draft)
          </label>
        </div>

        <div>
          <div class="mb-2 flex items-center justify-between">
            <label for="content" class="text-sm font-medium text-surface-700-300">
              Content (Markdown) <span class="text-error-500">*</span>
            </label>
            <label
              class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-surface-200-800 bg-surface-50-950 px-3 py-1 text-sm text-surface-700-300 hover:bg-surface-100-900"
            >
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
              class="w-full rounded-lg border border-surface-200-800 bg-surface-50-950 px-4 py-2 font-mono text-sm text-surface-950-50 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none"
            ></textarea>
          {/if}

          <!-- Preview mode -->
          {#if activeTab === 'preview'}
            <div
              class="prose prose-sm min-h-125 w-full rounded-lg border border-surface-200-800 bg-surface-50-950 p-4 dark:prose-invert"
            >
              <!-- eslint-disable-next-line svelte/no-at-html-tags -->
              {@html previewHtml}
            </div>
          {/if}
        </div>

        <div class="flex justify-end gap-4">
          <a
            href={resolve('/')}
            class="rounded-lg border border-surface-200-800 px-6 py-2 text-surface-700-300 hover:bg-surface-100-900"
          >
            Cancel
          </a>
          <button
            type="submit"
            disabled={submitting}
            class="rounded-lg bg-primary-500 px-6 py-2 text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {#if submitting}
              {currentPath ? 'Updating...' : 'Creating...'}
            {:else}
              {currentPath ? 'Update Post' : 'Create Post'}
            {/if}
          </button>
        </div>
      </form>
    </main>
  </div>
</div>
