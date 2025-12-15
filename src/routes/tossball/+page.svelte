<script lang="ts">
  import CopyButton from '$lib/components/CopyButton.svelte';
  import ToggleButton from './ToggleButton.svelte';
  import { generateCardsMarkdown } from './markdown';
  import untypedCards from './cards.json';

  interface Cards {
    pitchball: string[];
    tossball: string[];
  }

  const cards: Cards = untypedCards;

  const isBrowser = typeof window !== 'undefined';

  // Initialize from localStorage
  let storedCards = $state<string[]>(
    isBrowser && window.localStorage ? JSON.parse(window.localStorage.getItem('cards') || '[]') : []
  );

  let sortMode = $state<'name' | 'type'>('name');

  // Derived state for sorted cards
  const cardsByName = [...cards.pitchball, ...cards.tossball].sort((a, b) => a.localeCompare(b));

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

  const getMarkdown = () =>
    generateCardsMarkdown({
      cards,
      checkedCards: storedCards,
      sortMode
    });
</script>

<article class="container mx-auto max-w-4xl space-y-8 px-4 pb-8">
  <header>
    <h1 class="preset-typo-headline">Pitchball &amp; Tossball Cards</h1>
    <h2 class="preset-typo-subtitle">Achieve Perfection in <i>The Outer Worlds 2</i></h2>
  </header>

  <div class="justify-center space-y-4">
    <div class="flex flex-wrap gap-2">
      <CopyButton
        getData={getMarkdown}
        name="Copy Data"
        class="preset-outlined-secondary-500"
        ariaLabel="Copy a backup of your data"
        title="Copy a backup of your data"
      />
    </div>

    <details class="space-y-2">
      <p>
        This page saves your checked cards in browser local storage. You will only be able to access
        your data in this browser.
      </p>
      <p>
        Press the
        <mark class="mark bg-secondary-500 text-black opacity-80">Copy</mark>
        button above to copy your progress as a markdown list.
      </p>
    </details>
  </div>

  {#if sortMode === 'name'}
    <section>
      <div class="mb-4 flex items-center justify-between">
        <h2 class="preset-typo-title">All Cards</h2>
        <button
          type="button"
          onclick={() => (sortMode = 'type')}
          class="btn preset-tonal-secondary btn-sm"
        >
          View by Type
        </button>
      </div>
      <div class="space-y-2">
        {#each cardsByName as card (card)}
          <ToggleButton checked={isChecked(card)} ontoggle={() => toggleCard(card)}>
            {card}
          </ToggleButton>
        {/each}
      </div>
    </section>
  {:else}
    <section>
      <div class="mb-4 flex items-center justify-between">
        <h2 class="preset-typo-title">Pitchball Cards</h2>
        <button
          type="button"
          onclick={() => (sortMode = 'name')}
          class="btn preset-tonal-secondary btn-sm"
        >
          View by Name
        </button>
      </div>
      <div class="space-y-2">
        {#each cards.pitchball as card (card)}
          <ToggleButton checked={isChecked(card)} ontoggle={() => toggleCard(card)}>
            {card}
          </ToggleButton>
        {/each}
      </div>
    </section>

    <section>
      <h2 class="preset-typo-title">Tossball Cards</h2>
      <div class="space-y-2">
        {#each cards.tossball as card (card)}
          <ToggleButton checked={isChecked(card)} ontoggle={() => toggleCard(card)}>
            {card}
          </ToggleButton>
        {/each}
      </div>
    </section>
  {/if}
</article>
