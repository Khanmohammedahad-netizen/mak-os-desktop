import { describe, it, expect } from 'vitest';
import { normalizePhone } from '../normalize-phone';

describe('normalizePhone', () => {
  // 1. UAE mobile with leading 0
  it('strips leading 0 from UAE mobile (050 123 4567, dubai, uae)', () => {
    expect(normalizePhone('050 123 4567', 'dubai', 'uae')).toBe('+971501234567');
  });

  // 2. UAE mobile already E.164
  it('passes through E.164 UAE mobile (+971501234567)', () => {
    expect(normalizePhone('+971501234567', 'dubai', 'uae')).toBe('+971501234567');
  });

  // 3. UAE mobile with country code, no plus
  it('handles UAE number with country code but no plus (971501234567, dubai, uae)', () => {
    expect(normalizePhone('971501234567', 'dubai', 'uae')).toBe('+971501234567');
  });

  // 4. UAE landline with leading 0
  it('normalizes UAE landline with leading 0 (04 123 4567, dubai, uae)', () => {
    expect(normalizePhone('04 123 4567', 'dubai', 'uae')).toBe('+97141234567');
  });

  // 5. UK mobile with leading 0
  it('strips leading 0 from UK mobile (07911 123456, london, uk)', () => {
    expect(normalizePhone('07911 123456', 'london', 'uk')).toBe('+447911123456');
  });

  // 6. UK number already +44
  it('passes through E.164 UK mobile (+44 7911 123456)', () => {
    expect(normalizePhone('+44 7911 123456', 'london', 'uk')).toBe('+447911123456');
  });

  // 7. India 10-digit local
  it('normalizes India 10-digit local number (9876543210, mumbai, india)', () => {
    expect(normalizePhone('9876543210', 'mumbai', 'india')).toBe('+919876543210');
  });

  // 8. India with +91 prefix
  it('passes through E.164 India number (+91 98765 43210)', () => {
    expect(normalizePhone('+91 98765 43210', 'mumbai', 'india')).toBe('+919876543210');
  });

  // 9. Empty string → null
  it('returns null for empty string', () => {
    expect(normalizePhone('', 'dubai', 'uae')).toBeNull();
  });

  // 10. Unknown region → null
  it('returns null for unknown city and country (atlantis, unknown)', () => {
    expect(normalizePhone('0501234567', 'atlantis', 'unknown')).toBeNull();
  });

  // 11. Parentheses + spaces
  it('strips parentheses and spaces ((050) 123-4567, dubai, uae)', () => {
    expect(normalizePhone('(050) 123-4567', 'dubai', 'uae')).toBe('+971501234567');
  });

  // 12. Dashes
  it('strips dashes (050-123-4567, dubai, uae)', () => {
    expect(normalizePhone('050-123-4567', 'dubai', 'uae')).toBe('+971501234567');
  });

  // 13. Too short → null
  it('returns null for too-short number (123, dubai, uae)', () => {
    expect(normalizePhone('123', 'dubai', 'uae')).toBeNull();
  });

  // 14. Too long (17 digits) → null
  it('returns null for a number with 17 digits', () => {
    expect(normalizePhone('+97112345678901234', 'dubai', 'uae')).toBeNull();
  });

  // 15. Saudi mobile with leading 0
  it('strips leading 0 from Saudi mobile (0501234567, riyadh, saudi arabia)', () => {
    expect(normalizePhone('0501234567', 'riyadh', 'saudi arabia')).toBe('+966501234567');
  });

  // 16. Case-insensitive city and country
  it('handles uppercase city and country (DUBAI, UAE)', () => {
    expect(normalizePhone('050 123 4567', 'DUBAI', 'UAE')).toBe('+971501234567');
  });

  // 17. E.164 pass-through with different country than city
  it('passes through valid E.164 number regardless of city/country (+12025550100, dubai, uae)', () => {
    expect(normalizePhone('+12025550100', 'dubai', 'uae')).toBe('+12025550100');
  });

  // 18. Qatar 8-digit local
  it('normalizes Qatar 8-digit local number (33123456, doha, qatar)', () => {
    expect(normalizePhone('33123456', 'doha', 'qatar')).toBe('+97433123456');
  });

  // 19. Country fallback when city key missing
  it('falls back to country when city is not in map (unknown-city, uae)', () => {
    expect(normalizePhone('050 123 4567', 'some-uae-city', 'uae')).toBe('+971501234567');
  });

  // 20. Dots as separators
  it('strips dots as separators (050.123.4567, dubai, uae)', () => {
    expect(normalizePhone('050.123.4567', 'dubai', 'uae')).toBe('+971501234567');
  });

  // 21. E.164 with spaces (country code + local)
  it('normalizes E.164 with spaces (+971 50 123 4567)', () => {
    expect(normalizePhone('+971 50 123 4567', 'dubai', 'uae')).toBe('+971501234567');
  });

  // Bonus: united kingdom alias
  it('resolves "united kingdom" country key (+44)', () => {
    expect(normalizePhone('07911 123456', 'london', 'united kingdom')).toBe('+447911123456');
  });

  // Bonus: mixed-case country
  it('handles mixed-case country (Saudi Arabia)', () => {
    expect(normalizePhone('0501234567', 'riyadh', 'Saudi Arabia')).toBe('+966501234567');
  });
});
