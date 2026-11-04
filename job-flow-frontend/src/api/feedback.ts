import client from './client';

export type FeedbackType = 'BUG' | 'IDEA' | 'OTHER';

export interface FeedbackRequest {
  type: FeedbackType;
  message: string;
  email?: string;
  pageUrl?: string;
  // Honeypot, see FeedbackForm
  website?: string;
}

// Not mocked in the demo: it goes to the real backend, where the demo's fake token
// just counts as logged out, so demo visitors can send feedback too.
export function sendFeedback(data: FeedbackRequest) {
  return client.post<void>('/feedback', data);
}
