import { describe, it, expect } from 'vitest';
import { buildStatusDistribution } from '../statusDistribution';
import en from '../../i18n/en';
import zh from '../../i18n/zh';
import type { ApplicationStatus, JobApplicationDTO } from '../../api/types';

function apps(...statuses: ApplicationStatus[]): JobApplicationDTO[] {
  return statuses.map((status, i) => ({ id: i, status } as JobApplicationDTO));
}

describe('buildStatusDistribution', () => {
  it('gives Phone Screen its own slice instead of folding it into Applied', () => {
    const slices = buildStatusDistribution(apps('APPLIED', 'PHONE_SCREEN', 'PHONE_SCREEN'), en);

    expect(slices).toEqual([
      { name: 'Applied', value: 1, color: '#4f6ef7' },
      { name: 'Phone Screen', value: 2, color: '#06b6d4' },
    ]);
  });

  it('counts all six statuses in a fixed order', () => {
    const slices = buildStatusDistribution(
      apps('REJECTED', 'OFFER', 'INTERVIEW', 'PHONE_SCREEN', 'IN_REVIEW', 'APPLIED', 'APPLIED'), en);

    expect(slices.map((s) => [s.name, s.value])).toEqual([
      ['Applied', 2], ['In Review', 1], ['Phone Screen', 1], ['Interview', 1], ['Offer', 1], ['Rejected', 1],
    ]);
    // Every slice has a distinct color
    expect(new Set(slices.map((s) => s.color)).size).toBe(6);
  });

  it('leaves out empty statuses and handles no data', () => {
    expect(buildStatusDistribution(apps('OFFER'), en).map((s) => s.name)).toEqual(['Offer']);
    expect(buildStatusDistribution([], en)).toEqual([]);
  });

  it('uses the current language for labels', () => {
    expect(buildStatusDistribution(apps('PHONE_SCREEN'), zh)[0].name).toBe('电话筛选');
  });
});
