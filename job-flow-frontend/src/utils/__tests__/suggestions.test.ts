import { describe, it, expect } from 'vitest';
import { matchesSuggestion, mergeSuggestions } from '../suggestions';

describe('form suggestions', () => {
  const lists = { en: ['Remote', 'Seattle, WA'], zh: ['远程', '北京'] };

  it("puts the user's own entries first, then the app language's list, then the other", () => {
    expect(mergeSuggestions(['上海', null, 'seattle, wa'], 'en', lists)).toEqual(['上海', 'seattle, wa', 'Remote', '远程', '北京']);
    expect(mergeSuggestions([], 'zh', lists)).toEqual(['远程', '北京', 'Remote', 'Seattle, WA']);
  });

  it('finds a place by pinyin or English, and an English title by Chinese', () => {
    expect(matchesSuggestion('北京', 'Beijing', { '北京': ['beijing'] })).toBe(true);
    expect(matchesSuggestion('Backend Developer', '后端', { 'Backend Developer': ['后端'] })).toBe(true);
    expect(matchesSuggestion('北京', 'shanghai', { '北京': ['beijing'] })).toBe(false);
    expect(matchesSuggestion('北京', '  ')).toBe(true);
  });
});
