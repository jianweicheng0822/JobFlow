import { describe, it, expect } from 'vitest';
import { formatLastAction } from '../formatLastAction';
import en from '../../i18n/en';
import zh from '../../i18n/zh';

describe('formatLastAction', () => {
  it('translates the auto "Moved to" text from the backend', () => {
    expect(formatLastAction('Moved to Interview', zh)).toBe('状态更新为「面试中」');
    expect(formatLastAction('Moved to Phone Screen', zh)).toBe('状态更新为「电话筛选」');
    expect(formatLastAction('Moved to In Review', en)).toBe('Moved to In Review');
  });

  it('translates known seed phrases, ignoring case', () => {
    expect(formatLastAction('Interview Scheduled', zh)).toBe('已安排面试');
    expect(formatLastAction('Phone screen scheduled', zh)).toBe('已安排电话筛选');
    expect(formatLastAction('Offer received', en)).toBe('Offer Received');
  });

  it('leaves unknown text untouched', () => {
    expect(formatLastAction('Sent thank-you email', zh)).toBe('Sent thank-you email');
    expect(formatLastAction('Moved to Mars', zh)).toBe('Moved to Mars');
  });

  it('returns an empty string for missing values', () => {
    expect(formatLastAction(null, zh)).toBe('');
    expect(formatLastAction('', en)).toBe('');
  });
});
