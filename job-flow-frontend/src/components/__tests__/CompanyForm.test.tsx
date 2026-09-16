import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CompanyForm from '../CompanyForm';
import type { CompanyDTO } from '../../api/types';

// Mock API modules
vi.mock('../../api/companies', () => ({
  createCompany: vi.fn().mockResolvedValue({ data: {} }),
  updateCompany: vi.fn().mockResolvedValue({ data: {} }),
}));

describe('CompanyForm', () => {
  const onSuccess = vi.fn();
  const onCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all form fields', () => {
    render(<CompanyForm onSuccess={onSuccess} onCancel={onCancel} />);

    expect(screen.getByText('Company Name')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('Website')).toBeInTheDocument();
    expect(screen.getByText('Logo URL')).toBeInTheDocument();
  });

  it('shows validation error for empty company name', () => {
    render(<CompanyForm onSuccess={onSuccess} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: /add company/i }));

    expect(screen.getByText('Company name is required')).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('populates fields in edit mode', () => {
    const company: CompanyDTO = {
      id: 1,
      name: 'Acme Inc',
      location: 'San Francisco',
      website: 'https://acme.com',
      logoUrl: 'https://acme.com/logo.png',
    };

    render(<CompanyForm company={company} onSuccess={onSuccess} onCancel={onCancel} />);

    expect(screen.getByDisplayValue('Acme Inc')).toBeInTheDocument();
    expect(screen.getByDisplayValue('San Francisco')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://acme.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://acme.com/logo.png')).toBeInTheDocument();
  });

  it('calls onCancel when Cancel clicked', () => {
    render(<CompanyForm onSuccess={onSuccess} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
