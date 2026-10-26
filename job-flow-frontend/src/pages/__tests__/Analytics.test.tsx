import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import Analytics from '../Analytics';
import { LanguageProvider } from '../../context/LanguageProvider';
import type { ApplicationStatus, DashboardStatsDTO, JobApplicationDTO } from '../../api/types';
import { getStats, getApplications, getActivity } from '../../api/applications';

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <MemoryRouter>
      <LanguageProvider>{children}</LanguageProvider>
    </MemoryRouter>
  );
}

const fourteenApps: DashboardStatsDTO = {
  totalApplications: 14, inReview: 3, interviews: 1, offers: 1, rejections: 3,
  responded: 9, responseRate: 64.3, interviewRate: 14.3, offerRate: 7.1,
};

function apps(...statuses: ApplicationStatus[]): JobApplicationDTO[] {
  return statuses.map((status, i) => ({
    id: i + 1, status, company: { id: 1, name: 'Acme', logoUrl: null, location: null, website: null },
  } as JobApplicationDTO));
}

vi.mock('../../api/applications', () => ({
  getStats: vi.fn(),
  getApplications: vi.fn(),
  getActivity: vi.fn(),
}));

describe('Analytics overview', () => {
  beforeAll(() => {
    // Recharts' ResponsiveContainer needs this, jsdom doesn't have it
    globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as never;
  });
  beforeEach(() => {
    localStorage.setItem('language', 'en');
    vi.mocked(getStats).mockResolvedValue({ data: fourteenApps } as never);
    vi.mocked(getApplications).mockResolvedValue({ data: apps('APPLIED', 'REJECTED') } as never);
    vi.mocked(getActivity).mockResolvedValue({
      data: [{ yearMonth: '2026-09', count: 4 }, { yearMonth: '2026-10', count: 2 }],
    } as never);
  });
  afterEach(() => localStorage.removeItem('language'));

  it('shows the counts behind each rate, using the server numbers', async () => {
    render(<Analytics />, { wrapper: Wrapper });

    expect(await screen.findByText('64%')).toBeInTheDocument();
    expect(screen.getByText('9 of 14 heard back')).toBeInTheDocument();
    expect(screen.getByText('14%')).toBeInTheDocument();
    expect(screen.getByText('2 of 14 reached interviews')).toBeInTheDocument();
    expect(screen.getByText('1 of 14 got an offer')).toBeInTheDocument();
    // No made-up trend arrows
    expect(screen.queryByText('↑')).not.toBeInTheDocument();
  });

  it('holds back rates until there are 5 applications', async () => {
    vi.mocked(getStats).mockResolvedValue({
      data: { ...fourteenApps, totalApplications: 3, responded: 2, interviews: 0, offers: 0, responseRate: 66.7, interviewRate: 0 },
    } as never);
    render(<Analytics />, { wrapper: Wrapper });

    expect(await screen.findByText('2 / 3')).toBeInTheDocument();
    expect(screen.getAllByText('Rate shows after 5 applications')).toHaveLength(2);
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it('describes the monthly chart with full month names', async () => {
    render(<Analytics />, { wrapper: Wrapper });

    expect(await screen.findByRole('img', { name: /applications per month/i }))
      .toHaveAccessibleName('Applications per month: September 2026 4, October 2026 2');
  });

  it('names months in Chinese when the app is in Chinese', async () => {
    localStorage.setItem('language', 'zh');
    render(<Analytics />, { wrapper: Wrapper });

    expect(await screen.findByRole('img', { name: /每月投递数/ }))
      .toHaveAccessibleName('每月投递数：2026年9月 4, 2026年10月 2');
  });

  it('summarises the daily heatmap for screen readers', async () => {
    const today = new Date();
    const day = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    vi.mocked(getApplications).mockResolvedValue({
      data: apps('APPLIED', 'APPLIED').map((a) => ({ ...a, appliedDate: day })),
    } as never);
    render(<Analytics />, { wrapper: Wrapper });

    expect(await screen.findByRole('img', { name: 'Last 26 weeks: 2 applied, active days: 1' })).toBeInTheDocument();
    expect(screen.getAllByTitle(/: 2 applied$/)).toHaveLength(1);
  });

  it('links each status in the breakdown to that list in Jobs', async () => {
    render(<Analytics />, { wrapper: Wrapper });
    fireEvent.click(await screen.findByRole('button', { name: /status distribution/i }));

    expect(screen.getByRole('link', { name: 'Show Rejected jobs (1)' })).toHaveAttribute('href', '/jobs?status=REJECTED');
    expect(screen.getByRole('link', { name: 'Show Applied jobs (1)' })).toHaveAttribute('href', '/jobs?status=APPLIED');
  });
});
