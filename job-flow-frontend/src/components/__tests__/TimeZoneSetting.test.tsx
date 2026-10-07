import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AxiosError, type AxiosResponse } from 'axios';
import TimeZoneSetting from '../TimeZoneSetting';
import { AuthContext, type AuthUser, type AuthContextType } from '../../context/AuthContext';
import { LanguageProvider } from '../../context/LanguageProvider';
import { ToastProvider } from '../../context/ToastProvider';
import { updateTimeZone } from '../../api/auth';

vi.mock('../../api/auth', () => ({
  updateTimeZone: vi.fn(),
}));

// Pretend this device is in Denver; keep the other date helpers real (the demo mock uses them)
vi.mock('../../utils/date', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/date')>()),
  browserTimeZone: () => 'America/Denver',
}));

const baseUser: AuthUser = {
  name: 'Alice', email: 'alice@test.com', avatarUrl: null, jobTitle: null, bio: null,
  hasPassword: true, gmailConnected: false, timeZone: null,
};

function renderWith(timeZone: string | null) {
  const updateUser = vi.fn();
  const auth: AuthContextType = {
    user: { ...baseUser, timeZone }, loading: false,
    login: vi.fn(), register: vi.fn(), logout: vi.fn(), tryDemo: vi.fn(), updateUser,
  };
  localStorage.setItem('language', 'en');
  render(
    <LanguageProvider>
      <ToastProvider>
        <AuthContext.Provider value={auth}>
          <TimeZoneSetting />
        </AuthContext.Provider>
      </ToastProvider>
    </LanguageProvider>,
  );
  return { updateUser };
}

const saveButton = () => screen.getByRole('button', { name: /save changes/i });
const zoneInput = () => screen.getByPlaceholderText(/search, e\.g\./i);

describe('TimeZoneSetting', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the saved zone with its current time, and no hint when it matches the device', () => {
    renderWith('America/Denver');

    expect(screen.getByText('America/Denver')).toBeInTheDocument();
    expect(screen.getByText(/\d{1,2}:\d{2}\s?(AM|PM)/)).toBeInTheDocument();
    expect(screen.queryByText(/this device is in/i)).not.toBeInTheDocument();
    // Nothing changed yet
    expect(saveButton()).toBeDisabled();
  });

  it('says when no zone is set yet', () => {
    renderWith(null);

    expect(screen.getByText(/not set yet/i)).toBeInTheDocument();
  });

  it('offers the device zone when it differs, and saves it in one click', async () => {
    vi.mocked(updateTimeZone).mockResolvedValue({ data: { timeZone: 'America/Denver' } } as never);
    const { updateUser } = renderWith('Asia/Shanghai');

    expect(screen.getByText(/this device is in America\/Denver/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Use America/Denver' }));

    await waitFor(() => expect(updateUser).toHaveBeenCalledWith(expect.objectContaining({ timeZone: 'America/Denver' })));
    expect(updateTimeZone).toHaveBeenCalledWith('America/Denver');
    expect(await screen.findByText('Time zone updated')).toBeInTheDocument();
  });

  it('saves a zone picked from the list', async () => {
    vi.mocked(updateTimeZone).mockResolvedValue({ data: { timeZone: 'Europe/London' } } as never);
    const { updateUser } = renderWith('America/Denver');

    fireEvent.change(zoneInput(), { target: { value: 'Europe/London' } });
    expect(saveButton()).toBeEnabled();
    fireEvent.click(saveButton());

    await waitFor(() => expect(updateUser).toHaveBeenCalledWith(expect.objectContaining({ timeZone: 'Europe/London' })));
  });

  it("won't save something that isn't a real zone", () => {
    renderWith('America/Denver');

    fireEvent.change(zoneInput(), { target: { value: 'Mars/Olympus_Mons' } });
    expect(saveButton()).toBeDisabled();
  });

  it("shows the backend's reason when saving fails", async () => {
    const response = { data: { message: 'Unknown time zone: Europe/London' }, status: 400 } as AxiosResponse;
    vi.mocked(updateTimeZone).mockRejectedValue(new AxiosError('Bad', 'ERR_BAD_REQUEST', undefined, undefined, response));
    const { updateUser } = renderWith('America/Denver');

    fireEvent.change(zoneInput(), { target: { value: 'Europe/London' } });
    fireEvent.click(saveButton());

    expect(await screen.findByText('Unknown time zone: Europe/London')).toBeInTheDocument();
    expect(updateUser).not.toHaveBeenCalled();
  });
});
