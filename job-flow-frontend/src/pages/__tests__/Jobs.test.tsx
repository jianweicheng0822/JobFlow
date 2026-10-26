import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Jobs from '../Jobs';
import { ToastProvider } from '../../context/ToastProvider';
import { LanguageProvider } from '../../context/LanguageProvider';
import { getApplications, toggleStar, updateStatus } from '../../api/applications';
import type { JobApplicationDTO, ApplicationStatus } from '../../api/types';

vi.mock('../../api/companies', () => ({
  getCompanies: vi.fn().mockResolvedValue({ data: [] }),
}));

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
    <MemoryRouter initialEntries={['/jobs']}>
      <LanguageProvider>
        <ToastProvider>{children}</ToastProvider>
      </LanguageProvider>
    </MemoryRouter>
  );
}

// Opens Jobs at a given URL, like following a dashboard card link
function renderJobsAt(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <LanguageProvider>
        <ToastProvider><Jobs /></ToastProvider>
      </LanguageProvider>
    </MemoryRouter>
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
    expect(statCard('Rejections')).toBe('0');
  });

  it('updates right away, locks the row while pending, then takes the server response', async () => {
    const req = deferred<{ data: JobApplicationDTO }>();
    vi.mocked(updateStatus).mockReturnValue(req.promise as never);

    render(<Jobs />, { wrapper: Wrapper });
    await findTitle('Alpha');

    fireEvent.change(statusSelectFor('Alpha'), { target: { value: 'REJECTED' } });

    // Optimistic: new status and counts before the server answers
    expect(statusSelectFor('Alpha').value).toBe('REJECTED');
    expect(statCard('Active Applications')).toBe('1');
    expect(statCard('Rejections')).toBe('1');
    expect(updateStatus).toHaveBeenCalledWith(1, 'REJECTED');

    // Both quick actions on this row are locked, other rows are not
    expect(statusSelectFor('Alpha')).toBeDisabled();
    expect(starButtonFor('Alpha')).toBeDisabled();
    expect(statusSelectFor('Bravo')).toBeEnabled();

    req.resolve({ data: { ...makeApp(1, 'Alpha', false, 'REJECTED'), lastAction: 'Moved to Rejected' } });
    await waitFor(() => expect(statusSelectFor('Alpha')).toBeEnabled());
    expect(statusSelectFor('Alpha').value).toBe('REJECTED');
  });

  it('rolls back only the status and shows a toast on failure', async () => {
    vi.mocked(updateStatus).mockRejectedValue(new Error('timeout of 10000ms exceeded'));

    render(<Jobs />, { wrapper: Wrapper });
    await findTitle('Alpha');

    fireEvent.change(statusSelectFor('Alpha'), { target: { value: 'REJECTED' } });

    await waitFor(() => expect(statusSelectFor('Alpha')).toBeEnabled());
    expect(statusSelectFor('Alpha').value).toBe('APPLIED');
    expect(statCard('Rejections')).toBe('0');
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

describe('Jobs filter reset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getApplications).mockResolvedValue({
      data: [makeApp(1, 'Alpha'), makeApp(2, 'Bravo')],
    } as never);
  });

  it('is disabled until a filter is set, then clears search and dropdowns', async () => {
    render(<Jobs />, { wrapper: Wrapper });
    await findTitle('Alpha');

    const reset = screen.getByRole('button', { name: 'Reset' });
    expect(reset).toBeDisabled();

    const search = screen.getByPlaceholderText('Search...');
    const companySelect = screen.getByDisplayValue('By Company') as HTMLSelectElement;
    fireEvent.change(search, { target: { value: 'alpha' } });
    fireEvent.change(companySelect, { target: { value: 'Company 1' } });
    expect(rowTitles()).toEqual(['Alpha']);
    expect(reset).toBeEnabled();

    fireEvent.click(reset);
    expect(search).toHaveValue('');
    expect(companySelect.value).toBe('');
    expect(rowTitles()).toEqual(['Alpha', 'Bravo']);
    expect(reset).toBeDisabled();
  });
});

describe('Jobs date sort', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getApplications).mockResolvedValue({
      data: [
        { ...makeApp(1, 'Old'), appliedDate: '2026-09-01' },
        { ...makeApp(2, 'New'), appliedDate: '2026-10-20' },
        { ...makeApp(3, 'Starred old', true), appliedDate: '2026-08-15' },
        { ...makeApp(4, 'Undated'), appliedDate: null },
        { ...makeApp(5, 'Starred new', true), appliedDate: '2026-10-10' },
      ],
    } as never);
  });

  it('shows newest first, flips on click, and keeps starred jobs on top', async () => {
    render(<Jobs />, { wrapper: Wrapper });
    await findTitle('Old');

    const header = screen.getByRole('columnheader', { name: /date applied/i });
    expect(header).toHaveAttribute('aria-sort', 'descending');
    expect(rowTitles()).toEqual(['Starred new', 'Starred old', 'New', 'Old', 'Undated']);

    fireEvent.click(within(header).getByRole('button'));
    expect(header).toHaveAttribute('aria-sort', 'ascending');
    expect(rowTitles()).toEqual(['Starred old', 'Starred new', 'Old', 'New', 'Undated']);
  });
});

describe('Jobs stage filter and cards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getApplications).mockResolvedValue({
      data: [
        makeApp(1, 'Alpha', false, 'OFFER'),
        makeApp(2, 'Bravo', false, 'REJECTED'),
        makeApp(3, 'Charlie', true, 'APPLIED'),
        makeApp(4, 'Delta', false, 'APPLIED'),
        makeApp(5, 'Echo', false, 'INTERVIEW'),
      ],
    } as never);
  });

  it('opens filtered to the stage in the URL, and Reset shows everything again', async () => {
    renderJobsAt('/jobs?status=OFFER');
    await findTitle('Alpha');

    expect(rowTitles()).toEqual(['Alpha']);
    expect(screen.getByRole('combobox', { name: 'Stage' })).toHaveValue('OFFER');

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(rowTitles()).toHaveLength(5);
    expect(screen.getByRole('combobox', { name: 'Stage' })).toHaveValue('');
  });

  it('ignores an unknown stage in the URL', async () => {
    renderJobsAt('/jobs?status=NOPE');
    await findTitle('Alpha');
    expect(rowTitles()).toHaveLength(5);
  });

  it('counts offers as active and shows rejections on their own', async () => {
    render(<Jobs />, { wrapper: Wrapper });
    await findTitle('Alpha');

    expect(statCard('Active Applications')).toBe('4');
    expect(statCard('Rejections')).toBe('1');
    const rejectionsCard = screen.getByText('Rejections').closest('.jobs-stat-card') as HTMLElement;
    expect(within(rejectionsCard).getByText('20% of all applications')).toBeInTheDocument();
  });
});

describe('Jobs search and links', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('language', 'en');
    vi.mocked(getApplications).mockResolvedValue({
      data: [
        { ...makeApp(1, 'Alpha'), location: 'Seattle, WA' },
        { ...makeApp(2, 'Bravo'), location: 'Remote' },
      ],
    } as never);
  });

  it('finds jobs by location too', async () => {
    render(<Jobs />, { wrapper: Wrapper });
    await findTitle('Alpha');

    fireEvent.change(screen.getByPlaceholderText('Search...'), { target: { value: 'seattle' } });

    expect(rowTitles()).toEqual(['Alpha']);
  });

  it('offers to clear filters when nothing matches', async () => {
    render(<Jobs />, { wrapper: Wrapper });
    await findTitle('Alpha');

    fireEvent.change(screen.getByPlaceholderText('Search...'), { target: { value: 'nothing like this' } });
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(rowTitles()).toEqual(['Alpha', 'Bravo']);
  });

  it('opens the linked job straight away for ?open=<id>', async () => {
    renderJobsAt('/jobs?open=2');

    expect(await screen.findByRole('heading', { name: 'Edit Application' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Bravo')).toBeInTheDocument();
  });

  it("shows one company's jobs for ?company=<name>", async () => {
    renderJobsAt('/jobs?company=Company%201');
    await findTitle('Alpha');

    await waitFor(() => expect(rowTitles()).toEqual(['Alpha']));
  });
});
