import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import SettingsPage from '../SettingsPage';
import { LanguageProvider } from '../../context/LanguageProvider';
import * as authApi from '../../api/auth';

vi.mock('../../api/auth', () => ({
  getAuthProviders: vi.fn(),
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
  updateTimeZone: vi.fn(),
  deleteAccount: vi.fn(),
}));

vi.mock('../../api/mockData', () => ({
  isDemoMode: vi.fn(() => false),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      name: 'Alice', email: 'alice@test.com', avatarUrl: null, jobTitle: null, bio: null,
      hasPassword: true, gmailConnected: false, timeZone: 'America/Denver',
    },
    updateUser: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

async function submitNewPassword() {
  render(<MemoryRouter><SettingsPage /></MemoryRouter>, { wrapper: LanguageProvider });
  fireEvent.click(await screen.findByRole('button', { name: /^account$/i }));

  fireEvent.change(screen.getByPlaceholderText('Enter current password'), { target: { value: 'oldpass123' } });
  fireEvent.change(screen.getByPlaceholderText('Enter new password'), { target: { value: 'newpass456' } });
  fireEvent.change(screen.getByPlaceholderText('Confirm new password'), { target: { value: 'newpass456' } });
  fireEvent.click(screen.getByRole('button', { name: /update password/i }));

  await waitFor(() => expect(authApi.changePassword).toHaveBeenCalledWith({
    currentPassword: 'oldpass123', newPassword: 'newpass456',
  }));
}

describe('Settings password change', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authApi.getAuthProviders).mockResolvedValue({ data: { google: false, github: false, gmail: false } } as never);
    localStorage.setItem('jobflow-token', 'old-token');
  });

  afterEach(() => localStorage.removeItem('jobflow-token'));

  it('keeps this session signed in with the token the server sends back', async () => {
    vi.mocked(authApi.changePassword).mockResolvedValue({ data: { token: 'fresh-token' } } as never);

    await submitNewPassword();

    await waitFor(() => expect(localStorage.getItem('jobflow-token')).toBe('fresh-token'));
  });

  it('leaves the stored token alone when the change fails', async () => {
    vi.mocked(authApi.changePassword).mockRejectedValue(new Error('nope'));

    await submitNewPassword();

    expect(localStorage.getItem('jobflow-token')).toBe('old-token');
  });
});
