import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { todayLocal, formatDateOnly } from '../date';

// Run as someone in UTC-6, where the UTC date rolls over at 6pm local time
const originalTZ = process.env.TZ;
beforeAll(() => { process.env.TZ = 'America/Denver'; });
afterAll(() => { process.env.TZ = originalTZ; });
afterEach(() => { vi.useRealTimers(); });

describe('todayLocal', () => {
  it("uses the local date, not UTC's, in the evening", () => {
    vi.useFakeTimers();
    // 7:30pm Oct 6 in Denver = 01:30 Oct 7 UTC
    vi.setSystemTime(new Date('2026-10-07T01:30:00Z'));

    expect(new Date().toISOString().slice(0, 10)).toBe('2026-10-07'); // the old, wrong answer
    expect(todayLocal()).toBe('2026-10-06');
  });

  it('pads month and day', () => {
    expect(todayLocal(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('formatDateOnly', () => {
  it('shows the stored calendar date, not the day before', () => {
    expect(new Date('2026-10-15').getDate()).toBe(14); // what the old code did here
    expect(formatDateOnly('2026-10-15')).toBe('Oct 15, 2026');
  });

  it('handles month and year edges', () => {
    expect(formatDateOnly('2026-01-01')).toBe('Jan 1, 2026');
    expect(formatDateOnly('2026-12-31')).toBe('Dec 31, 2026');
  });

  it('returns an empty string for missing or malformed values', () => {
    expect(formatDateOnly(null)).toBe('');
    expect(formatDateOnly(undefined)).toBe('');
    expect(formatDateOnly('')).toBe('');
    expect(formatDateOnly('not-a-date')).toBe('');
  });
});
