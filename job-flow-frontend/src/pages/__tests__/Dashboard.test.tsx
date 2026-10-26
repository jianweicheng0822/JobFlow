import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Dashboard from '../Dashboard';
import { LanguageProvider } from '../../context/LanguageProvider';
import { ToastProvider } from '../../context/ToastProvider';
import type { JobApplicationDTO } from '../../api/types';
import { getStats, getApplications, updateStatus } from '../../api/applications';
import { getUpcomingInterviews } from '../../api/interviews';
import { todayLocal } from '../../utils/date';

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <MemoryRouter>
      <LanguageProvider>
        <ToastProvider>{children}</ToastProvider>
      </LanguageProvider>
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
    data: {
      totalApplications: 1, inReview: 0, interviews: 0, offers: 0, rejections: 0,
      responded: 0, responseRate: 0, interviewRate: 0, offerRate: 0,
    },
  }),
  getApplications: vi.fn(() => Promise.resolve({ data: [app] })),
  getRecentApplications: vi.fn(() => Promise.resolve({ data: [app] })),
  updateStatus: vi.fn(() => Promise.resolve({ data: app })),
}));

// The edit form loads companies for its autocomplete
vi.mock('../../api/companies', () => ({
  getCompanies: vi.fn().mockResolvedValue({ data: [] }),
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
    expect(label.textContent).toBe('投递日期: 2026年7月17日');
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
      data: {
        totalApplications: 10, inReview: 2, interviews: 1, offers: 1, rejections: 3,
        responded: 7, responseRate: 70, interviewRate: 20, offerRate: 10,
      },
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

describe('Dashboard pipeline board', () => {
  const daysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return todayLocal(d);
  };
  const job = (id: number, status: JobApplicationDTO['status'], appliedDate: string) =>
    ({ ...app, id, positionTitle: `Job ${id}`, status, appliedDate });

  beforeEach(() => localStorage.setItem('language', 'en'));
  afterEach(() => localStorage.removeItem('language'));

  it('shows the 4 newest cards per stage and links to the rest', async () => {
    vi.mocked(getApplications).mockResolvedValueOnce({
      data: [1, 2, 3, 4, 5, 6].map((id) => job(id, 'APPLIED', daysAgo(id))),
    } as never);
    render(<Dashboard />, { wrapper: Wrapper });

    expect(await screen.findByText('Job 1')).toBeInTheDocument();
    expect(screen.getByText('Job 4')).toBeInTheDocument();
    expect(screen.queryByText('Job 5')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '+2 more →' })).toHaveAttribute('href', '/jobs?status=APPLIED');
  });

  it('leaves Rejected off the board', async () => {
    vi.mocked(getApplications).mockResolvedValueOnce({ data: [job(1, 'REJECTED', daysAgo(3))] } as never);
    render(<Dashboard />, { wrapper: Wrapper });

    await screen.findByText('Application Pipeline');
    expect(screen.queryByText('Job 1')).not.toBeInTheDocument();
  });

  it('points View All at the Jobs page', async () => {
    render(<Dashboard />, { wrapper: Wrapper });

    expect(await screen.findByRole('link', { name: 'View All →' })).toHaveAttribute('href', '/jobs');
  });
});

describe('Dashboard sidebar', () => {
  const daysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return todayLocal(d);
  };

  beforeEach(() => localStorage.setItem('language', 'en'));
  afterEach(() => localStorage.removeItem('language'));

  it('shows the day as well as the time of an upcoming interview', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    vi.mocked(getUpcomingInterviews).mockResolvedValueOnce({
      data: [{
        id: 7, jobApplicationId: 1, positionTitle: 'Backend Dev', companyName: 'Globex',
        interviewDate: `${todayLocal(tomorrow)}T14:00:00`, interviewType: 'PHONE', notes: null,
        reminderEnabled: false, reminderHoursBefore: 24, reminderSent: false, daysUntil: 1,
      }],
    } as never);
    render(<Dashboard />, { wrapper: Wrapper });

    const item = await screen.findByRole('link', { name: /Backend Dev/ });
    expect(item).toHaveAttribute('href', '/interviews');
    expect(within(item).getByText('Tomorrow')).toBeInTheDocument();
    expect(within(item).getByText('2:00 PM')).toBeInTheDocument();
  });

  it('lists applications waiting 14 to 60 days on a reply', async () => {
    vi.mocked(getApplications).mockResolvedValueOnce({
      data: [
        { ...app, id: 1, positionTitle: 'Old One', appliedDate: daysAgo(20) },
        { ...app, id: 2, positionTitle: 'Fresh One', appliedDate: daysAgo(3) },
        { ...app, id: 3, positionTitle: 'Moved On', appliedDate: daysAgo(30), status: 'IN_REVIEW' as const },
        { ...app, id: 4, positionTitle: 'Long Gone', appliedDate: daysAgo(90) },
      ],
    } as never);
    render(<Dashboard />, { wrapper: Wrapper });

    expect(await screen.findByText('20 days ago')).toBeInTheDocument();
    expect(screen.getByText('Applied 14–60 days ago, no reply yet')).toBeInTheDocument();
    // Too fresh, already moving, or long ghosted: none of these need a nudge
    expect(screen.queryByText('3 days ago')).not.toBeInTheDocument();
    expect(screen.queryByText('30 days ago')).not.toBeInTheDocument();
    expect(screen.queryByText('90 days ago')).not.toBeInTheDocument();
  });

  it('says so when nothing is waiting', async () => {
    vi.mocked(getApplications).mockResolvedValueOnce({ data: [{ ...app, appliedDate: daysAgo(5) }] } as never);
    render(<Dashboard />, { wrapper: Wrapper });

    expect(await screen.findByText('Nothing waiting on a reply')).toBeInTheDocument();
  });
});

describe('Dashboard board interactions', () => {
  beforeEach(() => localStorage.setItem('language', 'en'));
  afterEach(() => localStorage.removeItem('language'));

  it('opens the job for editing when a card is clicked', async () => {
    render(<Dashboard />, { wrapper: Wrapper });

    fireEvent.click(await screen.findByRole('button', { name: 'Frontend Dev, Acme' }));

    expect(await screen.findByRole('heading', { name: 'Edit Application' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Frontend Dev')).toBeInTheDocument();
  });

  it('moves a job to the stage its card is dropped on', async () => {
    render(<Dashboard />, { wrapper: Wrapper });

    const card = await screen.findByRole('button', { name: 'Frontend Dev, Acme' });
    const data = new Map<string, string>();
    const dataTransfer = {
      setData: (k: string, v: string) => data.set(k, v),
      getData: (k: string) => data.get(k) ?? '',
      effectAllowed: '',
    };
    fireEvent.dragStart(card, { dataTransfer });
    const offerColumn = screen.getByText('Offer').closest('.pipeline-column')!;
    fireEvent.dragOver(offerColumn, { dataTransfer });
    fireEvent.drop(offerColumn, { dataTransfer });

    await waitFor(() => expect(updateStatus).toHaveBeenCalledWith(1, 'OFFER'));
  });
});
