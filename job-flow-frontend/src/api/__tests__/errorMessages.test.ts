import { describe, it, expect, afterEach } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { AxiosError, type AxiosResponse } from 'axios';
import { translateApiError } from '../errorMessages';
import { getErrorMessage } from '../client';
import { apiErrorText } from '../../i18n/apiErrors';

// Every error code string in the backend's Java sources, e.g. "COMPANY_NAME_TAKEN".
// Also matches the escaped one in the rate limiter's hand-written JSON.
function backendErrorCodes(): string[] {
  const root = resolve(process.cwd(), '../job-flow-backend/src/main/java');
  const codes = new Set<string>();
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name.endsWith('.java')) {
        for (const m of readFileSync(path, 'utf8').matchAll(/\\?"([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)\\?"/g)) {
          codes.add(m[1]);
        }
      }
    }
  };
  walk(root);
  return [...codes].sort();
}

describe('error code coverage', () => {
  const codes = backendErrorCodes();

  it('finds the backend codes (sanity check on the scan itself)', () => {
    expect(codes).toContain('COMPANY_NAME_TAKEN');
    expect(codes).toContain('FIELD_TOO_LONG');
    expect(codes).toContain('RATE_LIMITED');
    expect(codes.length).toBeGreaterThanOrEqual(38);
  });

  it('has an English and a Chinese message for every code the backend can send', () => {
    const missingEn = codes.filter((c) => !apiErrorText.en.errors[c]);
    const missingZh = codes.filter((c) => !apiErrorText.zh.errors[c]);
    expect(missingEn).toEqual([]);
    expect(missingZh).toEqual([]);
  });

  it('keeps both languages in sync', () => {
    expect(Object.keys(apiErrorText.zh.errors).sort()).toEqual(Object.keys(apiErrorText.en.errors).sort());
    expect(Object.keys(apiErrorText.zh.fields).sort()).toEqual(Object.keys(apiErrorText.en.fields).sort());
  });
});

describe('translateApiError', () => {
  it('fills params into the template', () => {
    const body = { code: 'COMPANY_NAME_TAKEN', params: { name: 'Acme' }, message: "A company named 'Acme' already exists" };
    expect(translateApiError(body, 'zh')).toBe('名为「Acme」的公司已存在');
    expect(translateApiError(body, 'en')).toBe("A company named 'Acme' already exists");
  });

  it('translates field names, including nested paths', () => {
    expect(translateApiError({ code: 'FIELD_TOO_LONG', params: { field: 'positionTitle', max: 255 } }, 'zh'))
      .toBe('职位名称最多 255 个字符');
    expect(translateApiError({ code: 'FIELD_REQUIRED', params: { field: 'items[0].gmailMessageId' } }, 'en'))
      .toBe('Email ID is required');
    // Unknown field: show the raw name rather than nothing
    expect(translateApiError({ code: 'FIELD_REQUIRED', params: { field: 'mystery' } }, 'zh')).toBe('请填写mystery');
  });

  it('joins several field errors', () => {
    const body = {
      code: 'VALIDATION_FAILED',
      errors: [
        { code: 'INVALID_EMAIL', params: { field: 'email' }, message: 'Invalid email format' },
        { code: 'FIELD_TOO_SHORT', params: { field: 'password', min: 6 }, message: 'Password must be at least 6 characters' },
      ],
    };
    expect(translateApiError(body, 'zh')).toBe('请输入有效的邮箱地址；密码至少 6 个字符');
    expect(translateApiError(body, 'en')).toBe('Please enter a valid email address; Password must be at least 6 characters');
  });

  it('keeps the backend text for an item it cannot translate', () => {
    const body = { code: 'VALIDATION_FAILED', errors: [{ code: 'SOMETHING_NEW', message: 'Something new happened' }] };
    expect(translateApiError(body, 'zh')).toBe('Something new happened');
  });

  it('returns null when there is nothing to translate', () => {
    expect(translateApiError({ message: 'Plain message' }, 'zh')).toBeNull();
    expect(translateApiError({ code: 'NOT_A_REAL_CODE' }, 'zh')).toBeNull();
    expect(translateApiError(null, 'zh')).toBeNull();
  });
});

describe('getErrorMessage', () => {
  afterEach(() => localStorage.removeItem('language'));

  const axiosError = (data: unknown) =>
    new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, { data, status: 400 } as AxiosResponse);

  it('uses the language picked in the app', () => {
    const err = axiosError({ code: 'RATE_LIMITED', params: { seconds: 42 }, message: 'Too many requests. Please wait 42 seconds and try again.' });

    localStorage.setItem('language', 'zh');
    expect(getErrorMessage(err, 'fallback')).toBe('请求太频繁，请 42 秒后再试');
    localStorage.setItem('language', 'en');
    expect(getErrorMessage(err, 'fallback')).toBe('Too many requests. Please wait 42 seconds and try again.');
  });

  it('falls back to the backend message, then to the caller fallback', () => {
    localStorage.setItem('language', 'zh');
    expect(getErrorMessage(axiosError({ message: 'Old style message' }), 'fallback')).toBe('Old style message');
    expect(getErrorMessage(axiosError(undefined), 'fallback')).toBe('fallback');
  });
});
