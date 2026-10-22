import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import PrivacyPage from '../PrivacyPage';
import { LanguageProvider } from '../../context/LanguageProvider';

function renderPage() {
  return render(
    <LanguageProvider>
      <MemoryRouter>
        <PrivacyPage />
      </MemoryRouter>
    </LanguageProvider>
  );
}

describe('PrivacyPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('includes the Limited Use statement Google requires for Gmail access', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Privacy Policy' })).toBeInTheDocument();
    expect(screen.getByText(/adheres to the Google API Services User Data Policy, including the Limited Use requirements/)).toBeInTheDocument();
    // Gmail import reads headers only, and the page should say so
    expect(screen.getByText(/never the message body/)).toBeInTheDocument();
    // Somewhere to ask for deletion
    expect(screen.getByRole('link', { name: 'a1206084539@gmail.com' })).toHaveAttribute('href', 'mailto:a1206084539@gmail.com');
  });

  it('follows the chosen language', () => {
    localStorage.setItem('language', 'zh');
    renderPage();

    expect(screen.getByRole('heading', { name: '隐私政策' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '返回登录' })).toHaveAttribute('href', '/login');
  });
});
