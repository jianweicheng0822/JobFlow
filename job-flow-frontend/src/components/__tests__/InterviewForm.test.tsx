import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InterviewForm from '../InterviewForm';
import type { InterviewDTO, JobApplicationDTO } from '../../api/types';

// Mock API modules
vi.mock('../../api/applications', () => ({
  getApplications: vi.fn().mockResolvedValue({
    data: [
      {
        id: 1,
        positionTitle: 'Frontend Dev',
        company: { id: 10, name: 'Acme' },
      },
      {
        id: 2,
        positionTitle: 'Backend Dev',
        company: { id: 11, name: 'Globex' },
      },
    ] as Partial<JobApplicationDTO>[],
  }),
}));

vi.mock('../../api/interviews', () => ({
  createInterview: vi.fn().mockResolvedValue({ data: {} }),
  updateInterview: vi.fn().mockResolvedValue({ data: {} }),
}));

describe('InterviewForm', () => {
  const onSuccess = vi.fn();
  const onCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all form fields', async () => {
    render(<InterviewForm onSuccess={onSuccess} onCancel={onCancel} />);

    expect(screen.getByText('Job Application')).toBeInTheDocument();
    expect(screen.getByText('Interview Date')).toBeInTheDocument();
    expect(screen.getByText('Interview Type')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
  });

  it('shows validation errors when submitting empty required fields', async () => {
    render(<InterviewForm onSuccess={onSuccess} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: /schedule interview/i }));

    expect(await screen.findByText('Please select a job application')).toBeInTheDocument();
    expect(screen.getByText('Interview date is required')).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('populates fields in edit mode', () => {
    const interview: InterviewDTO = {
      id: 5,
      jobApplicationId: 1,
      positionTitle: 'Frontend Dev',
      companyName: 'Acme',
      interviewDate: '2030-06-15T10:00:00',
      interviewType: 'PHONE',
      notes: 'Prep algorithms',
    };

    render(<InterviewForm interview={interview} onSuccess={onSuccess} onCancel={onCancel} />);

    expect(screen.getByDisplayValue('2030-06-15T10:00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Prep algorithms')).toBeInTheDocument();
  });

  it('calls onCancel when Cancel clicked', () => {
    render(<InterviewForm onSuccess={onSuccess} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows "Schedule Interview" in create mode, "Save Changes" in edit mode', () => {
    const { unmount } = render(<InterviewForm onSuccess={onSuccess} onCancel={onCancel} />);
    expect(screen.getByRole('button', { name: /schedule interview/i })).toBeInTheDocument();
    unmount();

    const interview: InterviewDTO = {
      id: 5,
      jobApplicationId: 1,
      positionTitle: 'Frontend Dev',
      companyName: 'Acme',
      interviewDate: '2030-06-15T10:00:00',
      interviewType: 'PHONE',
      notes: null,
    };

    render(<InterviewForm interview={interview} onSuccess={onSuccess} onCancel={onCancel} />);
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });
});
