<script lang="ts">
  import { Progress } from '@skeletonlabs/skeleton-svelte';
  import { authStore } from '$lib/auth/state.svelte';
  import { initiateOAuthLogin } from '$lib/auth/openrouter';

  interface TestResult {
    timeToFirstToken: number | null;
    totalTime: number | null;
    output: string;
    error?: string;
  }

  interface ModelTest {
    id: string;
    name: string;
    result: TestResult | null;
    isRunning: boolean;
  }

  // Auth state
  const { state: authState } = authStore;

  // State
  let apiToken = $state('');
  let hasStoredToken = $state(false);
  let promptsExpanded = $state(false);
  let customModelInput = $state('');
  let useFIM = $state(false);

  // Effective API key - prioritize OAuth key over manual token
  let effectiveApiKey = $derived(authState.apiKey || apiToken || '');

  // Default prompts from test_chat.ts
  let systemPrompt =
    $state(`You are an AI code completion engine. Provide contextually appropriate completions:
- Code completions in code context
- Comment/documentation text in comments
- String content in string literals
- Prose in markdown/documentation files

Input markers:
- \`<contextAfterCursor>\`: Context after cursor
- \`<cursorPosition>\`: Current cursor location
- \`<contextBeforeCursor>\`: Context before cursor

Note that the user input will be provided in **reverse** order: first the
context after cursor, followed by the context before cursor.`);

  let guidelines = $state(`Guidelines:
1. Offer completions after the \`<cursorPosition>\` marker.
2. Make sure you have maintained the user's existing whitespace and indentation.
   This is REALLY IMPORTANT!
3. Provide multiple completion options when possible.
4. Return completions separated by the marker <endCompletion>.
5. The returned message will be further parsed and processed. DO NOT include
   additional comments or markdown code block fences. Return the result directly.
6. Keep each completion option concise, limiting it to a single line or a few lines.
7. Create entirely new code completion that DO NOT REPEAT OR COPY any user's existing code around <cursorPosition>.
8. Provide at most 3 completion items.`);

  let fewShotUser = $state(`# language: javascript
<contextAfterCursor>
    return result;
}

const processedData = transformData(rawData, {
    uppercase: true,
    removeSpaces: false
});
<contextBeforeCursor>
function transformData(data, options) {
    const result = [];
    for (let item of data) {
        <cursorPosition>`);

  let fewShotAssistant = $state(`let processed = item;
        if (options.uppercase) {
            processed = processed.toUpperCase();
        }
        if (options.removeSpaces) {
            processed = processed.replace(/\\s+/g, '');
        }
        result.push(processed);
    }
<endCompletion>
if (typeof item === 'string') {
            let processed = item;
            if (options.uppercase) {
                processed = processed.toUpperCase();
            }
            if (options.removeSpaces) {
                processed = processed.replace(/\\s+/g, '');
            }
            result.push(processed);
        } else {
            result.push(item);
        }
    }
<endCompletion>`);

  let codePreview = $state(`function transformData(data, options) {
    const result = [];
    for (let item of data) {
        <|cursor|>
    return result;
}

const processedData = transformData(rawData, {
    uppercase: true,
    removeSpaces: false
});`);

  // Derive context before/after cursor by splitting on the marker
  let contextBeforeCursor = $derived(codePreview.split('<|cursor|>')[0] || '');
  let contextAfterCursor = $derived(codePreview.split('<|cursor|>')[1] || '');

  // Default models
  const defaultModels = [
    'mistralai/devstral-2512:free',
    'kwaipilot/kat-coder-pro:free',
    'qwen/qwen3-4b:free',
    'qwen/qwen3-coder:free',
    'google/gemini-2.0-flash-exp:free'
  ];

  let models = $state<ModelTest[]>(
    defaultModels.map((name) => ({
      id: crypto.randomUUID(),
      name,
      result: null,
      isRunning: false
    }))
  );

  let isRunningTests = $state(false);

  // Derived state for max times (for progress bars)
  let maxTimeToFirstToken = $derived(
    Math.max(
      ...models
        .filter((m) => m.result?.timeToFirstToken != null)
        .map((m) => m.result!.timeToFirstToken!)
    ) || 1
  );

  let maxTotalTime = $derived(
    Math.max(
      ...models.filter((m) => m.result?.totalTime != null).map((m) => m.result!.totalTime!)
    ) || 1
  );

  // Load token from localStorage on mount
  $effect(() => {
    const storedToken = localStorage.getItem('openrouter-api-token');
    if (storedToken) {
      apiToken = storedToken;
      hasStoredToken = true;
    }
  });

  // Save token to localStorage
  function saveToken() {
    if (!apiToken) {
      alert('Please enter a token before saving');
      return;
    }
    localStorage.setItem('openrouter-api-token', apiToken);
    hasStoredToken = true;
  }

  // Clear token from localStorage
  function clearToken() {
    localStorage.removeItem('openrouter-api-token');
    apiToken = '';
    hasStoredToken = false;
  }

  // Add custom model
  function addModel() {
    if (!customModelInput.trim()) return;

    models.push({
      id: crypto.randomUUID(),
      name: customModelInput.trim(),
      result: null,
      isRunning: false
    });

    customModelInput = '';
  }

  // Remove model
  function removeModel(id: string) {
    models = models.filter((m) => m.id !== id);
  }

  // Test a single model
  async function testModel(model: ModelTest) {
    if (!effectiveApiKey) {
      alert('Please enter your OpenRouter API token or log in with OAuth');
      return;
    }

    model.isRunning = true;
    model.result = null;

    const language = '# language: javascript';
    const tab = '# tab: 4 spaces';

    // Build request based on FIM mode
    const endpoint = useFIM
      ? 'https://openrouter.ai/api/v1/completions'
      : 'https://openrouter.ai/api/v1/chat/completions';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let requestBody: any;

    if (useFIM) {
      // FIM mode: simple prompt/suffix structure
      const prompt = `${language}\n${tab}\n${contextBeforeCursor}`;
      const suffix = contextAfterCursor;

      requestBody = {
        model: model.name,
        prompt: prompt,
        suffix: suffix,
        max_tokens: 256,
        temperature: 0.7,
        stream: true
      };
    } else {
      // Chat mode: full system prompt and few-shot examples
      const fullSystemPrompt = `${systemPrompt}\n${guidelines}`;

      const userMessage = `${language}
${tab}
<contextAfterCursor>${contextAfterCursor}
<contextBeforeCursor>
${contextBeforeCursor}<cursorPosition>`;

      const messages = [
        { role: 'system', content: fullSystemPrompt },
        { role: 'user', content: fewShotUser },
        { role: 'assistant', content: fewShotAssistant },
        { role: 'user', content: userMessage }
      ];

      requestBody = {
        model: model.name,
        messages: messages,
        max_tokens: 256,
        temperature: 0.7,
        stream: true
      };
    }

    const startTime = performance.now();
    let firstTokenTime: number | null = null;
    let completionText = '';

    // Create abort controller for timeout
    const abortController = new AbortController();
    const timeoutMs = 20000; // 20 seconds
    const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${effectiveApiKey}`,
          'HTTP-Referer': 'https://martinemde.com',
          'X-Title': 'OpenRouter Model Tester',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: abortController.signal
      });

      if (!response.ok) {
        const errorText = await response.text();

        // Handle 429 rate limiting specifically
        if (response.status === 429) {
          throw new Error(`Rate limited (429): ${errorText}`);
        }

        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

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
              // FIM mode uses .text, chat mode uses .delta.content
              const content = useFIM
                ? parsed.choices?.[0]?.text || ''
                : parsed.choices?.[0]?.delta?.content || '';

              if (content) {
                if (firstTokenTime === null) {
                  firstTokenTime = performance.now();
                }
                completionText += content;
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      const endTime = performance.now();

      model.result = {
        timeToFirstToken: firstTokenTime ? firstTokenTime - startTime : null,
        totalTime: endTime - startTime,
        output: completionText
      };
    } catch (error) {
      let errorMessage: string;

      if (error instanceof Error && error.name === 'AbortError') {
        errorMessage = `Timed out after ${(timeoutMs / 1000).toFixed(1)} seconds`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = 'Unknown error';
      }

      model.result = {
        timeToFirstToken: null,
        totalTime: null,
        output: '',
        error: errorMessage
      };
    } finally {
      clearTimeout(timeoutId);
      model.isRunning = false;
    }
  }

  // Run all tests sequentially
  async function runAllTests() {
    if (!effectiveApiKey) {
      alert('Please enter your OpenRouter API token or log in with OAuth');
      return;
    }

    isRunningTests = true;

    for (const model of models) {
      await testModel(model);
    }

    isRunningTests = false;
  }
</script>

<div class="container mx-auto max-w-6xl space-y-8 p-4">
  <!-- Header -->
  <div class="space-y-2">
    <h1 class="h1 text-surface-950-50">OpenRouter Model Tester</h1>
    <p class="text-surface-600-400">
      Test and compare response times across different OpenRouter models
    </p>
  </div>

  <!-- Config Section -->
  <section class="variant-filled-surface space-y-4 card p-6">
    <h2 class="h2 text-surface-950-50">Configuration</h2>
    <p class="text-sm text-surface-600-400">
      Your OpenRouter API token is loaded only in the browser and stored in memory. It will be lost
      when you refresh the page. For transparency, you can view the source code on
      <a
        href="https://github.com/martinemde/martinemde.com/blob/main/src/routes/models/+page.svelte"
        class="anchor"
        target="_blank"
        rel="noopener noreferrer">GitHub</a
      >.
    </p>

    {#if authState.isAuthenticated}
      <div class="rounded-lg bg-success-500/10 p-4 text-success-500">
        <div class="flex items-center justify-between">
          <div class="space-y-1">
            <p class="font-semibold">Authenticated via OAuth</p>
            {#if authState.user}
              <p class="text-sm text-surface-600-400">
                Logged in as {authState.user.name || authState.user.email}
              </p>
            {/if}
          </div>
        </div>
      </div>
    {:else}
      <div class="space-y-2">
        <span class="text-surface-950-50">OpenRouter API Token</span>
        {#if hasStoredToken}
          <div class="flex items-center gap-2">
            <span class="text-sm text-surface-600-400">Token saved in local storage</span>
            <button onclick={clearToken} class="variant-ghost-error btn btn-sm">
              Clear Token
            </button>
          </div>
        {:else}
          <div class="space-y-3">
            <div class="flex gap-2">
              <input
                type="password"
                bind:value={apiToken}
                placeholder="sk-or-v1-..."
                class="variant-filled input flex-1"
              />
              <button onclick={saveToken} class="variant-filled-primary btn">
                Save in Local Storage
              </button>
            </div>
            <p class="text-sm text-surface-600-400">
              Or <button onclick={initiateOAuthLogin} class="anchor">login with OpenRouter</button> to
              use OAuth
            </p>
          </div>
        {/if}
      </div>
    {/if}
  </section>

  <!-- Run Tests Section -->
  <section class="flex justify-center">
    <button
      onclick={runAllTests}
      disabled={isRunningTests || !effectiveApiKey || models.length === 0}
      class="preset-filled-primary btn btn-lg"
    >
      {isRunningTests ? 'Running Tests...' : 'Run All Tests'}
    </button>
  </section>

  <!-- Model Selection -->
  <section class="variant-filled-surface space-y-4 card p-6">
    <h2 class="h2 text-surface-950-50">Models</h2>

    <div class="flex gap-2">
      <input
        type="text"
        bind:value={customModelInput}
        placeholder="Add model (e.g., mistralai/devstral-2512:free)"
        class="variant-filled input flex-1"
        onkeydown={(e) => e.key === 'Enter' && addModel()}
      />
      <button onclick={addModel} class="variant-filled-primary btn">Add</button>
    </div>

    <!-- Model Cards Grid -->
    <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {#each models as model (model.id)}
        <div class="variant-filled-surface space-y-3 card p-4">
          <div class="flex items-start justify-between gap-2">
            <h3 class="text-sm font-semibold break-all text-surface-950-50">{model.name}</h3>
            <button
              onclick={() => removeModel(model.id)}
              class="variant-ghost-error btn btn-sm"
              aria-label="Remove model"
            >
              ×
            </button>
          </div>

          <!-- Time to First Token -->
          <div class="space-y-2">
            <div class="text-xs text-surface-600-400">Time to First Token</div>
            {#if model.isRunning}
              <Progress class="w-fit items-center" value={null}>
                <Progress.Circle>
                  <Progress.CircleTrack />
                  <Progress.CircleRange />
                </Progress.Circle>
                <Progress.ValueText />
              </Progress>
            {:else if model.result?.error}
              <Progress class="w-fit items-center" value={0}>
                <Progress.Circle>
                  <Progress.CircleTrack class="stroke-error-50-950" />
                  <Progress.CircleRange class="stroke-error-500" />
                </Progress.Circle>
              </Progress>
            {:else if model.result?.timeToFirstToken != null}
              <Progress
                class="w-fit items-center"
                value={model.result.timeToFirstToken}
                max={maxTimeToFirstToken}
              >
                <Progress.Circle>
                  <Progress.CircleTrack />
                  <Progress.CircleRange />
                </Progress.Circle>
                <Progress.ValueText>
                  <Progress.Context>
                    {model.result!.timeToFirstToken!.toFixed(0)}ms
                  </Progress.Context>
                </Progress.ValueText>
              </Progress>
            {:else if model.result?.totalTime != null}
              <!-- Non-streaming model: show total time for both -->
              <Progress
                class="w-fit items-center"
                value={model.result.totalTime}
                max={maxTotalTime}
              >
                <Progress.Circle>
                  <Progress.CircleTrack />
                  <Progress.CircleRange />
                </Progress.Circle>
                <Progress.ValueText>
                  <Progress.Context>
                    {model.result!.totalTime!.toFixed(0)}ms
                  </Progress.Context>
                </Progress.ValueText>
              </Progress>
            {:else}
              <div class="text-xs text-surface-600-400">—</div>
            {/if}
          </div>

          <!-- Total Time -->
          <div class="space-y-2">
            <div class="text-xs text-surface-600-400">Total Time</div>
            {#if model.isRunning}
              <Progress class="w-fit items-center" value={null}>
                <Progress.Circle>
                  <Progress.CircleTrack />
                  <Progress.CircleRange />
                </Progress.Circle>
                <Progress.ValueText />
              </Progress>
            {:else if model.result?.error}
              <Progress class="w-fit items-center" value={0}>
                <Progress.Circle>
                  <Progress.CircleTrack class="stroke-error-50-950" />
                  <Progress.CircleRange class="stroke-error-500" />
                </Progress.Circle>
              </Progress>
            {:else if model.result?.totalTime != null}
              <Progress
                class="w-fit items-center"
                value={model.result.totalTime}
                max={maxTotalTime}
              >
                <Progress.Circle>
                  <Progress.CircleTrack />
                  <Progress.CircleRange />
                </Progress.Circle>
                <Progress.ValueText>
                  <Progress.Context>
                    {model.result!.totalTime!.toFixed(0)}ms
                  </Progress.Context>
                </Progress.ValueText>
              </Progress>
            {:else}
              <div class="text-xs text-surface-600-400">—</div>
            {/if}
          </div>

          <!-- Output -->
          {#if model.result?.error}
            <div class="rounded bg-error-500/10 p-2 text-xs text-error-500">
              {model.result.error}
            </div>
          {:else if model.result?.output}
            <div class="space-y-1">
              <div class="text-xs text-surface-600-400">Output</div>
              <pre class="max-h-32 overflow-x-auto rounded bg-surface-100-900 p-2 text-xs"><code
                  >{model.result.output}</code
                ></pre>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </section>

  <!-- Prompts Section -->
  <section class="variant-filled-surface space-y-4 card p-6">
    <button
      onclick={() => (promptsExpanded = !promptsExpanded)}
      class="flex w-full items-center justify-between text-left"
    >
      <h2 class="h2 text-surface-950-50">Prompts</h2>
      <span class="text-surface-600-400">{promptsExpanded ? '▼' : '▶'}</span>
    </button>

    <!-- FIM Mode Toggle -->
    <label class="flex items-center gap-2">
      <input type="checkbox" bind:checked={useFIM} class="checkbox" />
      <span class="text-surface-950-50">
        Use Fill-In-Middle (FIM) mode
        <span class="text-xs text-surface-600-400">(simpler prompt, /completions endpoint)</span>
      </span>
    </label>

    {#if promptsExpanded}
      <p class="text-sm text-surface-600-400">
        {#if useFIM}
          FIM mode uses a simple prompt/suffix structure with the /completions endpoint.
        {:else}
          These prompts apply to all models tested. They are based on the code completion test from
          test_chat.ts.
        {/if}
      </p>

      <!-- Code Preview -->
      <label class="space-y-2">
        <span class="text-surface-950-50">Code Preview</span>
        <p class="text-xs text-surface-600-400">
          Edit the code below. Place <code class="rounded bg-surface-100-900 px-1"
            >&lt;|cursor|&gt;</code
          > where you want the model to generate completions.
        </p>
        <textarea bind:value={codePreview} rows="12" class="variant-filled textarea font-mono"
        ></textarea>
      </label>

      {#if !useFIM}
        <label class="space-y-2">
          <span class="text-surface-950-50">System Prompt</span>
          <textarea bind:value={systemPrompt} rows="8" class="variant-filled textarea"></textarea>
        </label>

        <label class="space-y-2">
          <span class="text-surface-950-50">Guidelines</span>
          <textarea bind:value={guidelines} rows="8" class="variant-filled textarea"></textarea>
        </label>

        <label class="space-y-2">
          <span class="text-surface-950-50">Few-shot User Example</span>
          <textarea bind:value={fewShotUser} rows="8" class="variant-filled textarea"></textarea>
        </label>

        <label class="space-y-2">
          <span class="text-surface-950-50">Few-shot Assistant Example</span>
          <textarea bind:value={fewShotAssistant} rows="10" class="variant-filled textarea"
          ></textarea>
        </label>
      {/if}
    {/if}
  </section>
</div>
