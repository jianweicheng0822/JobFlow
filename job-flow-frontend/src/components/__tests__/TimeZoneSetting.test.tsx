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

const zoneSelect = () => screen.getByLabelText('Time Zone') as HTMLSelectElement;

describe('TimeZoneSetting', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the saved zone with its current time, and no hint when it matches the device', () => {
    renderWith('America/Denver');

    expect(zoneSelect().value).toBe('America/Denver');
    expect(screen.getByText(/current time: \d{1,2}:\d{2}\s?(AM|PM)/i)).toBeInTheDocument();
    expect(screen.queryByText(/this device is in/i)).not.toBeInTheDocument();
  });

  it('lists common zones by readable name, China and US first', () => {
    renderWith('America/Denver');

    expect(screen.getByRole('option', { name: /^Beijing \/ Shanghai/ })).toHaveValue('Asia/Shanghai');
    expect(screen.getByRole('option', { name: /^Los Angeles \/ Seattle/ })).toHaveValue('America/Los_Angeles');
  });

  it('says when no zone is set yet', () => {
    renderWith(null);

    expect(zoneSelect().value).toBe('');
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

  it('saves as soon as a zone is picked', async () => {
    vi.mocked(updateTimeZone).mockResolvedValue({ data: { timeZone: 'Asia/Shanghai' } } as never);
    const { updateUser } = renderWith('America/Denver');

    fireEvent.change(zoneSelect(), { target: { value: 'Asia/Shanghai' } });

    await waitFor(() => expect(updateUser).toHaveBeenCalledWith(expect.objectContaining({ timeZone: 'Asia/Shanghai' })));
    expect(updateTimeZone).toHaveBeenCalledWith('Asia/Shanghai');
    expect(await screen.findByText('Time zone updated')).toBeInTheDocument();
  });

  it("shows the backend's reason when saving fails and goes back to the saved zone", async () => {
    const response = { data: { message: 'Unknown time zone: Europe/London' }, status: 400 } as AxiosResponse;
    vi.mocked(updateTimeZone).mockRejectedValue(new AxiosError('Bad', 'ERR_BAD_REQUEST', undefined, undefined, response));
    const { updateUser } = renderWith('America/Denver');

    fireEvent.change(zoneSelect(), { target: { value: 'Europe/London' } });

    expect(await screen.findByText('Unknown time zone: Europe/London')).toBeInTheDocument();
    expect(updateUser).not.toHaveBeenCalled();
    expect(zoneSelect().value).toBe('America/Denver');
  });
});
