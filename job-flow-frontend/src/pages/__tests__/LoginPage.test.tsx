import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import LoginPage from '../LoginPage';
import { LanguageProvider } from '../../context/LanguageProvider';
import { AuthContext, type AuthContextType } from '../../context/AuthContext';

// Which buttons to show doesn't matter here
vi.mock('../../hooks/useAuthProviders', () => ({ useAuthProviders: () => null }));

const auth: AuthContextType = {
  user: null,
  loading: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  tryDemo: vi.fn(),
  updateUser: vi.fn(),
};

function SearchProbe() {
  return <div data-testid="search">{useLocation().search}</div>;
}

function renderAt(url: string) {
  return render(
    <LanguageProvider>
      <AuthContext.Provider value={auth}>
        <MemoryRouter initialEntries={[url]}>
          <Routes>
            <Route path="/login" element={<><LoginPage /><SearchProbe /></>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </LanguageProvider>
  );
}

describe('LoginPage OAuth errors', () => {
  it('says the sign-in was cancelled and clears the code from the URL', () => {
    renderAt('/login?oauthError=cancelled');

    expect(screen.getByText('Sign-in was cancelled.')).toBeInTheDocument();
    expect(screen.getByTestId('search')).toBeEmptyDOMElement();
  });

  it('explains when the email already belongs to another account', () => {
    renderAt('/login?oauthError=email_in_use');

    expect(screen.getByText(/already has a JobFlow account/)).toBeInTheDocument();
  });

  it('falls back to a generic message for other codes', () => {
    renderAt('/login?oauthError=failed');

    expect(screen.getByText("Couldn't finish signing in. Please try again.")).toBeInTheDocument();
  });

  it('shows no error on a plain visit', () => {
    const { container } = renderAt('/login');

    expect(container.querySelector('.auth-error')).toBeNull();
  });
});
