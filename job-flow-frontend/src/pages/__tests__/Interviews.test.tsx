import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Interviews from '../Interviews';
import { ToastProvider } from '../../context/ToastProvider';
import { LanguageProvider } from '../../context/LanguageProvider';
import { getInterviews } from '../../api/interviews';
import type { InterviewDTO } from '../../api/types';

vi.mock('../../api/interviews', () => ({
  getInterviews: vi.fn(),
  deleteInterview: vi.fn(),
}));

// The schedule form loads applications for its dropdown
vi.mock('../../api/applications', () => ({
  getApplications: vi.fn().mockResolvedValue({ data: [] }),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <MemoryRouter>
      <LanguageProvider>
        <ToastProvider>{children}</ToastProvider>
      </LanguageProvider>
    </MemoryRouter>
  );
}

// An interview `days` from now (negative = already happened)
function interview(id: number, positionTitle: string, days: number): InterviewDTO {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return {
    id,
    jobApplicationId: id,
    positionTitle,
    companyName: `Company ${id}`,
    interviewDate: d.toISOString(),
    interviewType: 'PHONE',
    notes: null,
    reminderEnabled: false,
    reminderHoursBefore: 24,
    reminderSent: false,
    daysUntil: days,
  };
}

describe('Interviews upcoming and past groups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('language', 'en');
  });

  it('shows upcoming interviews and folds the past ones away', async () => {
    vi.mocked(getInterviews).mockResolvedValue({
      data: [interview(1, 'Soon', 2), interview(2, 'Last week', -7), interview(3, 'Last month', -30)],
    } as never);
    render(<Interviews />, { wrapper: Wrapper });

    expect(await screen.findByText('Soon')).toBeInTheDocument();
    expect(screen.getByText('Upcoming · 1')).toBeInTheDocument();
    expect(screen.queryByText('Last week')).not.toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: 'Past interviews · 2' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);

    expect(screen.getByText('Last week')).toBeInTheDocument();
    expect(screen.getByText('Last month')).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('opens the past group when nothing is upcoming', async () => {
    vi.mocked(getInterviews).mockResolvedValue({ data: [interview(1, 'Done', -3)] } as never);
    render(<Interviews />, { wrapper: Wrapper });

    expect(await screen.findByText('Done')).toBeInTheDocument();
    expect(screen.queryByText(/Upcoming ·/)).not.toBeInTheDocument();
  });

  it('opens the past group while searching, so matches are not hidden', async () => {
    vi.mocked(getInterviews).mockResolvedValue({
      data: [interview(1, 'Soon', 2), interview(2, 'Old one', -7)],
    } as never);
    render(<Interviews />, { wrapper: Wrapper });
    await screen.findByText('Soon');

    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'old' } });
    expect(screen.getByText('Old one')).toBeInTheDocument();
  });
});
