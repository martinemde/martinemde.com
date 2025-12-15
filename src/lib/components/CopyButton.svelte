<script lang="ts">
  import { Copy, CopyCheck } from 'lucide-svelte';

  interface Props {
    getData: () => string | Promise<string>;
    class?: string;
    name?: string;
    copiedName?: string;
    iconSize?: number;
    ariaLabel?: string;
    title?: string;
  }

  let {
    getData,
    class: className = '',
    name = 'Copy',
    copiedName = 'Copied',
    iconSize = 20,
    ariaLabel,
    title
  }: Props = $props();

  let copied = $state(false);

  async function handleCopy() {
    try {
      const data = await getData();
      await navigator.clipboard.writeText(data);
      copied = true;
      setTimeout(() => {
        copied = false;
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }
</script>

<button
  type="button"
  onclick={handleCopy}
  class="btn inline-flex items-center gap-2 {className}"
  aria-label={ariaLabel}
  {title}
>
  {#if copied}
    <CopyCheck size={iconSize} class="text-tertiary-500" />
    <span>{copiedName}</span>
  {:else}
    <Copy size={iconSize} />
    <span>{name}</span>
  {/if}
</button>
