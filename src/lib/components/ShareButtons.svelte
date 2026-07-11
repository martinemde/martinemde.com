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

<div class="share">
  <CopyButton
    getData={getLlmUrl}
    name="LLM"
    copiedName="LLM"
    iconSize={16}
    class="share-btn"
    ariaLabel="Copy a link to the plain text of this post"
    title="Copy a link to the plain text of this post"
  />
  <button onclick={shareArticle} class="share-btn" aria-label="Share article">
    <Share2 size={16} />
    <span>Share</span>
  </button>
</div>

<style>
  .share {
    display: flex;
    gap: 8px;
  }
  /* :global is required because .share-btn is applied inside the child CopyButton. */
  .share :global(.share-btn) {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: 1px solid var(--border);
    border-radius: 7px;
    padding: 6px 12px;
    font-family: var(--font-mono);
    font-weight: 460;
    font-size: 12px;
    color: var(--muted);
    background: transparent;
    cursor: pointer;
    transition:
      color 0.15s ease,
      border-color 0.15s ease;
  }
  .share :global(.share-btn:hover) {
    color: var(--accent);
    border-color: color-mix(in oklch, var(--accent) 40%, var(--border));
  }
</style>
