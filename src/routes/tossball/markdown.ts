interface Cards {
  pitchball: string[];
  tossball: string[];
}

interface GenerateMarkdownOptions {
  cards: Cards;
  checkedCards: string[];
  sortMode: 'name' | 'type';
}

/**
 * Generates a markdown checklist of cards
 * @param options - Configuration for markdown generation
 * @returns Markdown string with card checklist
 */
export function generateCardsMarkdown(options: GenerateMarkdownOptions): string {
  const { cards, checkedCards, sortMode } = options;

  const isChecked = (card: string) => checkedCards.includes(card);

  if (sortMode === 'name') {
    const cardsByName = [...cards.pitchball, ...cards.tossball].sort((a, b) => a.localeCompare(b));
    const allCardsMd = cardsByName
      .map((card) => `- [${isChecked(card) ? 'X' : ' '}] ${card}`)
      .join('\n');

    return `# The Outer Worlds 2 Cards

## All Cards

${allCardsMd}
`;
  } else {
    const pitchballMd = cards.pitchball
      .map((card) => `- [${isChecked(card) ? 'X' : ' '}] ${card}`)
      .join('\n');

    const tossballMd = cards.tossball
      .map((card) => `- [${isChecked(card) ? 'X' : ' '}] ${card}`)
      .join('\n');

    return `# The Outer Worlds 2 Cards

## Pitchball Cards

${pitchballMd}

## Tossball Cards

${tossballMd}
`;
  }
}
