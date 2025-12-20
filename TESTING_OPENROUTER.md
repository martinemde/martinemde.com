# Testing OpenRouter with Minuet Templates

Two TypeScript scripts to test OpenRouter API with the prompt templates from `lua/minuet/config.lua`.

## Scripts

1. **test_fim.ts** - Tests Fill-In-the-Middle (FIM) completion using the `openai_fim_compatible` template
2. **test_chat.ts** - Tests chat completion using the `openai_compatible` template

## Prerequisites

- Bun or Node.js with ts-node installed
- OpenRouter API key set in environment: `export OPENROUTER_API_KEY=your_key_here`

## Usage

### Using Bun (recommended)

```bash
# Set your API key
export OPENROUTER_API_KEY=your_key_here

# Test FIM completion
bun run test_fim.ts

# Test chat completion
bun run test_chat.ts
```

### Using ts-node

```bash
# Set your API key
export OPENROUTER_API_KEY=your_key_here

# Test FIM completion
npx ts-node test_fim.ts

# Test chat completion
npx ts-node test_chat.ts
```

## What the Scripts Measure

Both scripts measure and report:

- **Time to first token**: Latency from request start until the first token arrives
- **Total completion time**: End-to-end request duration
- **Total characters received**: Length of the completion

## Output Example

```
=== Chat Completion Test ===

Model: mistralai/devstral-small

System Prompt:
---
You are an AI code completion engine...
---

User Message:
---
# language: javascript
# tab: 4 spaces
<contextAfterCursor>
...
---

Completion:
---
let processed = item;
        if (options.uppercase) {
            processed = processed.toUpperCase();
        }
---

=== Timing Results ===
Time to first token: 234.56 ms
Total completion time: 1234.56 ms
Total characters received: 123
```

## Customization

To test different models or contexts:

1. Edit the `requestBody.model` in either script
2. Modify `contextBeforeCursor` and `contextAfterCursor` variables
3. Adjust `max_tokens`, `temperature`, or other parameters

## Notes

- FIM endpoint: `https://openrouter.ai/api/v1/completions`
- Chat endpoint: `https://openrouter.ai/api/v1/chat/completions`
- Both scripts use streaming for realistic completion timing
- The prompts match exactly what Minuet sends to the LLM
