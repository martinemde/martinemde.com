<script lang="ts">
  import { Share2 } from 'lucide-svelte';
  import CopyButton from './CopyButton.svelte';

  interface Props {
    slug: string;
    title: string;
    description?: string;
  }

  let { slug, title, description }: Props = $props();

  const getLlmUrl = () => `${window.location.origin}/blog/${slug}.txt`;

  async function shareArticle() {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description || title,
          url: window.location.href
        });
      } catch (error) {
        // User cancelled or error occurred
        console.error('Failed to share:', error);
      }
    } else {
      // Fallback to copying URL
      await navigator.clipboard.writeText(window.location.href);
    }
  }
</script>

<div class="flex gap-2">
  <CopyButton
    getData={getLlmUrl}
    name="LLM"
    copiedName="LLM"
    iconSize={16}
    class="rounded-lg border border-surface-300-700 px-3 py-1 text-sm transition-colors hover:bg-surface-100-900"
    ariaLabel="Copy a link to the plain text of this post"
    title="Copy a link to the plain text of this post"
  />
  <button
    onclick={shareArticle}
    class="inline-flex items-center gap-2 rounded-lg border border-surface-300-700 px-2 py-1 text-sm transition-colors hover:bg-surface-100-900"
    aria-label="Share article"
  >
    <Share2 size={16} />
    <span>Share</span>
  </button>
</div>
