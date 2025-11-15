<script lang="ts">
  import { Github, Globe, ExternalLink } from 'lucide-svelte';
  import { projects, type Project } from '$lib/data/projects';

  function getIcon(type: Project['type']) {
    switch (type) {
      case 'github':
        return Github;
      case 'website':
        return Globe;
      default:
        return ExternalLink;
    }
  }

  function formatLinkText(project: Project) {
    if (project.type === 'github' && project.githubPath) {
      return project.githubPath;
    }
    // For site-relative URLs, return the path
    if (project.url.startsWith('/')) {
      return project.url;
    }
    // For websites, show the domain
    const url = new URL(project.url);
    return url.hostname.replace('www.', '');
  }
</script>

<svelte:head>
  <title>Projects - Martin Emde</title>
  <meta name="description" content="Open source projects and contributions by Martin Emde" />
</svelte:head>

<div>
  <h1 class="mb-8 text-4xl font-bold">Projects</h1>

  <p class="mb-12 text-lg text-surface-700-300">
    A selection of open source projects and contributions.
  </p>

  <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
    {#each projects as project (project.name)}
      <article
        class="rounded-lg border border-surface-300-700 bg-surface-100-900 p-6 transition-transform hover:scale-105"
      >
        <h2 class="mb-3 text-xl font-semibold text-surface-950-50">
          {project.name}
        </h2>
        <p class="mb-4 text-surface-700-300">
          {project.description}
        </p>
        <a
          href={project.url}
          rel={project.url.startsWith('/') ? undefined : 'external'}
          class="inline-flex items-center gap-2 text-primary-500 transition-colors hover:text-primary-600"
        >
          <svelte:component this={getIcon(project.type)} size={18} />
          <span class="font-medium">{formatLinkText(project)}</span>
        </a>
      </article>
    {/each}
  </div>
</div>
