/**
 * Project data for the projects page
 */

export type ProjectType = 'github' | 'website' | 'other';
import { resolve } from '$app/paths';

export interface Project {
  name: string;
  description: string;
  url: string;
  type: ProjectType;
  /** For GitHub projects, the org/repo path (e.g., "martinemde/project") */
  githubPath?: string;
}

export const projects: Project[] = [
  {
    name: 'gem.coop',
    description: 'The Gem Cooperative - Founding member, Project Leadership Committee.',
    url: 'https://gem.coop',
    type: 'website'
  },
  {
    name: 'Studio',
    description:
      'The smallest possible MCP server. Converts CLI commands to AI tools with a simple template pattern.',
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
      'My boss nerdsniped me into caring more about my dotfiles. I changed my whole dev environment. Now managed by chezmoi and claude.',
    url: 'https://github.com/martinemde/dotfiles',
    type: 'github',
    githubPath: 'martinemde/dotfiles'
  },
  {
    name: 'Tossball',
    description:
      'The Outer Worlds 2: Pitchball & Tossball Card checklist. A little checklist made with Svelte.',
    url: resolve('/tossball'),
    type: 'website'
  },
  {
    name: 'RubyGems & Bundler',
    description:
      'Former team lead and core maintainer of RubyGems. Contributed to Bundler lockfile checksums, gem contents storage, organizations, new website design, as well as serving on the security team.',
    url: 'https://github.com/ruby/rubygems',
    type: 'github',
    githubPath: 'ruby/rubygems'
  }
];
