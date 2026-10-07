import { describe, expect, it } from 'vitest';
import { params } from './params';

describe('archive route parameters', () => {
  it.each(['0000', '2026', '9999'])('accepts a four-digit year: %s', async (value) => {
    expect(await params.year['~standard'].validate(value)).toEqual({ value });
  });
  it.each(['26', '20260', 'abcd'])('rejects an invalid year: %s', async (value) => {
    expect(await params.year['~standard'].validate(value)).toHaveProperty('issues');
  });
  it.each(['01', '12'])('accepts a two-digit month: %s', async (value) => {
    expect(await params.month['~standard'].validate(value)).toEqual({ value });
  });
  it.each(['00', '13', '1'])('rejects an invalid month: %s', async (value) => {
    expect(await params.month['~standard'].validate(value)).toHaveProperty('issues');
  });
  it.each(['01', '31'])('accepts a two-digit day: %s', async (value) => {
    expect(await params.day['~standard'].validate(value)).toEqual({ value });
  });
  it.each(['00', '32', '1'])('rejects an invalid day: %s', async (value) => {
    expect(await params.day['~standard'].validate(value)).toHaveProperty('issues');
  });
});
