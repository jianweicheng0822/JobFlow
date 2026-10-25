import { describe, it, expect } from 'vitest';
import { sortByAppliedDate } from '../sortByAppliedDate';

const app = (id: number, appliedDate: string | null, createdAt = '2026-10-01T00:00:00Z') => ({ id, appliedDate, createdAt });

describe('sortByAppliedDate', () => {
  const apps = [
    app(1, '2026-10-05'),
    app(2, null),
    app(3, '2026-10-20'),
    app(4, '2026-09-30'),
  ];

  it('puts the newest first when descending', () => {
    expect(sortByAppliedDate(apps, 'desc').map((a) => a.id)).toEqual([3, 1, 4, 2]);
  });

  it('puts the oldest first when ascending', () => {
    expect(sortByAppliedDate(apps, 'asc').map((a) => a.id)).toEqual([4, 1, 3, 2]);
  });

  it('keeps jobs without a date at the bottom in both directions', () => {
    const withGaps = [app(1, null), app(2, '2026-10-01'), app(3, null)];
    expect(sortByAppliedDate(withGaps, 'desc').map((a) => a.id)).toEqual([2, 1, 3]);
    expect(sortByAppliedDate(withGaps, 'asc').map((a) => a.id)).toEqual([2, 1, 3]);
  });

  it('breaks ties on the same day by when the job was added', () => {
    const sameDay = [
      app(1, '2026-10-05', '2026-10-05T09:00:00Z'),
      app(2, '2026-10-05', '2026-10-05T15:00:00Z'),
    ];
    expect(sortByAppliedDate(sameDay, 'desc').map((a) => a.id)).toEqual([2, 1]);
    expect(sortByAppliedDate(sameDay, 'asc').map((a) => a.id)).toEqual([1, 2]);
  });

  it('does not mutate the input array', () => {
    sortByAppliedDate(apps, 'desc');
    expect(apps.map((a) => a.id)).toEqual([1, 2, 3, 4]);
  });
});
