import { describe, it, expect, beforeEach } from 'vitest';
import { getStoredAvatar, storeAvatar, removeStoredAvatar } from '../avatar';

describe('stored avatars', () => {
  beforeEach(() => localStorage.clear());

  it('keeps each account its own photo', () => {
    storeAvatar('alice@example.com', 'data:alice');

    expect(getStoredAvatar('alice@example.com')).toBe('data:alice');
    expect(getStoredAvatar('bob@example.com')).toBeNull();
  });

  it('drops the old shared photo instead of showing it to anyone', () => {
    localStorage.setItem('jobflow-avatar', 'data:someone');

    expect(getStoredAvatar('bob@example.com')).toBeNull();
    expect(localStorage.getItem('jobflow-avatar')).toBeNull();
  });

  it('returns nothing before the user is known', () => {
    storeAvatar('alice@example.com', 'data:alice');

    expect(getStoredAvatar(undefined)).toBeNull();
  });

  it('can forget an account photo', () => {
    storeAvatar('alice@example.com', 'data:alice');
    removeStoredAvatar('alice@example.com');

    expect(getStoredAvatar('alice@example.com')).toBeNull();
  });
});
