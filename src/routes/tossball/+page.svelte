<script lang="ts">
  import { Copy, CopyCheck } from 'lucide-svelte';
  import cards from './cards.json';

  const isBrowser = typeof window !== 'undefined';

  // Initialize from localStorage
  let storedCards = $state<string[]>(
    isBrowser && window.localStorage ? JSON.parse(window.localStorage.getItem('cards') || '[]') : []
  );

  let copied = $state(false);

  // Sync to localStorage whenever storedCards changes
  $effect(() => {
    if (isBrowser && window.localStorage) {
      window.localStorage.setItem('cards', JSON.stringify(storedCards));
    }
  });

  const toggleCard = (card: string) => {
    if (storedCards.includes(card)) {
      storedCards = storedCards.filter((c) => c !== card);
    } else {
      storedCards = [...storedCards, card];
    }
  };

  const isChecked = (card: string) => storedCards.includes(card);

  async function copyMarkdown() {
    const pitchballMd = cards.pitchball
      .map((card) => `- [${isChecked(card) ? 'X' : ' '}] ${card}`)
      .join('\n');

    const tossballMd = cards.tossball
      .map((card) => `- [${isChecked(card) ? 'X' : ' '}] ${card}`)
      .join('\n');

    const markdown = `# The Outer Worlds 2 Cards

## Pitchball Cards
${pitchballMd}

## Tossball Cards
${tossballMd}
`;

    try {
      await navigator.clipboard.writeText(markdown);
      copied = true;
      setTimeout(() => {
        copied = false;
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }
</script>

<article class="container mx-auto max-w-4xl space-y-8 px-4 pb-8">
  <header>
    <h1 class="preset-typo-headline">Pitchball &amp; Tossball Cards</h1>
    <h2 class="preset-typo-subtitle">Achieve The Outer Worlds 2 Perfection</h2>
  </header>

  <p>
    A checklist I made for my wife.<br />
    <small>(She was going to make it herself but she's busy playing The Outer Worlds 2.)</small>
  </p>

  <div class="justify-center space-y-2">
    <button
      type="button"
      onclick={copyMarkdown}
      class="btn inline-flex items-center gap-2 preset-filled-secondary-500"
    >
      {#if copied}
        <CopyCheck size={20} />
        <span>Copied!</span>
      {:else}
        <Copy size={20} />
        <span>Copy Data</span>
      {/if}
    </button>
    <details class="space-y-2">
      <p>
        This page saves your checked cards in browser local storage. You will only be able to access
        your data in this browser.
      </p>
      <p>
        Press the
        <mark class="mark bg-secondary-500 text-black opacity-80">Copy Data</mark>
        button above to copy your progress as a markdown list.
      </p>
    </details>
  </div>

  <section>
    <h2 class="mb-4 text-2xl font-semibold text-surface-950-50">Pitchball Cards</h2>
    <div class="space-y-2">
      {#each cards.pitchball as card (card)}
        <label class="flex items-center gap-3">
          <input
            class="checkbox"
            type="checkbox"
            checked={isChecked(card)}
            onchange={() => toggleCard(card)}
          />
          {card}
        </label>
      {/each}
    </div>
  </section>

  <section>
    <h2 class="mb-4 text-2xl font-semibold text-surface-950-50">Tossball Cards</h2>
    <div class="space-y-2">
      {#each cards.tossball as card (card)}
        <button
          onclick={() => toggleCard(card)}
          class="btn flex items-center justify-start gap-3 {isChecked(card)
            ? 'preset-outlined-primary-500'
            : 'preset-outlined-surface-200-800'}"
        >
          <input
            class="checkbox"
            type="checkbox"
            checked={isChecked(card)}
            onchange={() => toggleCard(card)}
          />
          {card}
        </button>
      {/each}
    </div>
  </section>
</article>
