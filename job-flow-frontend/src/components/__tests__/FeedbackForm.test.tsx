import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FeedbackForm, { MESSAGE_MAX } from '../FeedbackForm';
import { ToastProvider } from '../../context/ToastProvider';
import { LanguageProvider } from '../../context/LanguageProvider';
import { sendFeedback } from '../../api/feedback';

vi.mock('../../api/feedback', () => ({
  sendFeedback: vi.fn(),
}));

function renderForm(onClose = vi.fn()) {
  render(
    <MemoryRouter initialEntries={['/jobs']}>
      <LanguageProvider>
        <ToastProvider>
          <FeedbackForm onClose={onClose} />
        </ToastProvider>
      </LanguageProvider>
    </MemoryRouter>,
  );
  return onClose;
}

function typeMessage(text: string) {
  fireEvent.change(screen.getByLabelText(/Your feedback/), { target: { value: text } });
}

function apiError(status: number, data: unknown) {
  return new AxiosError('fail', String(status), undefined, undefined, {
    status, data, statusText: '', headers: {}, config: { headers: new AxiosHeaders() },
  } as AxiosResponse);
}

describe('FeedbackForm', () => {
  beforeEach(() => {
    vi.mocked(sendFeedback).mockReset();
    localStorage.clear();
  });

  it('keeps Send disabled until the message has 5 characters', () => {
    renderForm();
    const send = screen.getByRole('button', { name: 'Send' });

    expect(send).toBeDisabled();
    typeMessage('   hey   ');
    expect(send).toBeDisabled();
    typeMessage('Broken');
    expect(send).toBeEnabled();
  });

  it('counts characters and caps them at the backend limit', () => {
    renderForm();
    typeMessage('  Hello  ');

    expect(screen.getByText(`5 / ${MESSAGE_MAX}`)).toBeInTheDocument();
    expect(screen.getByLabelText(/Your feedback/)).toHaveAttribute('maxLength', String(MESSAGE_MAX));
  });

  it('sends the trimmed message, chosen type, email and current page, then closes', async () => {
    vi.mocked(sendFeedback).mockResolvedValue({} as AxiosResponse);
    const onClose = renderForm();

    fireEvent.click(screen.getByRole('radio', { name: /Idea/ }));
    typeMessage('  Add a calendar view  ');
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: ' me@example.com ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(sendFeedback).toHaveBeenCalledWith({
      type: 'IDEA',
      message: 'Add a calendar view',
      email: 'me@example.com',
      pageUrl: '/jobs',
      website: '',
    });
    expect(await screen.findByText('Thanks! Your feedback was sent.')).toBeInTheDocument();
  });

  it('defaults to Bug and leaves out a blank email', async () => {
    vi.mocked(sendFeedback).mockResolvedValue({} as AxiosResponse);
    renderForm();

    expect(screen.getByRole('radio', { name: /Bug/ })).toHaveAttribute('aria-checked', 'true');
    typeMessage('Broken page');
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(sendFeedback).toHaveBeenCalled());
    expect(vi.mocked(sendFeedback).mock.calls[0][0]).toMatchObject({ type: 'BUG', email: undefined });
  });

  it('shows the translated rate limit message and stays open', async () => {
    vi.mocked(sendFeedback).mockRejectedValue(apiError(429, {
      code: 'FEEDBACK_RATE_LIMITED', params: { minutes: 15 }, message: 'slow down',
    }));
    const onClose = renderForm();

    typeMessage('Broken page');
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Please try again in 15 minutes.');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps the honeypot out of reach of people and of autofill', () => {
    const { container } = render(
      <MemoryRouter>
        <LanguageProvider>
          <ToastProvider>
            <FeedbackForm onClose={vi.fn()} />
          </ToastProvider>
        </LanguageProvider>
      </MemoryRouter>,
    );
    const trap = container.querySelector('.feedback-trap')!;

    expect(trap).toHaveAttribute('tabIndex', '-1');
    expect(trap).toHaveAttribute('aria-hidden', 'true');
    // "website" is what LoLTracker used, and browser autofill filled it in for real people
    expect(trap.getAttribute('name')).not.toMatch(/website|url|company|email|name/i);
    expect(trap).toHaveAttribute('autoComplete', 'new-password');
  });
});
