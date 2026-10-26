import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import OAuthButtons from '../OAuthButtons';
import { LanguageProvider } from '../../context/LanguageProvider';
import * as authApi from '../../api/auth';
import type { AuthProviders } from '../../api/auth';

vi.mock('../../api/auth', () => ({
  getAuthProviders: vi.fn(),
}));

function serverHas(providers: AuthProviders) {
  vi.mocked(authApi.getAuthProviders).mockResolvedValue({ data: providers } as never);
}

function renderButtons() {
  return render(<OAuthButtons />, { wrapper: LanguageProvider });
}

describe('OAuthButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows Google and GitHub when both are configured', async () => {
    serverHas({ google: true, github: true, gmail: true, emailReminders: false });
    renderButtons();

    expect(await screen.findByRole('link', { name: /google/i })).toHaveAttribute('href', '/oauth2/authorization/google');
    expect(screen.getByRole('link', { name: /github/i })).toHaveAttribute('href', '/oauth2/authorization/github');
    expect(screen.getByText(/or continue with/i)).toBeInTheDocument();
  });

  it('shows only the configured provider', async () => {
    serverHas({ google: false, github: true, gmail: false, emailReminders: false });
    renderButtons();

    expect(await screen.findByRole('link', { name: /github/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /google/i })).not.toBeInTheDocument();
  });

  it('renders nothing, not even the divider, when none are configured', async () => {
    serverHas({ google: false, github: false, gmail: false, emailReminders: false });
    const { container } = renderButtons();

    await waitFor(() => expect(authApi.getAuthProviders).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('hides the buttons when the providers request fails', async () => {
    vi.mocked(authApi.getAuthProviders).mockRejectedValue(new Error('network down'));
    const { container } = renderButtons();

    await waitFor(() => expect(authApi.getAuthProviders).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
