import { describe, it, expect } from 'vitest';
import { companyColor } from '../companyColor';

describe('companyColor', () => {
  it('uses the brand color for well-known companies', () => {
    expect(companyColor('Google')).toBe('#4285F4');
    expect(companyColor('Stripe')).toBe('#635BFF');
  });

  it('gives other companies a stable, non-gray color', () => {
    const color = companyColor('Acme Robotics');

    expect(companyColor('Acme Robotics')).toBe(color);
    expect(companyColor('  acme robotics ')).toBe(color);
    expect(color).not.toBe('#6b7280');
  });

  it('spreads different names over different colors', () => {
    const names = ['Acme', 'Globex', 'Initech', 'Umbrella', 'Hooli', 'Pied Piper', 'Wayne', 'Stark'];
    expect(new Set(names.map(companyColor)).size).toBeGreaterThan(3);
  });
});
