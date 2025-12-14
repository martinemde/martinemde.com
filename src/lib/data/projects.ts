/**
 * Project data for the projects page
 */

export type ProjectType = 'github' | 'website' | 'other';

export interface Project {
  name: string;
  description: string;
  url: string;
  type: ProjectType;
  /** For GitHub projects, the org/repo path (e.g., "martinemde/tinybucket") */
  githubPath?: string;
}

export const projects: Project[] = [
  {
    name: 'gem.coop',
    description:
      'The Gem Cooperative, founding member and elected Project Leadership Committee member.',
    url: 'https://gem.coop',
    type: 'website'
  },
  {
    name: 'Studio',
    description: 'The smallest possible MCP, converts CLI commands to AI tools.',
    url: 'https://github.com/studio-mcp/studio',
    type: 'github',
    githubPath: 'studio-mcp/studio'
  },
  {
    name: 'BanchoBox',
    description:
      'A companion app for Dave the Diver. Lists all the dishes and fishes in the game so you can sort, filter, and min-max every tiny detail.',
    url: 'https://banchobox.com',
    type: 'website'
  },
  {
    name: 'dotfiles',
    description:
      'My boss nerdsniped me into dotfiles and I changed my whole dev environment. Managed by chezmoi and claude.',
    url: 'https://github.com/martinemde/dotfiles',
    type: 'github',
    githubPath: 'martinemde/dotfiles'
  },
  {
    name: 'Tossball',
    description:
      'The Outer Worlds 2: Pitchball & Tossball Card Checklist. Just a silly little checklist made with Svelte.',
    url: '/tossball',
    type: 'website'
  },
  {
    name: 'RubyGems & Bundler',
    description:
      'Former team lead and core maintainer of RubyGems, et al. Built bundler lockfile checksums, gem contents storage, organizations, new website design, and more.',
    url: 'https://github.com/ruby/rubygems',
    type: 'github',
    githubPath: 'ruby/rubygems'
  }
];
