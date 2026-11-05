import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import TopBar from '../TopBar';
import { LanguageProvider } from '../../context/LanguageProvider';
import { AuthContext, type AuthContextType } from '../../context/AuthContext';

// Search loads these lazily; keep them quiet
vi.mock('../../api/applications', () => ({ getApplications: vi.fn().mockResolvedValue({ data: [] }) }));
vi.mock('../../api/companies', () => ({ getCompanies: vi.fn().mockResolvedValue({ data: [] }) }));

const auth: AuthContextType = {
  user: {
    name: 'Ada Lovelace', email: 'ada@example.com', avatarUrl: null, jobTitle: null, bio: null,
    hasPassword: true, gmailConnected: false, timeZone: null,
  },
  loading: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  tryDemo: vi.fn(),
  updateUser: vi.fn(),
};

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <LanguageProvider>
        <AuthContext.Provider value={auth}>
          <TopBar />
        </AuthContext.Provider>
      </LanguageProvider>
    </MemoryRouter>
  );
}

describe('TopBar title', () => {
  beforeEach(() => localStorage.setItem('language', 'en'));

  it('greets the user on the dashboard', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^Good (morning|afternoon|evening), Ada!$/);
  });

  it('shows the page name everywhere else', () => {
    renderAt('/interviews');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Interviews');
  });
});
