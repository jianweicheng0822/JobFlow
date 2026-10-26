import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AxiosError, AxiosHeaders } from 'axios';
import DeleteAccountSection from '../DeleteAccountSection';
import { LanguageProvider } from '../../context/LanguageProvider';
import { ToastProvider } from '../../context/ToastProvider';
import { AuthContext, type AuthContextType, type AuthUser } from '../../context/AuthContext';
import { deleteAccount } from '../../api/auth';

vi.mock('../../api/auth', () => ({ deleteAccount: vi.fn() }));
vi.mock('../../api/mockData', () => ({ isDemoMode: () => false }));

const baseUser: AuthUser = {
  name: 'Alice', email: 'alice@test.com', avatarUrl: null, jobTitle: null, bio: null,
  hasPassword: true, gmailConnected: false, timeZone: null,
};

function renderFor(user: AuthUser) {
  const auth: AuthContextType = {
    user, loading: false, login: vi.fn(), register: vi.fn(), logout: vi.fn(), tryDemo: vi.fn(), updateUser: vi.fn(),
  };
  render(
    <LanguageProvider>
      <ToastProvider>
        <AuthContext.Provider value={auth}>
          <MemoryRouter initialEntries={['/settings']}>
            <Routes>
              <Route path="/settings" element={<DeleteAccountSection />} />
              <Route path="/login" element={<div>login page</div>} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </ToastProvider>
    </LanguageProvider>
  );
  return auth;
}

function openDialog() {
  fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));
  return screen.getByRole('button', { name: 'Delete my account' });
}

describe('DeleteAccountSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('asks a password account for its password, then signs out', async () => {
    vi.mocked(deleteAccount).mockResolvedValue({ data: undefined } as never);
    localStorage.setItem('jobflow-avatar:alice@test.com', 'data:photo');
    const auth = renderFor(baseUser);

    const confirm = openDialog();
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Enter your password to confirm'), { target: { value: 'password123' } });
    fireEvent.click(confirm);

    await waitFor(() => expect(screen.getByText('login page')).toBeInTheDocument());
    expect(deleteAccount).toHaveBeenCalledWith({ password: 'password123' });
    expect(auth.logout).toHaveBeenCalled();
    expect(localStorage.getItem('jobflow-avatar:alice@test.com')).toBeNull();
  });

  it('makes an OAuth-only account type its email', () => {
    renderFor({ ...baseUser, email: 'carol@gmail.com', hasPassword: false });

    const confirm = openDialog();
    const input = screen.getByLabelText('Type carol@gmail.com to confirm');
    fireEvent.change(input, { target: { value: 'someone@gmail.com' } });
    expect(confirm).toBeDisabled();
    fireEvent.change(input, { target: { value: 'Carol@Gmail.com' } });
    expect(confirm).toBeEnabled();
  });

  it('shows the server error and keeps the user signed in', async () => {
    vi.mocked(deleteAccount).mockRejectedValue(new AxiosError('Bad Request', '400', undefined, undefined, {
      status: 400, statusText: 'Bad Request', headers: {}, config: { headers: new AxiosHeaders() },
      data: { code: 'CURRENT_PASSWORD_INCORRECT', message: 'Current password is incorrect' },
    }));
    const auth = renderFor(baseUser);

    const confirm = openDialog();
    fireEvent.change(screen.getByLabelText('Enter your password to confirm'), { target: { value: 'wrong' } });
    fireEvent.click(confirm);

    expect(await screen.findByText('Current password is incorrect')).toBeInTheDocument();
    expect(auth.logout).not.toHaveBeenCalled();
  });
});
