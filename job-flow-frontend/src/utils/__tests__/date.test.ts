import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { todayLocal, formatDateOnly, formatTimeOf, setAppTimeZone, dateKey, wallClockIn, wallClockToInstant, bookedTimeIfDifferent } from '../date';

// Run as someone in UTC-6, where the UTC date rolls over at 6pm local time
const originalTZ = process.env.TZ;
beforeAll(() => { process.env.TZ = 'America/Denver'; });
afterAll(() => { process.env.TZ = originalTZ; });
afterEach(() => { vi.useRealTimers(); setAppTimeZone(null); });

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

describe('the zone saved in Settings', () => {
  // Device in Denver, account set to Shanghai (say, on a trip)
  const moment = new Date('2026-10-07T01:30:00Z'); // 7:30pm Oct 6 Denver, 9:30am Oct 7 Shanghai

  it('decides what "today" is', () => {
    expect(todayLocal(moment)).toBe('2026-10-06');
    setAppTimeZone('Asia/Shanghai');
    expect(todayLocal(moment)).toBe('2026-10-07');
  });

  it('decides the clock times are shown on', () => {
    setAppTimeZone('Asia/Shanghai');
    expect(formatTimeOf(moment.toISOString(), 'zh')).toBe('9:30');
    // Unless a zone is asked for, e.g. the company's
    expect(formatTimeOf(moment.toISOString(), 'en', 'America/Los_Angeles')).toBe('6:30 PM');
  });

  it('ignores a zone the browser does not know', () => {
    setAppTimeZone('Mars/Olympus');
    expect(todayLocal(moment)).toBe('2026-10-06');
  });

  it("leaves calendar math on plain local dates", () => {
    setAppTimeZone('Asia/Shanghai');
    expect(dateKey(new Date(2026, 9, 6))).toBe('2026-10-06');
    expect(wallClockIn(moment, 'Asia/Shanghai')).toBe('2026-10-07T09:30:00');
  });
});

describe('interviews booked on another clock', () => {
  it('turns a wall-clock time in a zone into the real moment, across DST', () => {
    expect(wallClockToInstant('2026-11-10T10:00', 'America/Los_Angeles').toISOString()).toBe('2026-11-10T18:00:00.000Z');
    expect(wallClockToInstant('2026-07-10T10:00:00', 'America/Los_Angeles').toISOString()).toBe('2026-07-10T17:00:00.000Z');
    expect(wallClockToInstant('2026-11-10T10:00', 'Asia/Shanghai').toISOString()).toBe('2026-11-10T02:00:00.000Z');
  });

  it('shows the booked time only when it reads differently from the user\'s clock', () => {
    setAppTimeZone('Asia/Shanghai');
    const la = { interviewDate: '2026-11-10T10:00:00', timeZone: 'America/Los_Angeles', startsAt: '2026-11-10T18:00:00Z' };
    expect(bookedTimeIfDifferent(la)).toBe('10:00 AM PST');

    // Hong Kong reads the same as Shanghai, so there's nothing to add
    const hk = { interviewDate: '2026-11-10T10:00:00', timeZone: 'Asia/Hong_Kong', startsAt: '2026-11-10T02:00:00Z' };
    expect(bookedTimeIfDifferent(hk)).toBeNull();
    expect(bookedTimeIfDifferent({ interviewDate: '2026-11-10T10:00:00' })).toBeNull();
  });
});
