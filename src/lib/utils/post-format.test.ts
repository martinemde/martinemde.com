import { describe, it, expect } from 'vitest';
import { calculateReadingTime, formatPostDate, formatPostDateShort } from './post-format';

describe('post display helpers', () => {
  describe('formatPostDate', () => {
    it('should format Date object', () => {
      const date = new Date(2025, 9, 5, 12, 0, 0); // October 5, 2025
      const formatted = formatPostDate(date);
      expect(formatted).toMatch(/October 5, 2025/);
    });

    it('should format dates consistently', () => {
      const date1 = new Date(2025, 9, 5, 12, 0, 0);
      const date2 = new Date(2025, 9, 5, 12, 0, 0);

      expect(formatPostDate(date1)).toBe(formatPostDate(date2));
    });
  });

  describe('formatPostDateShort', () => {
    it('formats a date as short month, day, year', () => {
      const date = new Date(2026, 0, 22, 12, 0, 0); // January 22, 2026
      expect(formatPostDateShort(date)).toBe('Jan 22, 2026');
    });

    it('formats a two-digit day without leading zero', () => {
      const date = new Date(2025, 10, 30, 12, 0, 0); // November 30, 2025
      expect(formatPostDateShort(date)).toBe('Nov 30, 2025');
    });
  });

  describe('calculateReadingTime', () => {
    it('does not count frontmatter words', () => {
      expect(
        calculateReadingTime(`---
title: ${'metadata '.repeat(500)}
---
A short body.`)
      ).toBe('1 min read');
    });

    it.each(['\n', '\r\n'])('only strips complete frontmatter lines (%j)', (newline) => {
      const source = [
        '---',
        'title: "A --- separator"',
        `description: ${'metadata '.repeat(500)}`,
        '---',
        'A short body.'
      ].join(newline);
      expect(calculateReadingTime(source)).toBe('1 min read');
    });

    it('does not strip a body that starts with inline dashes', () => {
      expect(calculateReadingTime(`--- inline ${'word '.repeat(201)}---`)).toBe('2 min read');
    });

    it('rounds up at the 200-word boundary', () => {
      expect(calculateReadingTime('word '.repeat(200))).toBe('1 min read');
      expect(calculateReadingTime('word '.repeat(201))).toBe('2 min read');
    });

    it('preserves empty-body and whitespace behavior', () => {
      expect(
        calculateReadingTime(`---
title: Empty
---
`)
      ).toBe('0 min read');
      expect(calculateReadingTime(' \t\n one\n two \t')).toBe('1 min read');
    });
  });
});
