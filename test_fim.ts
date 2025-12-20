#!/usr/bin/env bun
/**
 * Test script for OpenRouter FIM (Fill-In-the-Middle) completion
 * Based on openai_fim_compatible template from lua/minuet/config.lua
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.error('Error: OPENROUTER_API_KEY environment variable not set');
  process.exit(1);
}

// Test code context
const contextBeforeCursor = `function transformData(data, options) {
    const result = [];
    for (let item of data) {
        `;

const contextAfterCursor = `    return result;
}

const processedData = transformData(rawData, {
    uppercase: true,
    removeSpaces: false
});`;

// Build FIM prompt according to default_fim_template
// Adds language and tab comments similar to the Lua implementation
const language = '# language: javascript';
const tab = '# tab: 4 spaces';
const prompt = `${language}\n${tab}\n${contextBeforeCursor}`;
const suffix = contextAfterCursor;

// FIM request payload
const requestBody = {
  model: 'deepseek/deepseek-chat', // OpenRouter model format
  prompt: prompt,
  suffix: suffix,
  max_tokens: 256,
  temperature: 0.7,
  stream: true
};

console.log('=== FIM Completion Test ===\n');
console.log('Model:', requestBody.model);
console.log('\nPrompt (prefix):');
console.log('---');
console.log(prompt);
console.log('---\n');
console.log('Suffix:');
console.log('---');
console.log(suffix);
console.log('---\n');

async function testFIM() {
  const startTime = performance.now();
  let firstTokenTime: number | null = null;
  let completionText = '';

  try {
    const response = await fetch('https://openrouter.ai/api/v1/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://github.com/milanglacier/minuet-ai.nvim',
        'X-Title': 'Minuet AI - FIM Test',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    console.log('Completion:\n---');

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
            const content = parsed.choices?.[0]?.text || '';

            if (content) {
              if (firstTokenTime === null) {
                firstTokenTime = performance.now();
              }
              completionText += content;
              process.stdout.write(content);
            }
          } catch (e) {
            console.error('Error parsing JSON:', e);
            // Skip invalid JSON
          }
        }
      }
    }

    const endTime = performance.now();

    console.log('\n---\n');
    console.log('=== Timing Results ===');
    console.log(
      `Time to first token: ${firstTokenTime ? (firstTokenTime - startTime).toFixed(2) : 'N/A'} ms`
    );
    console.log(`Total completion time: ${(endTime - startTime).toFixed(2)} ms`);
    console.log(`Total characters received: ${completionText.length}`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testFIM();
