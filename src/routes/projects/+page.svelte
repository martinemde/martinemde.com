<script lang="ts">
  import { projects, type Project } from '$lib/data/projects';

  function formatLinkText(project: Project) {
    if (project.linktext) {
      return project.linktext;
    } else {
      return project.name;
    }
  }
</script>

<svelte:head>
  <title>Projects - Martin Emde</title>
  <meta name="description" content="Open source projects and other things made by Martin Emde" />
</svelte:head>

<div class="space-y-8">
  <h1 class="preset-typo-headline">Projects</h1>
  <p class="preset-typo-subtitle">A selection of open source projects and other things.</p>

  <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
    {#each projects as project (project.name)}
      <article
        class="card border border-surface-200-800 preset-filled-surface-100-900 p-6 card-hover"
      >
        <h2 class="preset-typo-title">
          {project.name}
        </h2>
        <p class="mb-4 text-surface-700-300">
          {project.description}
        </p>
        <!-- We've already resolved these links, so this is a false positive -->
        <!-- eslint-disable svelte/no-navigation-without-resolve -->
        <a
          href={project.url}
          rel={project.url.startsWith('/') ? undefined : 'external'}
          class="inline-flex items-center gap-2 text-primary-500 transition-colors hover:text-primary-600"
        >
          <svelte:component this={project.icon} size={18} />
          <span class="font-medium">{formatLinkText(project)}</span>
        </a>
        <!-- eslint-enable svelte/no-navigation-without-resolve -->
      </article>
    {/each}
  </div>
</div>
