import { describe, it, expect } from 'vitest';
import { normalizeEmail } from '../team.service';

describe('normalizeEmail', () => {
  it('trims and lowercases valid emails', () => {
    expect(normalizeEmail(' Test@Example.COM ')).toBe('test@example.com');
  });

  it('keeps plus-tags and normalizes case', () => {
    expect(normalizeEmail('TeSt+Tag@ExAmPlE.CoM')).toBe('test+tag@example.com');
  });

  it('returns empty string for empty/whitespace-only input', () => {
    expect(normalizeEmail('')).toBe('');
    expect(normalizeEmail('   ')).toBe('');
  });

  it('returns empty string for non-string values', () => {
    expect(normalizeEmail(null as unknown)).toBe('');
    expect(normalizeEmail(undefined as unknown)).toBe('');
    expect(normalizeEmail(123 as unknown)).toBe('');
    expect(normalizeEmail({} as unknown)).toBe('');
  });

  it('does not throw for malformed "email-like" strings', () => {
    expect(normalizeEmail('Not an EMAIL')).toBe('not an email');
  });
});

