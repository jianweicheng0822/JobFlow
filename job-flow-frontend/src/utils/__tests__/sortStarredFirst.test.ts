import { describe, it, expect } from 'vitest';
import { sortStarredFirst } from '../sortStarredFirst';

describe('sortStarredFirst', () => {
  it('moves starred items to the front and keeps the rest in order', () => {
    const apps = [
      { id: 1, starred: false },
      { id: 2, starred: true },
      { id: 3, starred: false },
      { id: 4, starred: true },
      { id: 5, starred: false },
    ];

    expect(sortStarredFirst(apps).map((a) => a.id)).toEqual([2, 4, 1, 3, 5]);
  });

  it('does not mutate the input array', () => {
    const apps = [{ id: 1, starred: false }, { id: 2, starred: true }];
    sortStarredFirst(apps);
    expect(apps.map((a) => a.id)).toEqual([1, 2]);
  });
});
