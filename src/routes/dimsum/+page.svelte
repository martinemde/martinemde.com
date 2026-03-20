<script lang="ts">
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';

  const MIN_PLAYERS = 2;
  const MAX_PLAYERS = 6;

  const defaultColors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];
  const defaultNames = ['Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5', 'Player 6'];

  interface Player {
    name: string;
    color: string;
  }

  // Dim sum items with their scoring rules and theme colors from the game
  const dimSumItems = [
    { id: 'small_sesame', name: 'Small Sesame Ball', rule: '1 pt each', color: '#8B4513' },
    { id: 'large_sesame', name: 'Large Sesame Ball', rule: '2 pts each', color: '#DAA520' },
    { id: 'chive_dumpling', name: 'Chive Dumpling', rule: '4 pts per set of 2', color: '#4CAF50' },
    {
      id: 'egg_tart',
      name: 'Egg Tart',
      rule: '1/2/5/9/15 pts for 1/2/3/4/5+',
      color: '#9C27B0'
    },
    {
      id: 'shrimp_dumpling',
      name: 'Shrimp Dumpling',
      rule: '7 pts per set of 3',
      color: '#E91E63'
    },
    {
      id: 'turnip_cake',
      name: 'Turnip Cake',
      rule: '2 pts each if odd count',
      color: '#009688'
    },
    {
      id: 'shumai_dumpling',
      name: 'Shumai Dumpling',
      rule: '12 pts per set of 4',
      color: '#FF9800'
    },
    {
      id: 'steamed_bun',
      name: 'Steamed Bun',
      rule: '3 pts most / -3 pts fewest',
      color: '#F48FB1'
    },
    {
      id: 'special_plate',
      name: 'Special Plate',
      rule: '5 pts each',
      color: '#E91E63'
    },
    { id: 'chopsticks', name: 'Chopsticks', rule: '1 pt per 2 tokens', color: '#D32F2F' }
  ] as const;

  type DimSumId = (typeof dimSumItems)[number]['id'];

  let playerCount = $state(2);
  let players: Player[] = $state(
    Array.from({ length: MAX_PLAYERS }, (_, i) => ({
      name: defaultNames[i],
      color: defaultColors[i]
    }))
  );

  // Counts for each player and each dim sum item
  let counts: Record<DimSumId, number[]> = $state(
    Object.fromEntries(dimSumItems.map((item) => [item.id, Array(MAX_PLAYERS).fill(0)])) as Record<
      DimSumId,
      number[]
    >
  );

  // Scoring functions
  function scoreSmallSesame(count: number): number {
    return count * 1;
  }

  function scoreLargeSesame(count: number): number {
    return count * 2;
  }

  function scoreChiveDumpling(count: number): number {
    return Math.floor(count / 2) * 4;
  }

  const eggTartScoring = [0, 1, 2, 5, 9, 15];
  function scoreEggTart(count: number): number {
    if (count >= eggTartScoring.length) return eggTartScoring[eggTartScoring.length - 1];
    return eggTartScoring[count];
  }

  function scoreShrimpDumpling(count: number): number {
    return Math.floor(count / 3) * 7;
  }

  function scoreTurnipCake(count: number): number {
    return count % 2 === 1 ? count * 2 : 0;
  }

  function scoreShumaiDumpling(count: number): number {
    return Math.floor(count / 4) * 12;
  }

  function scoreSteamedBun(count: number, allCounts: number[], activePlayers: number): number {
    const active = allCounts.slice(0, activePlayers);
    const max = Math.max(...active);
    const min = Math.min(...active);
    // If everyone is tied, no bonus or penalty
    if (max === min) return 0;
    let score = 0;
    if (count === max) score += 3;
    if (count === min) score -= 3;
    return score;
  }

  function scoreSpecialPlate(count: number): number {
    return count * 5;
  }

  function scoreChopsticks(count: number): number {
    return Math.floor(count / 2);
  }

  function scoreItem(id: DimSumId, playerIdx: number): number {
    const count = counts[id][playerIdx];
    switch (id) {
      case 'small_sesame':
        return scoreSmallSesame(count);
      case 'large_sesame':
        return scoreLargeSesame(count);
      case 'chive_dumpling':
        return scoreChiveDumpling(count);
      case 'egg_tart':
        return scoreEggTart(count);
      case 'shrimp_dumpling':
        return scoreShrimpDumpling(count);
      case 'turnip_cake':
        return scoreTurnipCake(count);
      case 'shumai_dumpling':
        return scoreShumaiDumpling(count);
      case 'steamed_bun':
        return scoreSteamedBun(count, counts['steamed_bun'], playerCount);
      case 'special_plate':
        return scoreSpecialPlate(count);
      case 'chopsticks':
        return scoreChopsticks(count);
    }
  }

  let totalScores = $derived(
    Array.from({ length: playerCount }, (_, pi) =>
      dimSumItems.reduce((sum, item) => sum + scoreItem(item.id, pi), 0)
    )
  );

  function addPlayer() {
    if (playerCount < MAX_PLAYERS) playerCount++;
  }

  function removePlayer() {
    if (playerCount > MIN_PLAYERS) playerCount--;
  }

  function increment(id: DimSumId, playerIdx: number) {
    counts[id][playerIdx]++;
  }

  function decrement(id: DimSumId, playerIdx: number) {
    if (counts[id][playerIdx] > 0) counts[id][playerIdx]--;
  }

  function resetAll() {
    for (const item of dimSumItems) {
      counts[item.id] = Array(MAX_PLAYERS).fill(0);
    }
  }

  function contrastText(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#1a1a1a' : '#ffffff';
  }

  function itemEmoji(id: DimSumId): string {
    switch (id) {
      case 'small_sesame':
        return '🟤';
      case 'large_sesame':
        return '🟡';
      case 'chive_dumpling':
        return '🥟';
      case 'egg_tart':
        return '🥧';
      case 'shrimp_dumpling':
        return '🦐';
      case 'turnip_cake':
        return '🧁';
      case 'shumai_dumpling':
        return '🫓';
      case 'steamed_bun':
        return '🫘';
      case 'special_plate':
        return '🍽️';
      case 'chopsticks':
        return '🥢';
    }
  }
</script>

<svelte:head>
  <title>Dim Sum Scorer - Martin Emde</title>
  <meta name="description" content="Score tracker for Sushi Go! Spin Some for Dim Sum" />
</svelte:head>

<div class="dimsum-page">
  <Breadcrumbs
    crumbs={[
      { label: 'Home', href: '/' },
      { label: 'Projects', href: '/projects' },
      { label: 'Dim Sum Scorer' }
    ]}
  />

  <div class="mb-6 text-center">
    <h1 class="mb-1 text-4xl font-bold tracking-tight" style="color: #E91E63;">
      🥟 Dim Sum Scorer 🥢
    </h1>
    <p class="text-lg text-surface-600-400">Sushi Go! Spin Some for Dim Sum</p>
  </div>

  <!-- Player Controls -->
  <div class="mb-4 flex items-center justify-center gap-3">
    <button
      class="player-btn"
      onclick={removePlayer}
      disabled={playerCount <= MIN_PLAYERS}
      aria-label="Remove player">−</button
    >
    <span class="text-lg font-semibold text-surface-700-300">
      {playerCount} Players
    </span>
    <button
      class="player-btn"
      onclick={addPlayer}
      disabled={playerCount >= MAX_PLAYERS}
      aria-label="Add player">+</button
    >
    <button class="reset-btn" onclick={resetAll}>Reset Scores</button>
  </div>

  <!-- Scoring Table -->
  <div class="overflow-x-auto rounded-xl border-2 border-surface-200-800 shadow-lg">
    <table class="w-full border-collapse">
      <!-- Player Header Row -->
      <thead>
        <tr>
          <th class="dim-sum-header-cell sticky left-0 z-10 min-w-[140px] bg-surface-100-900">
            <span class="text-sm font-bold text-surface-600-400">Dim Sum</span>
          </th>
          {#each { length: playerCount } as _, pi (pi)}
            <th
              class="player-header-cell"
              style="background-color: {players[pi].color}; color: {contrastText(
                players[pi].color
              )};"
            >
              <input
                type="text"
                bind:value={players[pi].name}
                class="player-name-input"
                style="color: {contrastText(players[pi].color)};"
              />
              <label class="color-picker-label">
                <input type="color" bind:value={players[pi].color} class="color-picker" />
                <span class="color-picker-icon">🎨</span>
              </label>
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each dimSumItems as item}
          <tr class="border-t border-surface-200-800">
            <!-- Item label column -->
            <td
              class="dim-sum-label-cell sticky left-0 z-10"
              style="background-color: {item.color}; color: {contrastText(item.color)};"
            >
              <span class="item-emoji">{itemEmoji(item.id)}</span>
              <div>
                <div class="text-sm leading-tight font-bold">{item.name}</div>
                <div class="text-xs leading-tight opacity-80">{item.rule}</div>
              </div>
            </td>
            <!-- Player count cells -->
            {#each { length: playerCount } as _, pi (pi)}
              <td class="score-cell" style="background-color: {players[pi].color}15;">
                <div class="count-controls">
                  <button
                    class="count-btn"
                    onclick={() => decrement(item.id, pi)}
                    disabled={counts[item.id][pi] <= 0}
                    aria-label="Decrease {item.name} for {players[pi].name}">−</button
                  >
                  <span class="count-value">{counts[item.id][pi]}</span>
                  <button
                    class="count-btn"
                    onclick={() => increment(item.id, pi)}
                    aria-label="Increase {item.name} for {players[pi].name}">+</button
                  >
                </div>
                <div class="item-score text-surface-600-400">
                  = {scoreItem(item.id, pi)} pts
                </div>
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
      <!-- Total Score Row -->
      <tfoot>
        <tr class="border-t-2 border-surface-300-700">
          <td class="total-label-cell sticky left-0 z-10 bg-surface-100-900">
            <span class="text-lg font-extrabold">🏆 Total</span>
          </td>
          {#each { length: playerCount } as _, pi (pi)}
            <td
              class="total-score-cell"
              style="background-color: {players[pi].color}; color: {contrastText(
                players[pi].color
              )};"
            >
              <span class="text-2xl font-extrabold">{totalScores[pi]}</span>
              <span class="text-sm opacity-80">points</span>
            </td>
          {/each}
        </tr>
      </tfoot>
    </table>
  </div>

  <!-- Winner announcement -->
  {#if totalScores.some((s) => s > 0)}
    {@const maxScore = Math.max(...totalScores)}
    {@const winners = totalScores.reduce<number[]>(
      (acc, s, i) => (s === maxScore ? [...acc, i] : acc),
      []
    )}
    <div class="mt-6 text-center">
      <div
        class="inline-block rounded-xl px-6 py-3 text-xl font-bold shadow-lg"
        style="background-color: {winners.length === 1
          ? players[winners[0]].color
          : '#FFD700'}; color: {winners.length === 1
          ? contrastText(players[winners[0]].color)
          : '#1a1a1a'};"
      >
        {#if winners.length === 1}
          🎉 {players[winners[0]].name} wins with {maxScore} points! 🎉
        {:else}
          🤝 Tie at {maxScore} points!
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .dimsum-page {
    max-width: 100%;
  }

  .player-header-cell {
    padding: 0.75rem 0.5rem;
    min-width: 120px;
    text-align: center;
    vertical-align: middle;
    transition: background-color 0.2s;
  }

  .player-name-input {
    background: transparent;
    border: none;
    border-bottom: 1px dashed rgba(255, 255, 255, 0.4);
    text-align: center;
    font-weight: 700;
    font-size: 0.95rem;
    width: 100%;
    padding: 0.15rem 0;
    outline: none;
  }

  .player-name-input:focus {
    border-bottom-color: rgba(255, 255, 255, 0.8);
  }

  .color-picker-label {
    display: inline-block;
    cursor: pointer;
    margin-top: 0.25rem;
    font-size: 0.75rem;
  }

  .color-picker {
    width: 0;
    height: 0;
    opacity: 0;
    position: absolute;
  }

  .color-picker-icon {
    font-size: 0.85rem;
  }

  .dim-sum-header-cell {
    padding: 0.75rem 0.75rem;
    text-align: left;
    vertical-align: middle;
  }

  .dim-sum-label-cell {
    padding: 0.5rem 0.75rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 140px;
  }

  .item-emoji {
    font-size: 1.25rem;
    flex-shrink: 0;
  }

  .score-cell {
    padding: 0.4rem 0.25rem;
    text-align: center;
    vertical-align: middle;
  }

  .count-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
  }

  .count-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 1px solid rgba(128, 128, 128, 0.3);
    background: rgba(128, 128, 128, 0.1);
    font-size: 1rem;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
    color: inherit;
  }

  .count-btn:hover:not(:disabled) {
    background: rgba(128, 128, 128, 0.25);
    transform: scale(1.1);
  }

  .count-btn:disabled {
    opacity: 0.3;
    cursor: default;
  }

  .count-value {
    font-size: 1.25rem;
    font-weight: 700;
    min-width: 2rem;
    text-align: center;
  }

  .item-score {
    font-size: 0.7rem;
    margin-top: 0.1rem;
  }

  .total-label-cell {
    padding: 0.75rem;
    text-align: left;
  }

  .total-score-cell {
    padding: 0.75rem 0.5rem;
    text-align: center;
    vertical-align: middle;
    transition: background-color 0.2s;
  }

  .player-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 2px solid #e91e63;
    background: transparent;
    color: #e91e63;
    font-size: 1.25rem;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
  }

  .player-btn:hover:not(:disabled) {
    background: #e91e63;
    color: white;
  }

  .player-btn:disabled {
    opacity: 0.3;
    cursor: default;
  }

  .reset-btn {
    padding: 0.4rem 1rem;
    border-radius: 9999px;
    border: 1px solid rgba(128, 128, 128, 0.3);
    background: transparent;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.15s;
    color: inherit;
  }

  .reset-btn:hover {
    background: rgba(128, 128, 128, 0.15);
  }
</style>
