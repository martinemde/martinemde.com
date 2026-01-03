<script lang="ts">
  import { onMount } from 'svelte';
  import { resolve } from '$app/paths';
  import { authStore } from '$lib/auth/state.svelte';
  import PHRASES from './phrases.json';

  // Use authenticated API key
  const { state: authState } = authStore;
  let effectiveApiKey = $derived(authState.apiKey || '');

  // Message type for conversation history
  type Message = {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    reasoning?: string; // Thinking/reasoning from the model
    tool_calls?: Array<{
      id: string;
      type: string;
      function: { name: string; arguments: string };
    }>;
    tool_call_id?: string;
    name?: string;
  };

  // Reactive state using Svelte 5 runes
  let currentMode = $state<'play' | 'party' | 'sleep'>('play');
  let userInput = $state('');
  let toyOutput = $state('...');
  let debugOutput = $state('');
  let isListening = $state(false);
  let speechSupported = $state(false);
  let autoListenMode = $state(false);
  let conversationHistory = $state<Message[]>([]);

  // Speech API references
  let recognition: SpeechRecognition | null = null;
  let synthesis: SpeechSynthesis | null = null;
  let messageContainer = $state<HTMLDivElement | null>(null);

  // Type for phrase keys
  type PhraseKey = keyof typeof PHRASES;

  function scrollChatBottom() {
    if (messageContainer) {
      messageContainer.scrollTo({ top: messageContainer.scrollHeight, behavior: 'smooth' });
    }
  }

  const tools = [
    {
      type: 'function',
      function: {
        name: 'switch_mode',
        description: "Switch the toy's mode (play, party, sleep)",
        parameters: {
          type: 'object',
          properties: {
            mode: {
              type: 'string',
              enum: ['play', 'party', 'sleep'],
              description: 'The mode to switch to'
            }
          },
          required: ['mode']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'say_phrase',
        description:
          'Say one of the prerecorded phrases. Choose the most contextually appropriate phrase.',
        parameters: {
          type: 'object',
          properties: {
            slug: {
              type: 'string',
              enum: Object.keys(PHRASES),
              description: 'The slug of the phrase to say'
            }
          },
          required: ['slug']
        }
      }
    }
  ];

  function keepLastN(messages: Message[], n: number): Message[] {
    // Always keep the system message if it exists, then the last N-1 messages
    const systemMsg = messages.find((m) => m.role === 'system');
    const nonSystemMsgs = messages.filter((m) => m.role !== 'system');

    if (systemMsg) {
      return [systemMsg, ...nonSystemMsgs.slice(-(n - 1))];
    }
    return nonSystemMsgs.slice(-n);
  }

  async function sendMessage() {
    if (!userInput.trim()) return;

    if (!effectiveApiKey) {
      toyOutput = 'Please connect an LLM to use this toy!';
      debugOutput = 'No API key available. Visit /llm to connect.';
      return;
    }

    toyOutput = '...';
    debugOutput = 'Thinking...';

    // Add user message to history
    const userMessage: Message = {
      role: 'user',
      content: userInput
    };
    conversationHistory = [...conversationHistory, userMessage];

    try {
      // Build messages array with system message and conversation history
      const systemMessage: Message = {
        role: 'system',
        content: `You are a friendly toy AI. You must communicate by calling tools that have saved phrases. You cannot respond directly. Current mode: ${currentMode}. Choose appropriate phrases based on context and mode.`
      };

      const messagesToSend = keepLastN(
        [systemMessage, ...conversationHistory.filter((m) => m.role !== 'system')],
        11
      ); // System + 10 messages

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${effectiveApiKey}`,
          'HTTP-Referer': window.location.href
        },
        body: JSON.stringify({
          model: 'nvidia/nemotron-3-nano-30b-a3b:free',
          messages: messagesToSend,
          tools: tools
        })
      });

      const data = await response.json();
      debugOutput = JSON.stringify(data, null, 2);

      // Check for API errors
      if (!response.ok || data.error) {
        toyOutput = PHRASES.confused_1;
        debugOutput = `API Error (${response.status}):\n${JSON.stringify(data, null, 2)}`;
        speakText(toyOutput);
        return;
      }

      // Check if choices array exists
      if (!data.choices || data.choices.length === 0) {
        toyOutput = PHRASES.confused_1;
        debugOutput = `Unexpected response format:\n${JSON.stringify(data, null, 2)}`;
        speakText(toyOutput);
        return;
      }

      // Process assistant response
      const message = data.choices[0].message;

      // Add assistant message to history (with tool calls if present)
      const assistantMessage: Message = {
        role: 'assistant',
        content: message.content || '',
        reasoning: message.reasoning || message.thinking || '',
        tool_calls: message.tool_calls
      };
      conversationHistory = [...conversationHistory, assistantMessage];

      // Process tool calls
      if (message.tool_calls && message.tool_calls.length > 0) {
        const toolCall = message.tool_calls[0];
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        let toolResult = '';

        if (functionName === 'say_phrase') {
          const phrase = PHRASES[args.slug as PhraseKey] || PHRASES.confused_1;
          toyOutput = phrase;
          toolResult = phrase;
          speakText(phrase);
        } else if (functionName === 'switch_mode') {
          currentMode = args.mode;
          toyOutput = `[Switched to ${currentMode} mode]`;
          toolResult = `Mode switched to ${currentMode}`;
          speakText(toyOutput);
        }

        // Add tool result to history
        const toolMessage: Message = {
          role: 'tool',
          tool_call_id: toolCall.id,
          name: functionName,
          content: toolResult
        };
        conversationHistory = [...conversationHistory, toolMessage];
      } else {
        toyOutput = PHRASES.confused_1;
        speakText(toyOutput);
      }

      // Keep only last 10 non-system messages
      conversationHistory = keepLastN(conversationHistory, 10);

      // Scroll to bottom after adding messages
      setTimeout(scrollChatBottom, 100);
    } catch (error) {
      debugOutput = `Error: ${error instanceof Error ? error.message : String(error)}`;
      toyOutput = PHRASES.confused_1;
      speakText(toyOutput);
    }

    userInput = '';
  }

  function speakText(text: string) {
    if (!synthesis) return;

    // Cancel any ongoing speech
    synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = 1.2; // Slightly higher pitch for toy-like voice
    utterance.rate = 1.0; // Normal speed
    utterance.volume = 1.0;

    // Auto-restart listening after speaking finishes
    utterance.onend = () => {
      if (autoListenMode) {
        // Small delay before restarting to feel more natural
        setTimeout(() => {
          startListening();
        }, 500);
      }
    };

    synthesis.speak(utterance);
  }

  function startListening() {
    if (!recognition || isListening) return;

    try {
      recognition.start();
      isListening = true;
      autoListenMode = true;
    } catch (error) {
      console.error('Speech recognition error:', error);
    }
  }

  function stopListening() {
    if (!recognition) return;
    recognition.stop();
    isListening = false;
    autoListenMode = false;
  }

  onMount(() => {
    // Load auth state from localStorage
    authStore.loadFromStorage();

    // Check for speech recognition support
    const SpeechRecognition =
      // @ts-expect-error - webkitSpeechRecognition is not in types
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        userInput = transcript;
        isListening = false;

        // Auto-submit when speech is recognized
        if (transcript.trim()) {
          sendMessage();
        }
      };

      recognition.onspeechend = () => {
        recognition?.stop();
        isListening = false;
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Recognition error:', event.error);
        isListening = false;
      };

      recognition.onend = () => {
        isListening = false;
      };
    }

    // Check for speech synthesis support
    if (window.speechSynthesis) {
      synthesis = window.speechSynthesis;
    }

    speechSupported = !!(recognition && synthesis);

    return () => {
      if (recognition) {
        recognition.stop();
      }
      if (synthesis) {
        synthesis.cancel();
      }
    };
  });

  function handleKeypress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      sendMessage();
    }
  }
</script>

<svelte:head>
  <title>Safe AI Toy PoC</title>
</svelte:head>

<h1 class="text-2xl sm:text-3xl">Safe AI Toy Proof of Concept</h1>

{#if !authState.isAuthenticated}
  <div class="mb-4 card rounded-lg border-2 border-warning-500 bg-warning-500/10 p-4">
    <p class="text-warning-950-50">
      <strong>Connect an LLM to use this toy!</strong>
      <a href={resolve('/llm')} class="ml-2 anchor">Go to connection page →</a>
    </p>
  </div>
{/if}

<div class="mb-4 card preset-tonal-surface p-3 sm:p-4">
  <div class="mb-2 text-sm sm:text-base">
    Current Mode: <strong class="badge preset-filled-primary-500">{currentMode}</strong>
  </div>
  <div class="output">
    <strong class="text-sm sm:text-base">Toy says:</strong>
    <span class="text-base sm:text-lg">{toyOutput}</span>
  </div>
</div>

<details class="mb-4">
  <summary>Debug Info</summary>
  <div class="debug">{debugOutput}</div>
</details>

<section class="grid grid-rows-[auto_1fr_auto] overflow-hidden card">
  <!-- Header -->
  <header class="border-surface-300-600 border-b p-4">
    <h2 class="h3">Chat</h2>
  </header>

  <!-- Conversation -->
  <div
    bind:this={messageContainer}
    class="max-h-[60vh] space-y-4 overflow-y-auto bg-surface-50-950 p-4 sm:max-h-[500px]"
  >
    {#if conversationHistory.length === 0}
      <div class="py-8 text-center">
        <p class="opacity-50">No messages yet. Start a conversation!</p>
      </div>
    {:else}
      {#each conversationHistory as message, i (i)}
        {#if message.role === 'user'}
          <!-- User Message (Guest - right aligned) -->
          <div class="grid grid-cols-[1fr_auto] gap-2">
            <div class="space-y-2 card rounded-tr-none preset-tonal-primary p-4">
              <header class="flex items-center justify-between">
                <p class="font-bold">You</p>
                <small class="opacity-50">👤</small>
              </header>
              <p>{message.content}</p>
            </div>
          </div>
        {:else if message.role === 'assistant'}
          <!-- Assistant Message (Host - left aligned) -->
          <div class="grid grid-cols-[auto_1fr] gap-2">
            <div class="space-y-2 card rounded-tl-none preset-tonal p-4">
              <header class="flex items-center justify-between">
                <p class="font-bold">Toy</p>
                <small class="opacity-50">🤖</small>
              </header>
              {#if message.reasoning}
                <details class="space-y-1">
                  <summary class="cursor-pointer text-sm opacity-75 hover:opacity-100">
                    💭 Thinking process
                  </summary>
                  <div class="mt-2 max-w-xl card bg-surface-100-900 p-3 text-sm">
                    <div class="max-w-sm whitespace-pre-line">{message.reasoning}</div>
                  </div>
                </details>
              {/if}
              {#if message.content}
                <p class="italic opacity-75">{message.content}</p>
              {/if}
              {#if message.tool_calls}
                {#each message.tool_calls as toolCall, j (j)}
                  <div class="card preset-filled-surface-500 p-2 font-mono text-xs">
                    <strong>🔧 Calling:</strong>
                    {toolCall.function.name}({toolCall.function.arguments})
                  </div>
                {/each}
              {/if}
            </div>
          </div>
        {:else if message.role === 'tool'}
          <!-- Tool Result (Host - left aligned) -->
          <div class="grid grid-cols-[auto_1fr] gap-2">
            <div class="space-y-2 card rounded-tl-none preset-tonal-success p-4">
              <header class="flex items-center justify-between">
                <p class="font-bold">Tool: {message.name}</p>
                <small class="opacity-50">⚙️</small>
              </header>
              <p>{message.content}</p>
            </div>
          </div>
        {/if}
      {/each}
    {/if}
  </div>

  <!-- Prompt -->
  <footer class="border-surface-300-600 border-t p-4">
    <div class="input-group-divider rounded-container-token input-group grid-cols-[auto_1fr_auto]">
      {#if speechSupported}
        <button
          class="input-group-shim {isListening ? 'preset-filled-primary-500' : ''}"
          onclick={isListening ? stopListening : startListening}
          title={isListening ? 'Click to stop listening' : 'Click to speak'}
        >
          {isListening ? '🔴' : '🎤'}
        </button>
      {/if}
      <input
        class="input"
        type="text"
        bind:value={userInput}
        onkeypress={handleKeypress}
        placeholder="Say something..."
      />
      <button
        class={userInput.trim() ? 'preset-filled-primary-500' : 'preset-tonal-surface'}
        onclick={sendMessage}
        disabled={!userInput.trim()}
      >
        Send
      </button>
    </div>
  </footer>
</section>
