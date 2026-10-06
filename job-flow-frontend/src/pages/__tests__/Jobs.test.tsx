import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Jobs from '../Jobs';
import { ToastProvider } from '../../context/ToastProvider';
import { LanguageProvider } from '../../context/LanguageProvider';
import { getApplications, toggleStar, updateStatus } from '../../api/applications';
import type { JobApplicationDTO, ApplicationStatus } from '../../api/types';

vi.mock('../../api/applications', () => ({
  getApplications: vi.fn(),
  deleteApplication: vi.fn(),
  toggleStar: vi.fn(),
  updateStatus: vi.fn(),
}));

function makeApp(id: number, positionTitle: string, starred = false, status: ApplicationStatus = 'APPLIED'): JobApplicationDTO {
  return {
    id,
    positionTitle,
    company: { id, name: `Company ${id}`, logoUrl: null, location: null, website: null },
    location: null,
    salary: null,
    status,
    appliedDate: null,
    lastAction: null,
    notes: null,
    starred,
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
  };
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <ToastProvider>{children}</ToastProvider>
    </LanguageProvider>
  );
}

// Job titles in the order they show up in the table
function rowTitles() {
  return screen.getAllByRole('row').slice(1).map((row) => row.querySelector('.jobs-title-name')?.textContent);
}

function statCard(label: string) {
  return screen.getByText(label).nextElementSibling?.textContent;
}

function savedCount() {
  return statCard('Saved Jobs');
}

function statusSelectFor(title: string) {
  const row = within(screen.getByRole('table')).getByText(title).closest('tr')!;
  return within(row).getByRole('combobox', { name: 'Change status' }) as HTMLSelectElement;
}

function starButtonFor(title: string) {
  const row = within(screen.getByRole('table')).getByText(title).closest('tr')!;
  return within(row).getByRole('button', { name: /^(star|unstar)$/i });
}

// Titles also appear in the Role filter dropdown, so look inside the table only
function findTitle(title: string) {
  return screen.findByText(title, { selector: '.jobs-title-name' });
}

// A promise we can resolve/reject by hand to inspect the in-flight state
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe('Jobs star feature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getApplications).mockResolvedValue({
      data: [makeApp(1, 'Alpha'), makeApp(2, 'Bravo', true), makeApp(3, 'Charlie')],
    } as never);
  });

  it('lists starred jobs first and counts them as saved', async () => {
    render(<Jobs />, { wrapper: Wrapper });
    await findTitle('Alpha');

    expect(rowTitles()).toEqual(['Bravo', 'Alpha', 'Charlie']);
    expect(savedCount()).toBe('1');
    expect(starButtonFor('Bravo')).toHaveAttribute('aria-pressed', 'true');
    expect(starButtonFor('Alpha')).toHaveAttribute('aria-pressed', 'false');
  });

  it('flips the star right away and blocks double clicks while the request is pending', async () => {
    const req = deferred<{ data: JobApplicationDTO }>();
    vi.mocked(toggleStar).mockReturnValue(req.promise as never);

    render(<Jobs />, { wrapper: Wrapper });
    await findTitle('Charlie');

    fireEvent.click(starButtonFor('Charlie'));

    // Optimistic: starred, moved up, counted, and locked before the server answers
    expect(starButtonFor('Charlie')).toHaveAttribute('aria-pressed', 'true');
    expect(starButtonFor('Charlie')).toBeDisabled();
    expect(rowTitles()).toEqual(['Bravo', 'Charlie', 'Alpha']);
    expect(savedCount()).toBe('2');

    fireEvent.click(starButtonFor('Charlie'));
    expect(toggleStar).toHaveBeenCalledTimes(1);
    expect(toggleStar).toHaveBeenCalledWith(3);

    req.resolve({ data: makeApp(3, 'Charlie', true) });
    await waitFor(() => expect(starButtonFor('Charlie')).toBeEnabled());
    expect(starButtonFor('Charlie')).toHaveAttribute('aria-pressed', 'true');
    expect(savedCount()).toBe('2');
  });

  it('rolls back and shows a toast when the request fails or times out', async () => {
    vi.mocked(toggleStar).mockRejectedValue(new Error('timeout of 10000ms exceeded'));

    render(<Jobs />, { wrapper: Wrapper });
    await findTitle('Alpha');

    fireEvent.click(starButtonFor('Alpha'));

    await waitFor(() => expect(starButtonFor('Alpha')).toBeEnabled());
    expect(starButtonFor('Alpha')).toHaveAttribute('aria-pressed', 'false');
    expect(rowTitles()).toEqual(['Bravo', 'Alpha', 'Charlie']);
    expect(savedCount()).toBe('1');
    expect(screen.getByText('timeout of 10000ms exceeded')).toBeInTheDocument();
  });

  it('can unstar a job', async () => {
    vi.mocked(toggleStar).mockResolvedValue({ data: makeApp(2, 'Bravo', false) } as never);

    render(<Jobs />, { wrapper: Wrapper });
    await findTitle('Bravo');

    fireEvent.click(starButtonFor('Bravo'));

    await waitFor(() => expect(starButtonFor('Bravo')).toBeEnabled());
    expect(starButtonFor('Bravo')).toHaveAttribute('aria-pressed', 'false');
    expect(rowTitles()).toEqual(['Alpha', 'Bravo', 'Charlie']);
    expect(savedCount()).toBe('0');
  });
});

describe('Jobs quick status change', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getApplications).mockResolvedValue({
      data: [makeApp(1, 'Alpha'), makeApp(2, 'Bravo')],
    } as never);
  });

  it('shows the current status in each row', async () => {
    render(<Jobs />, { wrapper: Wrapper });
    await findTitle('Alpha');

    expect(statusSelectFor('Alpha').value).toBe('APPLIED');
    expect(statCard('Active Applications')).toBe('2');
    expect(statCard('Closed')).toBe('0');
  });

  it('updates right away, locks the row while pending, then takes the server response', async () => {
    const req = deferred<{ data: JobApplicationDTO }>();
    vi.mocked(updateStatus).mockReturnValue(req.promise as never);

    render(<Jobs />, { wrapper: Wrapper });
    await findTitle('Alpha');

    fireEvent.change(statusSelectFor('Alpha'), { target: { value: 'OFFER' } });

    // Optimistic: new status and counts before the server answers
    expect(statusSelectFor('Alpha').value).toBe('OFFER');
    expect(statCard('Active Applications')).toBe('1');
    expect(statCard('Closed')).toBe('1');
    expect(updateStatus).toHaveBeenCalledWith(1, 'OFFER');

    // Both quick actions on this row are locked, other rows are not
    expect(statusSelectFor('Alpha')).toBeDisabled();
    expect(starButtonFor('Alpha')).toBeDisabled();
    expect(statusSelectFor('Bravo')).toBeEnabled();

    req.resolve({ data: { ...makeApp(1, 'Alpha', false, 'OFFER'), lastAction: 'Moved to Offer' } });
    await waitFor(() => expect(statusSelectFor('Alpha')).toBeEnabled());
    expect(statusSelectFor('Alpha').value).toBe('OFFER');
  });

  it('rolls back only the status and shows a toast on failure', async () => {
    vi.mocked(updateStatus).mockRejectedValue(new Error('timeout of 10000ms exceeded'));

    render(<Jobs />, { wrapper: Wrapper });
    await findTitle('Alpha');

    fireEvent.change(statusSelectFor('Alpha'), { target: { value: 'REJECTED' } });

    await waitFor(() => expect(statusSelectFor('Alpha')).toBeEnabled());
    expect(statusSelectFor('Alpha').value).toBe('APPLIED');
    expect(statCard('Closed')).toBe('0');
    expect(screen.getByText('timeout of 10000ms exceeded')).toBeInTheDocument();
  });

  it('does nothing when the same status is picked', async () => {
    render(<Jobs />, { wrapper: Wrapper });
    await findTitle('Alpha');

    fireEvent.change(statusSelectFor('Alpha'), { target: { value: 'APPLIED' } });

    expect(updateStatus).not.toHaveBeenCalled();
    expect(statusSelectFor('Alpha')).toBeEnabled();
  });
});
