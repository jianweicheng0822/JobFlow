import { describe, it, expect } from 'vitest';
import { currencyFromText, defaultCurrency, formatSalary } from '../salary';

describe('salary currency', () => {
  it('puts the symbol in front unless the text already has one', () => {
    expect(formatSalary('30k×15', 'CNY')).toBe('¥30k×15');
    expect(formatSalary('150,000', 'USD')).toBe('$150,000');
    expect(formatSalary('$150,000', 'USD')).toBe('$150,000');
    expect(formatSalary('150,000', null)).toBe('150,000');
    expect(formatSalary('', 'USD')).toBe('');
  });

  it('knows pounds, euros and Canadian dollars, and falls back to the code for others', () => {
    expect(formatSalary('95,000', 'GBP')).toBe('£95,000');
    expect(formatSalary('70,000', 'EUR')).toBe('€70,000');
    expect(formatSalary('150,000', 'CAD')).toBe('CA$150,000');
    expect(formatSalary('9,000,000', 'JPY')).toBe('JPY 9,000,000');
    expect(currencyFromText('£95,000')).toBe('GBP');
    expect(currencyFromText('€70,000')).toBe('EUR');
  });

  it('guesses older salaries from their text, else follows the app language', () => {
    expect(currencyFromText('$120,000')).toBe('USD');
    expect(currencyFromText('30万/年')).toBe('CNY');
    expect(currencyFromText('25k-35k')).toBeNull();
    expect(defaultCurrency('25k-35k', null, 'zh')).toBe('CNY');
    expect(defaultCurrency('25k-35k', null, 'en')).toBe('USD');
    expect(defaultCurrency('$120,000', 'CNY', 'en')).toBe('CNY');
  });
});
