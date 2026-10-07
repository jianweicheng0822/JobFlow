import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthProvider } from '../AuthProvider';
import { useAuth } from '../AuthContext';
import * as authApi from '../../api/auth';
import { isDemoMode } from '../../api/mockData';
import type { AuthResponse } from '../../api/auth';

vi.mock('../../api/auth', () => ({
  getMe: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  updateTimeZone: vi.fn(),
}));

vi.mock('../../api/mockData', () => ({
  resetMockData: vi.fn(),
  isDemoMode: vi.fn(() => false),
}));

vi.mock('../../utils/date', () => ({
  browserTimeZone: () => 'America/Denver',
}));

function me(timeZone: string | null): AuthResponse {
  return {
    token: 'jwt', name: 'Alice', email: 'alice@test.com', avatarUrl: null, jobTitle: null, bio: null,
    hasPassword: true, gmailConnected: false, timeZone,
  };
}

function Probe() {
  const { user, login } = useAuth();
  return (
    <div>
      <span data-testid="email">{user?.email ?? 'signed out'}</span>
      <span data-testid="zone">{user ? String(user.timeZone) : '-'}</span>
      <button onClick={() => login({ email: 'alice@test.com', password: 'x' })}>log in</button>
    </div>
  );
}

describe('AuthProvider time zone sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isDemoMode).mockReturnValue(false);
    localStorage.setItem('jobflow-token', 'jwt');
  });
  afterEach(() => localStorage.removeItem('jobflow-token'));

  it("saves the browser's zone when the account has none", async () => {
    vi.mocked(authApi.getMe).mockResolvedValue({ data: me(null) } as never);
    vi.mocked(authApi.updateTimeZone).mockResolvedValue({ data: me('America/Denver') } as never);

    render(<AuthProvider><Probe /></AuthProvider>);

    await waitFor(() => expect(screen.getByTestId('zone').textContent).toBe('America/Denver'));
    expect(authApi.updateTimeZone).toHaveBeenCalledWith('America/Denver');
  });

  it('leaves an existing zone alone (e.g. one picked in Settings)', async () => {
    vi.mocked(authApi.getMe).mockResolvedValue({ data: me('Asia/Shanghai') } as never);

    render(<AuthProvider><Probe /></AuthProvider>);

    await waitFor(() => expect(screen.getByTestId('zone').textContent).toBe('Asia/Shanghai'));
    expect(authApi.updateTimeZone).not.toHaveBeenCalled();
  });

  it("a failed save doesn't block signing in", async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(authApi.getMe).mockResolvedValue({ data: me(null) } as never);
    vi.mocked(authApi.updateTimeZone).mockRejectedValue(new Error('network down'));

    render(<AuthProvider><Probe /></AuthProvider>);

    await waitFor(() => expect(authApi.updateTimeZone).toHaveBeenCalled());
    expect(screen.getByTestId('email').textContent).toBe('alice@test.com');
    expect(screen.getByTestId('zone').textContent).toBe('null');
    warn.mockRestore();
  });

  it('never calls the backend in demo mode', async () => {
    vi.mocked(isDemoMode).mockReturnValue(true);
    vi.mocked(authApi.getMe).mockResolvedValue({ data: me(null) } as never);

    render(<AuthProvider><Probe /></AuthProvider>);

    await waitFor(() => expect(screen.getByTestId('email').textContent).toBe('alice@test.com'));
    expect(authApi.updateTimeZone).not.toHaveBeenCalled();
  });

  it('also fills it in after logging in with a password', async () => {
    localStorage.removeItem('jobflow-token');
    vi.mocked(authApi.login).mockResolvedValue({ data: me(null) } as never);
    vi.mocked(authApi.updateTimeZone).mockResolvedValue({ data: me('America/Denver') } as never);

    render(<AuthProvider><Probe /></AuthProvider>);
    fireEvent.click(screen.getByText('log in'));

    await waitFor(() => expect(screen.getByTestId('zone').textContent).toBe('America/Denver'));
    expect(authApi.updateTimeZone).toHaveBeenCalledWith('America/Denver');
  });
});
