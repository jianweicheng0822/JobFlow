import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Dashboard from '../Dashboard';
import { LanguageProvider } from '../../context/LanguageProvider';
import type { JobApplicationDTO } from '../../api/types';

const app: JobApplicationDTO = {
  id: 1,
  positionTitle: 'Frontend Dev',
  company: { id: 1, name: 'Acme', logoUrl: null, location: null, website: null },
  location: 'Remote',
  salary: null,
  status: 'APPLIED',
  appliedDate: '2026-07-17',
  lastAction: null,
  notes: null,
  starred: false,
  createdAt: '2026-07-17T00:00:00',
  updatedAt: '2026-07-17T00:00:00',
};

vi.mock('../../api/applications', () => ({
  getStats: vi.fn().mockResolvedValue({
    data: { totalApplications: 1, inReview: 0, interviews: 0, offers: 0, rejections: 0, interviewRate: 0, offerRate: 0 },
  }),
  getApplications: vi.fn(() => Promise.resolve({ data: [app] })),
  getRecentApplications: vi.fn(() => Promise.resolve({ data: [app] })),
}));

vi.mock('../../api/interviews', () => ({
  getUpcomingInterviews: vi.fn().mockResolvedValue({ data: [] }),
}));

describe('Dashboard pipeline card date', () => {
  beforeEach(() => localStorage.setItem('language', 'en'));
  afterEach(() => localStorage.removeItem('language'));

  it('shows "Date Applied: <date>" with a single colon', async () => {
    render(<Dashboard />, { wrapper: LanguageProvider });

    const label = await screen.findByText(/Date Applied/);
    expect(label.textContent).toBe('Date Applied: Jul 17, 2026');
  });

  it('does the same in Chinese', async () => {
    localStorage.setItem('language', 'zh');
    render(<Dashboard />, { wrapper: LanguageProvider });

    const label = await screen.findByText(/投递日期/);
    expect(label.textContent).toBe('投递日期: Jul 17, 2026');
  });
});
