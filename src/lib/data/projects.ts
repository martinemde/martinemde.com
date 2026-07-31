/**
 * Project data for the projects page
 */

import { resolve } from '$app/paths';
import {
  Armchair,
  Calculator,
  Cat,
  Code,
  Gem,
  Ghost,
  FolderOpenDot,
  Shrimp,
  Smartphone,
  UtensilsCrossed,
  Volleyball,
  type Icon as IconType
} from 'lucide-svelte';

export interface Project {
  name: string;
  description: string;
  url: string;
  icon: typeof IconType;
  linktext?: string;
}

export const projects: Project[] = [
  {
    name: 'gem.coop',
    description: 'The Gem Cooperative - Founding member, Project Leadership Committee.',
    url: 'https://gem.coop',
    icon: Gem
  },
  {
    name: 'Studio',
    description:
      'The smallest possible MCP server. Converts CLI commands to AI tools with a simple template pattern.',
    url: 'https://github.com/studio-mcp/studio',
    linktext: 'studio-mcp/studio',
    icon: Armchair
  },
  {
    name: 'BanchoBox',
    description:
      'A companion app for Dave the Diver. Lists all the dishes and fishes in the game so you can sort, filter, and min-max every tiny detail.',
    url: 'https://banchobox.com',
    icon: Shrimp
  },
  {
    name: 'dotfiles',
    description:
      'I got nerdsniped into caring about my dotfiles and changed my whole dev environment. Now managed by chezmoi and Claude.',
    url: 'https://github.com/martinemde/dotfiles',
    linktext: 'martinemde/dotfiles',
    icon: FolderOpenDot
  },
  {
    name: 'Ghostty Shaders',
    description:
      'A Ghostty shader emulator using WebGL. Built to help preview shaders for Ghostty on the web.',
    url: resolve('/shaders'),
    icon: Ghost
  },
  {
    name: 'LLM FIM Tester',
    description: 'A Fill-In-The-Middle tester for large language models powered by OpenRouter.',
    url: resolve('/models'),
    icon: Code
  },
  {
    name: 'Toy LLM',
    description:
      'A Toy LLM proof-of-concept that uses only canned phrases to respond safely but still coherently.',
    url: resolve('/toy'),
    icon: Cat
  },
  {
    name: 'Tossball',
    description:
      'The Outer Worlds 2: Pitchball & Tossball Card checklist. A little checklist made with Svelte.',
    url: resolve('/tossball'),
    icon: Volleyball
  },
  {
    name: 'Dim Sum Scorer',
    description:
      'Score tracker for Sushi Go! Spin Some for Dim Sum. Supports 2-6 players with automatic scoring for all dim sum cards.',
    url: resolve('/dimsum'),
    icon: UtensilsCrossed
  },
  {
    name: 'Loan Calculator',
    description:
      'Compare loans side by side. Calculate monthly payments, total interest, and grand totals.',
    url: resolve('/loans'),
    icon: Calculator
  },
  {
    name: 'Apple Upgrade Calculator',
    description:
      "Should you lease your next iPhone? Walk Apple's new Upgrade program month by month and compare it against buying outright, Apple Card, and carrier financing.",
    url: resolve('/apple-upgrade'),
    icon: Smartphone
  },
  {
    name: 'RubyGems & Bundler',
    description:
      'Former team lead and core maintainer of RubyGems. Contributed to Bundler lockfile checksums, gem contents storage, organizations, new website design, as well as serving on the security team.',
    url: 'https://github.com/ruby/rubygems',
    linktext: 'ruby/rubygems',
    icon: Gem
  }
];
