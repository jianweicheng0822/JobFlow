import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SettingsPage from '../SettingsPage';
import { LanguageProvider } from '../../context/LanguageProvider';
import * as authApi from '../../api/auth';
import * as gmailApi from '../../api/gmail';

vi.mock('../../api/auth', () => ({
  getAuthProviders: vi.fn(),
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
  updateTimeZone: vi.fn(),
}));

vi.mock('../../api/gmail', () => ({
  getGmailStatus: vi.fn(),
  getGmailLinkUrl: vi.fn(),
  scanGmail: vi.fn(),
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
  }),
}));

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

function renderSettings() {
  return render(<SettingsPage />, { wrapper: LanguageProvider });
}

describe('Settings integrations tab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(gmailApi.getGmailStatus).mockResolvedValue({ data: { gmailConnected: false, provider: 'LOCAL' } } as never);
  });

  it('shows Gmail linking when the server has Google configured', async () => {
    vi.mocked(authApi.getAuthProviders).mockResolvedValue({ data: { google: true, github: true, gmail: true } } as never);
    renderSettings();

    fireEvent.click(await screen.findByRole('button', { name: /integrations/i }));

    expect(await screen.findByRole('button', { name: /connect google account/i })).toBeInTheDocument();
  });

  it('has no Integrations tab when Gmail import is not configured', async () => {
    vi.mocked(authApi.getAuthProviders).mockResolvedValue({ data: { google: false, github: true, gmail: false } } as never);
    renderSettings();

    await waitFor(() => expect(authApi.getAuthProviders).toHaveBeenCalled());
    // The other tabs are still there
    expect(screen.getByRole('button', { name: /profile/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /integrations/i })).not.toBeInTheDocument();
    expect(gmailApi.getGmailStatus).not.toHaveBeenCalled();
  });
});
