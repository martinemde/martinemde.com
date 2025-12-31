<script lang="ts">
  import { onMount } from 'svelte';
  import { resolve } from '$app/paths';
  import { authStore } from '$lib/auth/state.svelte';
  import { initiateOAuthLogin } from '$lib/auth/openrouter';
  import { Lock, Shield, Clock, DollarSign, ExternalLink, Sparkles, TestTube } from 'lucide-svelte';

  const { state, isLoggedIn } = authStore;

  onMount(() => {
    authStore.loadFromStorage();
  });

  function handleConnect() {
    initiateOAuthLogin();
  }

  const toys = [
    {
      name: 'Tab Model Tester',
      href: '/models',
      description:
        'Test and compare response times across different OpenRouter models for Fill In Middle (FIM) completion, code suggestion, or tab completion',
      icon: TestTube
    },
    {
      name: 'AI Toy',
      href: '/toy',
      description:
        'An LLM that can only use preset phrases, and yet is capable of responding appropriately and contextually',
      icon: Sparkles
    }
  ];
</script>

<div class="container mx-auto max-w-3xl space-y-12">
  <!-- Header -->
  <div class="space-y-4 text-center">
    <h1 class="h1 text-surface-950-50">Connect an LLM</h1>
    <p class="text-lg text-surface-600-400">Play with AI models safely and transparently</p>
  </div>

  {#if isLoggedIn}
    <!-- Authenticated State -->
    <section class="variant-filled-success space-y-6 card p-8">
      <div class="flex items-center gap-3">
        <div class="rounded-full bg-success-500 p-3">
          <Shield class="size-6 text-white" />
        </div>
        <div>
          <h2 class="h3 text-success-950-50">Connected!</h2>
          {#if state.user}
            <p class="text-sm text-success-600-400">
              Logged in as {state.user.name || state.user.email}
            </p>
          {/if}
        </div>
      </div>
      <p class="text-success-950-50">
        You're all set! Your OpenRouter API key is securely stored in your browser and ready to use.
      </p>
    </section>

    <!-- Available Toys -->
    <section class="space-y-6">
      <h2 class="h2 text-surface-950-50">What would you like to try?</h2>
      <div class="grid gap-4 md:grid-cols-2">
        {#each toys as toy (toy.name)}
          <a
            href={toy.href}
            class="variant-filled-surface group space-y-3 card p-6 transition-all hover:scale-105 hover:shadow-lg"
          >
            <div class="flex items-start justify-between">
              <div class="rounded-lg bg-primary-500/10 p-3">
                <svelte:component this={toy.icon} class="size-6 text-primary-500" />
              </div>
              <ExternalLink
                class="size-4 text-surface-600-400 opacity-0 transition-opacity group-hover:opacity-100"
              />
            </div>
            <div>
              <h3 class="h4 text-surface-950-50">{toy.name}</h3>
              <p class="text-sm text-surface-600-400">{toy.description}</p>
            </div>
          </a>
        {/each}
      </div>
    </section>
  {:else}
    <!-- Not Authenticated State -->

    <!-- Why Connect -->
    <section class="space-y-4">
      <h2 class="h2 text-surface-950-50">Why do I need to connect?</h2>
      <div class="variant-filled-surface space-y-4 card p-6">
        <p class="text-surface-950-50">
          I've built some fun AI-powered toys and experiments, but I can't share my own API key with
          everyone due to rate limits and costs. Instead, you can connect your own
          <strong>free</strong> OpenRouter account to try them out!
        </p>
        <p class="text-surface-600-400">
          OpenRouter provides access to many AI models, including free ones. You can set spending
          limits, create temporary keys, and revoke access anytime.
        </p>
      </div>
    </section>

    <!-- Security Promise -->
    <section class="space-y-4">
      <h2 class="h2 text-surface-950-50">Your security matters</h2>
      <div class="space-y-4 rounded-lg border-2 border-primary-500 bg-primary-500/5 p-6">
        <div class="flex items-start gap-4">
          <div class="rounded-full bg-primary-500/20 p-2">
            <Lock class="size-5 text-primary-500" />
          </div>
          <div class="flex-1 space-y-3">
            <h3 class="text-lg font-semibold text-surface-950-50">My promise to you</h3>
            <ul class="space-y-2 text-surface-600-400">
              <li class="flex items-start gap-2">
                <Shield class="mt-0.5 size-5 flex-shrink-0 text-primary-500" />
                <span>
                  Your API key is <strong>only stored in your browser's localStorage</strong> - I never
                  see it or send it to my server
                </span>
              </li>
              <li class="flex items-start gap-2">
                <Lock class="mt-0.5 size-5 flex-shrink-0 text-primary-500" />
                <span>
                  All API calls go directly from your browser to OpenRouter - they never touch my
                  infrastructure
                </span>
              </li>
              <li class="flex items-start gap-2">
                <Clock class="mt-0.5 size-5 flex-shrink-0 text-primary-500" />
                <span>
                  You can create keys that <strong>expire in 1 hour</strong> and clear them immediately
                  when you're done
                </span>
              </li>
              <li class="flex items-start gap-2">
                <DollarSign class="mt-0.5 size-5 flex-shrink-0 text-primary-500" />
                <span>
                  Set a <strong>$0 spending limit</strong> to only use free models and prevent any charges
                </span>
              </li>
            </ul>
            <p class="text-sm text-surface-600-400 italic">
              This site is open source - you can
              <a
                href="https://github.com/martinemde/martinemde.com"
                class="anchor"
                target="_blank"
                rel="noopener noreferrer"
              >
                view the code on GitHub
              </a>
              to verify these claims yourself.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- How to Connect -->
    <section class="space-y-4">
      <h2 class="h2 text-surface-950-50">How to connect</h2>
      <div class="variant-filled-surface space-y-4 card p-6">
        <ol class="space-y-3 text-surface-950-50">
          <li class="flex gap-3">
            <span
              class="flex size-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-500 text-sm font-semibold text-white"
            >
              1
            </span>
            <span>
              Click "Connect to OpenRouter" below - you'll be taken to OpenRouter's site to
              authorize
            </span>
          </li>
          <li class="flex gap-3">
            <span
              class="flex size-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-500 text-sm font-semibold text-white"
            >
              2
            </span>
            <span> Create a free account or log in if you already have one </span>
          </li>
          <li class="flex gap-3">
            <span
              class="flex size-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-500 text-sm font-semibold text-white"
            >
              3
            </span>
            <span>
              Authorize this site to use your API key - you'll be redirected back here automatically
            </span>
          </li>
          <li class="flex gap-3">
            <span
              class="flex size-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-500 text-sm font-semibold text-white"
            >
              4
            </span>
            <span> Use the LLM based pages in my site. </span>
          </li>
        </ol>
      </div>
    </section>

    <!-- Call to Action -->
    <section class="flex flex-col items-center gap-4 py-8">
      <button onclick={handleConnect} class="preset-filled-primary btn btn-lg">
        <ExternalLink class="size-5" />
        <span>Connect to OpenRouter</span>
      </button>
      <p class="text-center text-sm text-surface-600-400">Free account • No credit card required</p>
    </section>

    <!-- Optional: Manual Token Input -->
    <section class="space-y-4">
      <details class="variant-filled-surface card p-6">
        <summary class="cursor-pointer text-surface-950-50 hover:text-primary-500">
          Advanced: Use a manual API key instead
        </summary>
        <div class="mt-4 space-y-3 text-sm text-surface-600-400">
          <p>
            If you prefer, you can manually enter an API key on the
            <a href={resolve('/models')} class="anchor">Model Tester</a> page. This is useful if you already
            have a key or want more control over key management.
          </p>
        </div>
      </details>
    </section>
  {/if}

  <!-- Questions -->
  <section class="border-t border-surface-200-800 pt-8">
    <p class="text-center text-sm text-surface-600-400">
      Have questions or concerns?
      <a href={resolve('/about')} class="anchor">Reach out</a> - I'm happy to help!
    </p>
  </section>
</div>
