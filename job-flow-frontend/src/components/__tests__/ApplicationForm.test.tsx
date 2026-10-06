import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ApplicationForm from '../ApplicationForm';
import { ToastProvider } from '../../context/ToastProvider';
import { LanguageProvider } from '../../context/LanguageProvider';
import type { JobApplicationDTO } from '../../api/types';
import { updateApplication } from '../../api/applications';

// Mock API modules
vi.mock('../../api/companies', () => ({
  getCompanies: vi.fn().mockResolvedValue({
    data: [
      { id: 10, name: 'Acme', location: 'NYC', website: null, logoUrl: null },
    ],
  }),
}));

vi.mock('../../api/applications', () => ({
  createApplication: vi.fn().mockResolvedValue({ data: {} }),
  updateApplication: vi.fn().mockResolvedValue({ data: {} }),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <ToastProvider>{children}</ToastProvider>
    </LanguageProvider>
  );
}

describe('ApplicationForm', () => {
  const onSuccess = vi.fn();
  const onCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all form fields', () => {
    render(<ApplicationForm onSuccess={onSuccess} onCancel={onCancel} />, { wrapper: Wrapper });

    expect(screen.getByText('Position Title')).toBeInTheDocument();
    expect(screen.getByText('Company')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('Salary')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Applied Date')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
  });

  it('shows validation errors for empty required fields', () => {
    render(<ApplicationForm onSuccess={onSuccess} onCancel={onCancel} />, { wrapper: Wrapper });

    fireEvent.click(screen.getByRole('button', { name: /create application/i }));

    expect(screen.getByText('Position title is required')).toBeInTheDocument();
    expect(screen.getByText('Company is required')).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('populates fields in edit mode', () => {
    const application: JobApplicationDTO = {
      id: 1,
      positionTitle: 'Frontend Dev',
      company: { id: 10, name: 'Acme', location: 'NYC', website: null, logoUrl: null },
      location: 'Remote',
      salary: '$120k',
      status: 'IN_REVIEW',
      appliedDate: '2030-01-15',
      lastAction: null,
      notes: 'Great opportunity',
      starred: false,
      createdAt: '2030-01-15T00:00:00',
      updatedAt: '2030-01-15T00:00:00',
    };

    render(<ApplicationForm application={application} onSuccess={onSuccess} onCancel={onCancel} />, { wrapper: Wrapper });

    expect(screen.getByDisplayValue('Frontend Dev')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Acme')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Remote')).toBeInTheDocument();
    expect(screen.getByDisplayValue('$120k')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Great opportunity')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2030-01-15')).toBeInTheDocument();
  });

  const editApp: JobApplicationDTO = {
    id: 1,
    positionTitle: 'Frontend Dev',
    company: { id: 10, name: 'Acme', location: 'NYC', website: null, logoUrl: null },
    location: 'Remote',
    salary: '$120k',
    status: 'IN_REVIEW',
    appliedDate: '2030-01-15',
    lastAction: null,
    notes: 'Great opportunity',
    starred: false,
    createdAt: '2030-01-15T00:00:00',
    updatedAt: '2030-01-15T00:00:00',
  };

  it('sends a blank string when an optional field is cleared on edit', async () => {
    render(<ApplicationForm application={editApp} onSuccess={onSuccess} onCancel={onCancel} />, { wrapper: Wrapper });

    fireEvent.change(screen.getByDisplayValue('$120k'), { target: { value: '   ' } });
    fireEvent.change(screen.getByDisplayValue('Great opportunity'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    // "" means "clear it"; undefined would have kept the old value
    expect(updateApplication).toHaveBeenCalledWith(1, expect.objectContaining({
      salary: '', notes: '', location: 'Remote', companyId: 10,
    }));
  });

  it('sends companyName when a new company is typed on edit', async () => {
    render(<ApplicationForm application={editApp} onSuccess={onSuccess} onCancel={onCancel} />, { wrapper: Wrapper });

    fireEvent.change(screen.getByDisplayValue('Acme'), { target: { value: '  Initech  ' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    const payload = vi.mocked(updateApplication).mock.calls[0][1] as Record<string, unknown>;
    expect(payload.companyName).toBe('Initech');
    expect(payload).not.toHaveProperty('companyId');
  });
});
