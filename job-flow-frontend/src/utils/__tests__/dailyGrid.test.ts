import { describe, it, expect } from 'vitest';
import { dailyGrid, heatLevel } from '../dailyGrid';

const applied = (day: string) => ({ appliedDate: day, createdAt: `${day}T12:00:00` });

describe('dailyGrid', () => {
  // 2026-10-24 is a Saturday
  const today = '2026-10-24';

  it('lays out whole weeks from Monday, ending with this week', () => {
    const grid = dailyGrid([], 3, today);

    expect(grid).toHaveLength(3);
    expect(grid.every((week) => week.length === 7)).toBe(true);
    expect(grid[0][0].date).toBe('2026-10-05');
    expect(grid[2][0].date).toBe('2026-10-19');
    expect(grid[2][6].date).toBe('2026-10-25');
  });

  it('marks the rest of this week as future', () => {
    const lastWeek = dailyGrid([], 1, today)[0];

    expect(lastWeek.map((c) => c.future)).toEqual([false, false, false, false, false, false, true]);
  });

  it('counts applications on their day and ignores ones outside the grid', () => {
    const grid = dailyGrid(
      [applied('2026-10-20'), applied('2026-10-20'), applied('2026-10-06'), applied('2026-09-01')],
      3, today);

    expect(grid[2][1]).toEqual({ date: '2026-10-20', count: 2, future: false });
    expect(grid[0][1].count).toBe(1);
    expect(grid.flat().reduce((sum, c) => sum + c.count, 0)).toBe(3);
  });

  it('falls back to the day the job was added', () => {
    const grid = dailyGrid([{ appliedDate: null, createdAt: '2026-10-22T09:30:00' }], 1, today);

    expect(grid[0][3].count).toBe(1);
  });

  it('crosses month and year boundaries', () => {
    const grid = dailyGrid([], 1, '2026-01-01'); // a Thursday

    expect(grid[0].map((c) => c.date)).toEqual([
      '2025-12-29', '2025-12-30', '2025-12-31', '2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04',
    ]);
  });
});

describe('heatLevel', () => {
  it('caps at 4', () => {
    expect([0, 1, 2, 3, 4, 9].map(heatLevel)).toEqual([0, 1, 2, 3, 4, 4]);
  });
});
