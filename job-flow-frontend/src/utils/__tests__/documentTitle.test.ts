import { describe, it, expect } from 'vitest';
import { documentTitle } from '../documentTitle';
import en from '../../i18n/en';
import zh from '../../i18n/zh';

describe('documentTitle', () => {
  it('puts the page name before the app name', () => {
    expect(documentTitle('/', en)).toBe('Dashboard · JobFlow');
    expect(documentTitle('/jobs', en)).toBe('Jobs · JobFlow');
    expect(documentTitle('/login', en)).toBe('Sign In · JobFlow');
  });

  it('follows the language', () => {
    expect(documentTitle('/interviews', zh)).toBe(`面试 · ${zh.appName}`);
  });

  it('ignores a trailing slash', () => {
    expect(documentTitle('/settings/', en)).toBe('Settings · JobFlow');
  });

  it('shows just the app name on pages that only pass through', () => {
    expect(documentTitle('/oauth/callback', en)).toBe('JobFlow');
  });

  it('calls unknown paths not found', () => {
    expect(documentTitle('/nope', en)).toBe('Page not found · JobFlow');
  });
});
