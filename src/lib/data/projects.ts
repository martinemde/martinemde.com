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
    name: 'Studio',
    description: 'The smallest possible MCP, converts CLI commands to AI tools',
    url: 'https://github.com/studio-mcp/studio',
    type: 'github',
    githubPath: 'studio-mcp/studio'
  },
  {
    name: 'gem.coop',
    description: 'The Gem Cooperative, founding member and Project Leadership Committee member',
    url: 'https://gem.coop',
    type: 'website'
  },
  {
    name: 'Tossball',
    description: 'The Outer Worlds 2: Pitchball & Tossball Card Checklist',
    url: '/tossball',
    type: 'website'
  }
];
