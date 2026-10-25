import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DemoBanner from '../DemoBanner';
import ProtectedRoute from '../ProtectedRoute';
import { AuthContext, type AuthUser } from '../../context/AuthContext';
import { LanguageProvider } from '../../context/LanguageProvider';

const user: AuthUser = {
  name: 'Demo User', email: 'demo@jobflow.com', avatarUrl: null, jobTitle: null, bio: null,
  hasPassword: true, gmailConnected: false, timeZone: null,
};

// Real auth state behind a real ProtectedRoute, like in the app, so logging out
// redirects the same way it would there
function renderBanner() {
  const logout = vi.fn();
  function Harness() {
    const [current, setCurrent] = useState<AuthUser | null>(user);
    const auth = {
      user: current, loading: false, login: vi.fn(), register: vi.fn(),
      logout: () => { logout(); setCurrent(null); },
      tryDemo: vi.fn(), updateUser: vi.fn(),
    };
    return (
      <AuthContext.Provider value={auth}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<DemoBanner />} />
            </Route>
            <Route path="/register" element={<div>register page</div>} />
            <Route path="/login" element={<div>login page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );
  }
  render(
    <LanguageProvider>
      <Harness />
    </LanguageProvider>
  );
  return logout;
}

describe('DemoBanner', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('tells demo users their changes reset on refresh', () => {
    localStorage.setItem('jobflow-token', 'demo-token');
    renderBanner();
    expect(screen.getByRole('status')).toHaveTextContent(/sample data.*refresh/i);
  });

  it('stays hidden for real accounts', () => {
    localStorage.setItem('jobflow-token', 'a-real-jwt');
    renderBanner();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('links to the sign up page', () => {
    localStorage.setItem('jobflow-token', 'demo-token');
    renderBanner();
    fireEvent.click(screen.getByRole('link', { name: /sign up/i }));
    expect(screen.getByText('register page')).toBeInTheDocument();
  });
});
