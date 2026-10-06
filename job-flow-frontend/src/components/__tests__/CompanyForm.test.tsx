import { render, screen, fireEvent } from '@testing-library/react';
import { AxiosError, type AxiosResponse } from 'axios';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CompanyForm from '../CompanyForm';
import { ToastProvider } from '../../context/ToastProvider';
import { LanguageProvider } from '../../context/LanguageProvider';
import type { CompanyDTO } from '../../api/types';
import { createCompany } from '../../api/companies';

// Mock API modules
vi.mock('../../api/companies', () => ({
  createCompany: vi.fn().mockResolvedValue({ data: {} }),
  updateCompany: vi.fn().mockResolvedValue({ data: {} }),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <ToastProvider>{children}</ToastProvider>
    </LanguageProvider>
  );
}

describe('CompanyForm', () => {
  const onSuccess = vi.fn();
  const onCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all form fields', () => {
    render(<CompanyForm onSuccess={onSuccess} onCancel={onCancel} />, { wrapper: Wrapper });

    expect(screen.getByText('Company Name')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('Website')).toBeInTheDocument();
    expect(screen.getByText('Logo URL')).toBeInTheDocument();
  });

  it('shows validation error for empty company name', () => {
    render(<CompanyForm onSuccess={onSuccess} onCancel={onCancel} />, { wrapper: Wrapper });

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

    render(<CompanyForm company={company} onSuccess={onSuccess} onCancel={onCancel} />, { wrapper: Wrapper });

    expect(screen.getByDisplayValue('Acme Inc')).toBeInTheDocument();
    expect(screen.getByDisplayValue('San Francisco')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://acme.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://acme.com/logo.png')).toBeInTheDocument();
  });

  it('calls onCancel when Cancel clicked', () => {
    render(<CompanyForm onSuccess={onSuccess} onCancel={onCancel} />, { wrapper: Wrapper });

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("shows the backend's message when the name is already taken", async () => {
    const response = { data: { message: "A company named 'Acme' already exists" }, status: 400 } as AxiosResponse;
    vi.mocked(createCompany).mockRejectedValueOnce(
      new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, response));

    render(<CompanyForm onSuccess={onSuccess} onCancel={onCancel} />, { wrapper: Wrapper });
    fireEvent.change(screen.getByPlaceholderText('e.g. Google'), { target: { value: 'Acme' } });
    fireEvent.click(screen.getByRole('button', { name: /add company/i }));

    expect(await screen.findByText("A company named 'Acme' already exists")).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
