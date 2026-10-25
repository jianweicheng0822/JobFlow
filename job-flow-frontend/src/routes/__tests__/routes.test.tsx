import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from '..';
import { getAuthProviders } from '../../api/auth';

vi.mock('../../api/auth', () => ({
  getAuthProviders: vi.fn(),
  getMe: vi.fn(),
}));

// Stand-in for a page that crashes while rendering
vi.mock('../../pages/PrivacyPage', () => ({
  default: () => {
    throw new Error('boom');
  },
}));

function renderAt(url: string) {
  const router = createMemoryRouter(routes, { initialEntries: [url] });
  render(<RouterProvider router={router} />);
  return router;
}

describe('routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(getAuthProviders).mockResolvedValue({ data: { google: false, github: false, gmail: false } } as never);
  });

  it('shows the not found page for unknown URLs and sends signed-out users to login from it', async () => {
    const router = renderAt('/no-such-page');

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to home' }));
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
  });

  it('shows the error page instead of the router default when a page throws', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderAt('/privacy');

    expect(await screen.findByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to home' })).toBeInTheDocument();
    expect(screen.queryByText(/hey developer/i)).not.toBeInTheDocument();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
