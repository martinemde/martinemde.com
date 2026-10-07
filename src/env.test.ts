import { describe, expect, it } from 'vitest';
import { variables } from './env';

describe('PUBLIC_APP_URL', () => {
  it.each([
    ['https://martinemde.com', 'https://martinemde.com'],
    ['https://martinemde.com/', 'https://martinemde.com'],
    ['http://localhost:5173/', 'http://localhost:5173'],
    ['https://preview.example.com', 'https://preview.example.com']
  ])('normalizes a valid origin: %s', async (input, value) => {
    expect(await variables.PUBLIC_APP_URL.schema['~standard'].validate(input)).toEqual({ value });
  });

  it.each([
    undefined,
    '',
    'not a URL',
    '/relative',
    'ftp://example.com',
    'https://user:password@example.com',
    'https://example.com/blog',
    'https://example.com?query=1',
    'https://example.com#fragment'
  ])('rejects an invalid origin: %s', async (value) => {
    expect(await variables.PUBLIC_APP_URL.schema['~standard'].validate(value)).toHaveProperty(
      'issues'
    );
  });
});
