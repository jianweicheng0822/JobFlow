import { describe, it, expect } from 'vitest';
import { weeklyApplicationCounts, weeklyWindows } from '../weeklyCounts';

const app = (appliedDate: string | null, createdAt = '2026-01-01T12:00:00') => ({ appliedDate, createdAt });

describe('weeklyApplicationCounts', () => {
  const today = '2026-10-24';

  it('buckets applications into rolling 7-day windows ending today, oldest first', () => {
    const apps = [
      app('2026-10-24'), // today -> last window
      app('2026-10-18'), // 6 days ago -> still last window
      app('2026-10-17'), // 7 days ago -> the window before
      app('2026-10-03'), // 21 days ago -> 4th window from the end
    ];
    expect(weeklyApplicationCounts(apps, 4, today)).toEqual([1, 0, 1, 2]);
  });

  it('ignores jobs older than the range and dates in the future', () => {
    const apps = [app('2026-08-01'), app('2026-10-30'), app('2026-10-20')];
    expect(weeklyApplicationCounts(apps, 2, today)).toEqual([0, 1]);
  });

  it('falls back to the day the job was added when there is no applied date', () => {
    expect(weeklyApplicationCounts([app(null, '2026-10-22T09:00:00')], 2, today)).toEqual([0, 1]);
  });

  it('returns all zeros for no applications', () => {
    expect(weeklyApplicationCounts([], 3, today)).toEqual([0, 0, 0]);
  });

  it('counts across a DST change without shifting a day', () => {
    // US clocks go back on 2026-11-01
    expect(weeklyApplicationCounts([app('2026-10-29')], 2, '2026-11-04')).toEqual([0, 1]);
  });
});

describe('weeklyWindows', () => {
  it('matches the windows used for counting, oldest first', () => {
    expect(weeklyWindows(2, '2026-10-24')).toEqual([
      { start: '2026-10-11', end: '2026-10-17' },
      { start: '2026-10-18', end: '2026-10-24' },
    ]);
  });
});
