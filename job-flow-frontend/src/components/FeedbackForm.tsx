import { useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { Bug, Lightbulb, MessageCircle } from 'lucide-react';
import { sendFeedback, type FeedbackType } from '../api/feedback';
import { getErrorMessage } from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import Modal from './Modal';
import './ApplicationForm.css';
import './FeedbackForm.css';

// Same limits as the backend (FeedbackRequest)
export const MESSAGE_MIN = 5;
export const MESSAGE_MAX = 1000;

interface FeedbackFormProps {
  onClose: () => void;
}

export default function FeedbackForm({ onClose }: FeedbackFormProps) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { pathname } = useLocation();

  const [type, setType] = useState<FeedbackType>('BUG');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [trap, setTrap] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const types = [
    { value: 'BUG' as const, label: t.feedbackTypeBug, icon: Bug },
    { value: 'IDEA' as const, label: t.feedbackTypeIdea, icon: Lightbulb },
    { value: 'OTHER' as const, label: t.feedbackTypeOther, icon: MessageCircle },
  ];

  const length = message.trim().length;
  const tooShort = length < MESSAGE_MIN;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (tooShort || sending) return;
    setError('');
    setSending(true);
    try {
      await sendFeedback({
        type,
        message: message.trim(),
        email: email.trim() || undefined,
        pageUrl: pathname,
        website: trap,
      });
      showToast(t.feedbackSent, 'success');
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, t.feedbackFailed));
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal title={t.feedbackTitle} onClose={onClose}>
      <form className="app-form" onSubmit={handleSubmit}>
        <div className="feedback-types" role="radiogroup" aria-label={t.feedbackTypeLabel}>
          {types.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={type === value}
              className={`feedback-type${type === value ? ' feedback-type--active' : ''}`}
              onClick={() => setType(value)}
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        <div className="app-form-field">
          <label className="app-form-label" htmlFor="feedback-message">
            {t.feedbackMessageLabel} <span className="required">*</span>
          </label>
          <textarea
            id="feedback-message"
            className="app-form-textarea feedback-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={MESSAGE_MAX}
            placeholder={t.feedbackMessagePlaceholder}
            autoFocus
          />
          <span className="feedback-count">{length} / {MESSAGE_MAX}</span>
        </div>

        <div className="app-form-field">
          <label className="app-form-label" htmlFor="feedback-email">{t.feedbackEmailLabel}</label>
          <input
            id="feedback-email"
            className="app-form-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.feedbackEmailPlaceholder}
          />
        </div>

        {/* Honeypot: off-screen and out of the tab order, so only bots fill it in. The name
            and autocomplete value are ones browser autofill leaves alone, unlike "website". */}
        <input
          className="feedback-trap"
          type="text"
          name="fb_extra_notes"
          autoComplete="new-password"
          tabIndex={-1}
          aria-hidden="true"
          value={trap}
          onChange={(e) => setTrap(e.target.value)}
        />

        <p className="feedback-hint">{t.feedbackPageHint}</p>

        {error && <span className="app-form-error" role="alert">{error}</span>}

        <div className="app-form-actions">
          <button type="button" className="app-form-btn app-form-btn--cancel" onClick={onClose}>
            {t.cancel}
          </button>
          <button type="submit" className="app-form-btn app-form-btn--submit" disabled={tooShort || sending}>
            {sending ? t.feedbackSending : t.feedbackSend}
          </button>
        </div>
      </form>
    </Modal>
  );
}
