import { describe, it, expect } from 'vitest';
import {
  calculateReadingTime,
  formatPostDate,
  formatPostDateShort,
  formatPostDay,
  formatPostTime,
  postDateTime
} from './post-format';

describe('post display helpers', () => {
  describe('formatPostDate', () => {
    it('should format Date object', () => {
      const date = new Date('2025-10-05T19:00:00Z'); // October 5, 2025
      const formatted = formatPostDate(date);
      expect(formatted).toMatch(/October 5, 2025/);
    });

    it('should format dates consistently', () => {
      const date1 = new Date('2025-10-05T19:00:00Z');
      const date2 = new Date('2025-10-05T19:00:00Z');

      expect(formatPostDate(date1)).toBe(formatPostDate(date2));
    });
  });

  describe('formatPostDateShort', () => {
    it('formats a date as short month, day, year', () => {
      const date = new Date('2026-01-22T20:00:00Z'); // January 22, 2026
      expect(formatPostDateShort(date)).toBe('Jan 22, 2026');
    });

    it('formats a two-digit day without leading zero', () => {
      const date = new Date('2025-11-30T20:00:00Z'); // November 30, 2025
      expect(formatPostDateShort(date)).toBe('Nov 30, 2025');
    });
  });

  it.each([
    ['2026-01-02T07:59:59Z', 'January 1, 2026', 'Jan 1, 2026', '11:59 PM'],
    ['2026-01-02T08:00:00Z', 'January 2, 2026', 'Jan 2, 2026', '12:00 AM'],
    ['2026-07-02T07:00:00Z', 'July 2, 2026', 'Jul 2, 2026', '12:00 AM'],
    ['2026-03-08T09:59:59Z', 'March 8, 2026', 'Mar 8, 2026', '1:59 AM'],
    ['2026-03-08T10:00:00Z', 'March 8, 2026', 'Mar 8, 2026', '3:00 AM'],
    ['2026-11-01T08:30:00Z', 'November 1, 2026', 'Nov 1, 2026', '1:30 AM'],
    ['2026-11-01T09:30:00Z', 'November 1, 2026', 'Nov 1, 2026', '1:30 AM']
  ])('uses Pacific midnight and DST rules for %s', (instant, long, short, time) => {
    const date = new Date(instant);
    expect(formatPostDate(date)).toBe(long);
    expect(formatPostDateShort(date)).toBe(short);
    expect(formatPostTime(date)).toBe(time);
    expect(postDateTime(date)).toBe(date.toISOString());
  });

  it('keeps legacy calendar dates in UTC without claiming an instant', () => {
    // Both midnight UTC and the loader's noon UTC anchor retain the same calendar date.
    for (const instant of ['2026-01-02T00:00:00Z', '2026-01-02T12:00:00Z']) {
      const date = new Date(instant);
      expect(formatPostDate(date, true)).toBe('January 2, 2026');
      expect(formatPostDateShort(date, true)).toBe('Jan 2, 2026');
      expect(formatPostDay(date, true)).toBe('Friday, January 2, 2026');
      expect(formatPostTime(date, true)).toBe('Jan 2, 2026');
      expect(postDateTime(date, true)).toBe('2026-01-02');
    }
    expect(formatPostDay(new Date('2026-01-02T07:59:59Z'))).toBe('Thursday, January 1, 2026');
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
