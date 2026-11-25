import { describe, it, expect } from 'vitest';
import { normalizeJobUrl, isWebUrl } from '../jobUrl';

describe('normalizeJobUrl', () => {
  it('adds https:// to a pasted link without a scheme', () => {
    expect(normalizeJobUrl('  linkedin.com/jobs/view/123 ')).toBe('https://linkedin.com/jobs/view/123');
  });

  it('keeps links that already have a scheme, including bad ones', () => {
    expect(normalizeJobUrl('http://example.com/job')).toBe('http://example.com/job');
    expect(normalizeJobUrl('javascript:alert(1)')).toBe('javascript:alert(1)');
  });

  it('turns blank input into an empty string', () => {
    expect(normalizeJobUrl('   ')).toBe('');
  });
});

describe('isWebUrl', () => {
  it('accepts http and https links', () => {
    expect(isWebUrl('https://boards.greenhouse.io/acme/jobs/1')).toBe(true);
    expect(isWebUrl('HTTP://example.com')).toBe(true);
  });

  it.each([
    'javascript:alert(1)', 'data:text/html,hi', 'ftp://example.com', 'https://', 'https://exa mple.com', '', null, undefined,
  ])('rejects %s', (url) => {
    expect(isWebUrl(url)).toBe(false);
  });
});
