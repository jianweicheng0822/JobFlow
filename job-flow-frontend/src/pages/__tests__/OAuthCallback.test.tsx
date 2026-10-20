import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StrictMode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AxiosError, AxiosHeaders } from 'axios';
import OAuthCallback from '../OAuthCallback';
import { LanguageProvider } from '../../context/LanguageProvider';
import * as authApi from '../../api/auth';

vi.mock('../../api/auth', () => ({
  exchangeOAuthCode: vi.fn(),
}));

function LoginProbe() {
  const location = useLocation();
  const error = (location.state as { error?: string } | null)?.error;
  return <div data-testid="login">{error ?? 'no error'}</div>;
}

function renderAt(url: string) {
  return render(
    <StrictMode>
      <LanguageProvider>
        <MemoryRouter initialEntries={[url]}>
          <Routes>
            <Route path="/oauth/callback" element={<OAuthCallback />} />
            <Route path="/login" element={<LoginProbe />} />
          </Routes>
        </MemoryRouter>
      </LanguageProvider>
    </StrictMode>
  );
}

describe('OAuthCallback', () => {
  const replace = vi.fn();
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // jsdom can't navigate, so capture the full-page redirect instead
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, pathname: '/oauth/callback', replace },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  });

  it('exchanges the code once, stores the token and reloads home', async () => {
    vi.mocked(authApi.exchangeOAuthCode).mockResolvedValue({ data: { token: 'jwt-from-code' } } as never);

    renderAt('/oauth/callback?code=abc123');

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(localStorage.getItem('jobflow-token')).toBe('jwt-from-code');
    // StrictMode mounts twice; a second exchange would burn the code and fail
    expect(authApi.exchangeOAuthCode).toHaveBeenCalledTimes(1);
    expect(authApi.exchangeOAuthCode).toHaveBeenCalledWith('abc123');
  });

  it('sends the user to login with the reason when the code is rejected', async () => {
    const body = { code: 'INVALID_OAUTH_CODE', message: 'Sign-in link is invalid or has expired' };
    vi.mocked(authApi.exchangeOAuthCode).mockRejectedValue(
      new AxiosError('Bad Request', '400', undefined, undefined, {
        status: 400, statusText: 'Bad Request', data: body, headers: {}, config: { headers: new AxiosHeaders() },
      })
    );

    renderAt('/oauth/callback?code=used-already');

    expect(await screen.findByTestId('login')).toHaveTextContent('expired or was already used');
    expect(localStorage.getItem('jobflow-token')).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });

  it('goes straight to login without a code', async () => {
    renderAt('/oauth/callback');

    expect(await screen.findByTestId('login')).toHaveTextContent('no error');
    expect(authApi.exchangeOAuthCode).not.toHaveBeenCalled();
  });

  it('ignores the old ?token= style links', async () => {
    renderAt('/oauth/callback?token=some.jwt.value');

    await screen.findByTestId('login');
    expect(localStorage.getItem('jobflow-token')).toBeNull();
  });
});
