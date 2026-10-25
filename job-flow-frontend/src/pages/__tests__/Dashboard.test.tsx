import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Dashboard from '../Dashboard';
import { LanguageProvider } from '../../context/LanguageProvider';
import type { JobApplicationDTO } from '../../api/types';
import { getStats, getApplications } from '../../api/applications';
import { todayLocal } from '../../utils/date';

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <MemoryRouter>
      <LanguageProvider>{children}</LanguageProvider>
    </MemoryRouter>
  );
}

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
    render(<Dashboard />, { wrapper: Wrapper });

    const label = await screen.findByText(/Date Applied/);
    expect(label.textContent).toBe('Date Applied: Jul 17, 2026');
  });

  it('does the same in Chinese', async () => {
    localStorage.setItem('language', 'zh');
    render(<Dashboard />, { wrapper: Wrapper });

    const label = await screen.findByText(/投递日期/);
    expect(label.textContent).toBe('投递日期: Jul 17, 2026');
  });
});

describe('Dashboard stat cards', () => {
  const daysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return todayLocal(d);
  };
  const appliedOn = (id: number, day: string, status: JobApplicationDTO['status'] = 'APPLIED') =>
    ({ ...app, id, appliedDate: day, status });

  beforeEach(() => localStorage.setItem('language', 'en'));
  afterEach(() => localStorage.removeItem('language'));

  it('draws the real weekly line and counts the last 7 days', async () => {
    vi.mocked(getApplications).mockResolvedValueOnce({
      data: [appliedOn(1, daysAgo(0)), appliedOn(2, daysAgo(3)), appliedOn(3, daysAgo(10))],
    } as never);
    render(<Dashboard />, { wrapper: Wrapper });

    expect(await screen.findByText('+2 in the last 7 days')).toBeInTheDocument();
    // 8 weeks, oldest first: one job 10 days ago, two this week
    expect(screen.getByRole('img', { name: /applications per week/i }))
      .toHaveAccessibleName('Applications per week, last 8 weeks: 0, 0, 0, 0, 0, 0, 1, 2');
  });

  it('says so plainly when nothing was sent in the last 7 days', async () => {
    vi.mocked(getApplications).mockResolvedValueOnce({ data: [appliedOn(1, daysAgo(20))] } as never);
    render(<Dashboard />, { wrapper: Wrapper });

    expect(await screen.findByText('None in the last 7 days yet')).toBeInTheDocument();
  });

  it('shows each status as a share of all applications and links to that list', async () => {
    vi.mocked(getStats).mockResolvedValueOnce({
      data: { totalApplications: 10, inReview: 2, interviews: 1, offers: 1, rejections: 3, interviewRate: 10, offerRate: 10 },
    } as never);
    render(<Dashboard />, { wrapper: Wrapper });

    const offers = await screen.findByRole('link', { name: /offers/i });
    expect(offers).toHaveAttribute('href', '/jobs?status=OFFER');
    expect(within(offers).getByText('10% of all applications')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /rejections/i })).toHaveTextContent('30% of all applications');
  });

  it('holds back percentages until there are 5 applications', async () => {
    // The default mock has a single application
    render(<Dashboard />, { wrapper: Wrapper });

    const offers = await screen.findByRole('link', { name: /offers/i });
    expect(offers).toHaveTextContent('Share shows after 5 applications');
    expect(offers).not.toHaveTextContent('%');
  });
});
