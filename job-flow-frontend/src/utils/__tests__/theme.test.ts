import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getStoredTheme, applyTheme } from '../theme';

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to light and reads a saved dark theme', () => {
    expect(getStoredTheme()).toBe('light');
    localStorage.setItem('jobflow-theme', 'dark');
    expect(getStoredTheme()).toBe('dark');
  });

  it('treats anything unexpected as light', () => {
    localStorage.setItem('jobflow-theme', 'purple');
    expect(getStoredTheme()).toBe('light');
  });

  it('applies the theme to the page and remembers it', () => {
    applyTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('jobflow-theme')).toBe('dark');
  });

  it('still works when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });

    expect(getStoredTheme()).toBe('light');
    applyTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
