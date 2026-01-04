<script lang="ts">
  import { authStore } from '$lib/auth/state.svelte';
  import { initiateOAuthLogin } from '$lib/auth/openrouter';
  import { SendHorizontal, RotateCcw } from 'lucide-svelte';

  interface Message {
    role: 'user' | 'assistant';
    content: string;
    html?: string;
  }

  // Auth state
  const { state: authState } = authStore;
  let effectiveApiKey = $derived(authState.apiKey || '');

  // UI state
  let userInput = $state('');
  let messages = $state<Message[]>([]);
  let isGenerating = $state(false);
  let currentHtml = $state<string | null>(null);
  let interactionContext = $state<string>('');

  // Default model
  let selectedModel = $state('anthropic/claude-3.5-sonnet');

  // System prompt for the LLM
  const SYSTEM_PROMPT = `You are a UI generator that creates interactive HTML interfaces based on user requests and interactions.

IMPORTANT RULES:
1. Generate complete, self-contained HTML that can be rendered in an iframe
2. Use inline styles (Tailwind classes won't work in the iframe)
3. Include all necessary CSS in a <style> tag
4. DO NOT include any JavaScript - all interactivity will be handled by the parent page
5. Make the UI visually appealing with good colors, spacing, and layout
6. Include interactive elements like buttons, forms, inputs, links as appropriate
7. Use semantic HTML
8. When user interacts with an element, you'll receive context about what they clicked/submitted
9. Generate the NEXT UI state that would naturally follow from that interaction

Your response should ONLY contain the HTML - no explanations, no markdown code blocks, just pure HTML.

For the first interaction, create an initial UI based on the user's request.
For subsequent interactions, you'll receive what the user did, and you should generate the UI that follows from that action.`;

  // Generate UI from LLM
  async function generateUI(userMessage: string, isInteraction = false) {
    if (!effectiveApiKey) {
      alert('Please connect to OpenRouter first');
      return;
    }

    isGenerating = true;

    // Add user message to history
    if (!isInteraction) {
      messages.push({
        role: 'user',
        content: userMessage
      });
    }

    try {
      const endpoint = 'https://openrouter.ai/api/v1/chat/completions';

      // Build message history
      const chatMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.map((m) => ({
          role: m.role,
          content: m.content
        })),
        ...(isInteraction ? [{ role: 'user', content: `User interaction: ${userMessage}` }] : [])
      ];

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${effectiveApiKey}`,
          'HTTP-Referer': 'https://martinemde.com',
          'X-Title': 'Dynamic LLM UI',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: chatMessages,
          max_tokens: 4000,
          temperature: 0.7,
          stream: true
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedHtml = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter((line) => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';

              if (content) {
                accumulatedHtml += content;
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      // Clean up the HTML (remove markdown code blocks if present)
      let cleanedHtml = accumulatedHtml.trim();
      if (cleanedHtml.startsWith('```html')) {
        cleanedHtml = cleanedHtml.replace(/^```html\n/, '').replace(/\n```$/, '');
      } else if (cleanedHtml.startsWith('```')) {
        cleanedHtml = cleanedHtml.replace(/^```\n/, '').replace(/\n```$/, '');
      }

      // Store the generated HTML
      currentHtml = cleanedHtml;

      // Add assistant response to history
      messages.push({
        role: 'assistant',
        content: isInteraction ? `Generated UI after: ${userMessage}` : userMessage,
        html: cleanedHtml
      });
    } catch (error) {
      console.error('Error generating UI:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate UI');
    } finally {
      isGenerating = false;
    }
  }

  // Handle initial user input
  function handleSubmit() {
    if (!userInput.trim() || isGenerating) return;

    const message = userInput.trim();
    userInput = '';
    generateUI(message);
  }

  // Handle interaction from iframe
  function handleInteraction(event: MessageEvent) {
    if (event.data.type === 'interaction') {
      const { action, elementInfo, formData } = event.data;
      let interactionDescription = '';

      if (action === 'click') {
        // Build detailed description of the clicked element
        const parts = [`Clicked on <${elementInfo.tag}>`];

        if (elementInfo.id) parts.push(`with id="${elementInfo.id}"`);
        if (elementInfo.classes) parts.push(`class="${elementInfo.classes}"`);
        if (elementInfo.type) parts.push(`type="${elementInfo.type}"`);
        if (elementInfo.name) parts.push(`name="${elementInfo.name}"`);
        if (elementInfo.value) parts.push(`value="${elementInfo.value}"`);
        if (elementInfo.href) parts.push(`href="${elementInfo.href}"`);
        if (elementInfo.text) parts.push(`containing text: "${elementInfo.text}"`);
        if (elementInfo.placeholder) parts.push(`placeholder="${elementInfo.placeholder}"`);

        if (elementInfo.parentTag) {
          parts.push(`inside <${elementInfo.parentTag}>`);
          if (elementInfo.parentId) parts.push(`id="${elementInfo.parentId}"`);
        }

        interactionDescription = parts.join(' ');
      } else if (action === 'submit') {
        interactionDescription = `Submitted form with data: ${JSON.stringify(formData)}`;
      }

      interactionContext = interactionDescription;
      generateUI(interactionDescription, true);
    }
  }

  // Setup message listener
  $effect(() => {
    window.addEventListener('message', handleInteraction);
    return () => window.removeEventListener('message', handleInteraction);
  });

  // Inject event handlers into iframe
  function setupIframe(iframe: HTMLIFrameElement) {
    iframe.onload = () => {
      const iframeDoc = iframe.contentDocument;
      if (!iframeDoc) return;

      // Inject event interception script
      const script = iframeDoc.createElement('script');
      script.textContent = `
        // Helper function to extract element information
        function getElementInfo(el) {
          const info = {
            tag: el.tagName.toLowerCase(),
            id: el.id || null,
            classes: el.className || null,
            type: el.type || null,
            name: el.name || null,
            value: el.value || null,
            href: el.href || null,
            placeholder: el.placeholder || null,
            text: el.textContent?.trim().substring(0, 100) || null, // Limit text to 100 chars
            parentTag: el.parentElement?.tagName.toLowerCase() || null,
            parentId: el.parentElement?.id || null,
            parentClasses: el.parentElement?.className || null
          };

          // Remove null values
          return Object.fromEntries(
            Object.entries(info).filter(([_, v]) => v !== null && v !== '')
          );
        }

        // Intercept all clicks anywhere in the document
        document.addEventListener('click', (e) => {
          const target = e.target;
          const tagName = target.tagName.toLowerCase();

          // Allow form inputs to work normally - don't intercept their clicks
          // They'll be handled when the form is submitted
          if (tagName === 'input' || tagName === 'select' || tagName === 'textarea') {
            // Let the input receive focus and work normally
            return;
          }

          // For all other elements, intercept the click
          e.preventDefault();
          e.stopPropagation();

          const elementInfo = getElementInfo(target);

          window.parent.postMessage({
            type: 'interaction',
            action: 'click',
            elementInfo: elementInfo
          }, '*');
        }, true); // Use capture phase to ensure we catch everything

        // Intercept all form submits
        document.addEventListener('submit', (e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          const data = Object.fromEntries(formData.entries());

          window.parent.postMessage({
            type: 'interaction',
            action: 'submit',
            elementInfo: getElementInfo(e.target),
            formData: data
          }, '*');
        });

        // Intercept input changes (optional - can be useful for live updates)
        document.addEventListener('change', (e) => {
          if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
            // For now, we'll just track clicks and submits
            // But this could be enabled for more interactive experiences
          }
        });
      `;
      iframeDoc.head.appendChild(script);
    };
  }

  // Reset everything
  function reset() {
    messages = [];
    currentHtml = null;
    userInput = '';
    interactionContext = '';
  }
</script>

<div class="container mx-auto max-w-6xl space-y-6 p-4">
  <!-- Header -->
  <div class="space-y-2">
    <h1 class="h1 text-surface-950-50">Dynamic LLM UI</h1>
    <p class="text-surface-600-400">
      A visual REPL where the LLM generates interactive UIs that respond to your interactions
    </p>
  </div>

  <!-- Auth Check -->
  {#if !effectiveApiKey}
    <section class="variant-filled-surface space-y-4 card p-6">
      <h2 class="h2 text-surface-950-50">Authentication Required</h2>
      <p class="text-surface-600-400">
        You need to connect to OpenRouter to use this feature. Please log in or enter your API
        token.
      </p>
      <button onclick={initiateOAuthLogin} class="preset-filled-primary btn">
        Connect to OpenRouter
      </button>
    </section>
  {:else}
    <!-- Main Interface -->
    <div class="grid gap-6 lg:grid-cols-2">
      <!-- Left: Chat/Control Panel -->
      <div class="space-y-4">
        <!-- Input Section -->
        <section class="variant-filled-surface space-y-4 card p-6">
          <h2 class="h3 text-surface-950-50">Your Request</h2>

          {#if currentHtml === null}
            <!-- Initial state: show input -->
            <div class="space-y-4">
              <p class="text-sm text-surface-600-400">
                Describe the UI you want to create. The LLM will generate an interactive interface
                that you can interact with.
              </p>
              <textarea
                bind:value={userInput}
                placeholder="Create a calculator UI..."
                rows="4"
                class="variant-filled textarea w-full"
                disabled={isGenerating}
                onkeydown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              ></textarea>
              <button
                onclick={handleSubmit}
                disabled={isGenerating || !userInput.trim()}
                class="preset-filled-primary btn w-full"
              >
                {#if isGenerating}
                  Generating...
                {:else}
                  <SendHorizontal class="size-5" />
                  <span>Generate UI</span>
                {/if}
              </button>
            </div>
          {:else}
            <!-- After generation: show interaction info -->
            <div class="space-y-4">
              <p class="text-sm text-surface-600-400">
                Interact with the UI on the right. Every click, form submit, or link will trigger
                the LLM to generate the next UI state.
              </p>

              {#if interactionContext}
                <div class="rounded bg-primary-500/10 p-3 text-sm text-primary-500">
                  Last interaction: {interactionContext}
                </div>
              {/if}

              {#if isGenerating}
                <div class="rounded bg-surface-100-900 p-3 text-sm text-surface-600-400">
                  Generating new UI...
                </div>
              {/if}

              <button onclick={reset} class="variant-ghost btn w-full">
                <RotateCcw class="size-5" />
                <span>Start Over</span>
              </button>
            </div>
          {/if}
        </section>

        <!-- Model Selection -->
        <section class="variant-filled-surface space-y-3 card p-6">
          <h3 class="h4 text-surface-950-50">Model</h3>
          <select bind:value={selectedModel} class="variant-filled select">
            <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
            <option value="anthropic/claude-3-haiku">Claude 3 Haiku</option>
            <option value="openai/gpt-4-turbo">GPT-4 Turbo</option>
            <option value="openai/gpt-3.5-turbo">GPT-3.5 Turbo</option>
            <option value="google/gemini-2.0-flash-exp:free">Gemini 2.0 Flash (Free)</option>
          </select>
        </section>

        <!-- Message History -->
        {#if messages.length > 0}
          <section class="variant-filled-surface space-y-3 card p-6">
            <h3 class="h4 text-surface-950-50">Interaction History</h3>
            <div class="max-h-64 space-y-2 overflow-y-auto">
              {#each messages as message, i (i)}
                <div
                  class="rounded p-2 text-sm {message.role === 'user'
                    ? 'bg-primary-500/10'
                    : 'bg-surface-100-900'}"
                >
                  <div class="font-semibold text-surface-950-50">
                    {message.role === 'user' ? 'You' : 'Assistant'}
                  </div>
                  <div class="text-surface-600-400">{message.content}</div>
                </div>
              {/each}
            </div>
          </section>
        {/if}
      </div>

      <!-- Right: UI Preview -->
      <div class="space-y-4">
        <section class="variant-filled-surface card p-6">
          <h2 class="mb-4 h3 text-surface-950-50">Generated UI</h2>

          {#if currentHtml === null}
            <div
              class="flex min-h-96 items-center justify-center rounded border-2 border-dashed border-surface-200-800 bg-surface-50-950 p-8"
            >
              <p class="text-center text-surface-600-400">
                Your generated UI will appear here.<br />Enter a request to get started.
              </p>
            </div>
          {:else}
            <div class="relative">
              <iframe
                use:setupIframe
                title="Generated UI"
                srcdoc={currentHtml}
                class="h-[600px] w-full rounded border border-surface-200-800 bg-white"
                sandbox="allow-same-origin"
              ></iframe>

              {#if isGenerating}
                <div
                  class="absolute inset-0 flex items-center justify-center rounded bg-surface-950-50/80"
                >
                  <div class="space-y-2 text-center">
                    <div
                      class="inline-block size-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"
                    ></div>
                    <p class="text-sm text-surface-50-950">Generating new UI...</p>
                  </div>
                </div>
              {/if}
            </div>
          {/if}
        </section>
      </div>
    </div>

    <!-- How it Works -->
    <section class="variant-filled-surface space-y-4 card p-6">
      <h2 class="h3 text-surface-950-50">How it Works</h2>
      <ol class="space-y-2 text-sm text-surface-600-400">
        <li class="flex gap-3">
          <span
            class="flex size-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-500 text-xs font-semibold text-white"
          >
            1
          </span>
          <span>Describe the UI you want, and the LLM generates interactive HTML</span>
        </li>
        <li class="flex gap-3">
          <span
            class="flex size-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-500 text-xs font-semibold text-white"
          >
            2
          </span>
          <span>
            The UI is rendered in a sandboxed iframe with event interception - no JavaScript runs in
            the iframe
          </span>
        </li>
        <li class="flex gap-3">
          <span
            class="flex size-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-500 text-xs font-semibold text-white"
          >
            3
          </span>
          <span>
            Every interaction (click, form submit, link) is captured and sent back to the LLM
          </span>
        </li>
        <li class="flex gap-3">
          <span
            class="flex size-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-500 text-xs font-semibold text-white"
          >
            4
          </span>
          <span>
            The LLM generates the next UI state that would naturally follow from your interaction
          </span>
        </li>
        <li class="flex gap-3">
          <span
            class="flex size-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-500 text-xs font-semibold text-white"
          >
            5
          </span>
          <span>It's a visual REPL - Read (interaction), Evaluate (LLM), Print (new UI)</span>
        </li>
      </ol>
    </section>
  {/if}
</div>
