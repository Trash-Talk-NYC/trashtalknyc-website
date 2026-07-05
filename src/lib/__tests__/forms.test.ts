import { describe, expect, it } from 'vitest';
import { validateSignupForm, validateContactForm } from '../forms';
import type { SignupFormData, ContactFormData } from '../forms';

// ── validateSignupForm ──────────────────────────────────────────────────────

describe('validateSignupForm', () => {
  const valid: SignupFormData = {
    fname: 'Jane',
    lname: 'Doe',
    email: 'jane@example.com',
    borough: 'Brooklyn',
  };

  it('returns valid:true for complete data', () => {
    expect(validateSignupForm(valid)).toEqual({ valid: true });
  });

  it('returns valid:true when optional fields are omitted', () => {
    expect(validateSignupForm({ ...valid, phone: '', experience: '', hear: '' })).toEqual({ valid: true });
  });

  it('fails when fname is missing', () => {
    const result = validateSignupForm({ ...valid, fname: '' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.fname).toBeTruthy();
  });

  it('fails when lname is missing', () => {
    const result = validateSignupForm({ ...valid, lname: '' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.lname).toBeTruthy();
  });

  it('fails when email is missing', () => {
    const result = validateSignupForm({ ...valid, email: '' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.email).toBeTruthy();
  });

  it('fails when email is malformed', () => {
    const result = validateSignupForm({ ...valid, email: 'not-an-email' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.email).toBeTruthy();
  });

  it('fails when borough is missing', () => {
    const result = validateSignupForm({ ...valid, borough: '' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.borough).toBeTruthy();
  });

  it('reports specific field names in errors', () => {
    const result = validateSignupForm({ fname: '', lname: '', email: '', borough: '' });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toHaveProperty('fname');
      expect(result.errors).toHaveProperty('lname');
      expect(result.errors).toHaveProperty('email');
      expect(result.errors).toHaveProperty('borough');
    }
  });

  it('trims whitespace-only strings as empty', () => {
    const result = validateSignupForm({ ...valid, fname: '   ' });
    expect(result.valid).toBe(false);
  });
});

// ── validateContactForm ─────────────────────────────────────────────────────

describe('validateContactForm', () => {
  const valid: ContactFormData = {
    fname: 'Jane',
    lname: 'Doe',
    email: 'jane@example.com',
    message: 'Hello there',
  };

  it('returns valid:true for complete general contact data', () => {
    expect(validateContactForm(valid)).toEqual({ valid: true });
  });

  it('returns valid:true for partnership type with organization provided', () => {
    expect(
      validateContactForm({ ...valid, formType: 'partnership', organization: 'ACME Corp' })
    ).toEqual({ valid: true });
  });

  it('fails when fname is missing', () => {
    const result = validateContactForm({ ...valid, fname: '' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.fname).toBeTruthy();
  });

  it('fails when lname is missing', () => {
    const result = validateContactForm({ ...valid, lname: '' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.lname).toBeTruthy();
  });

  it('fails when email is missing', () => {
    const result = validateContactForm({ ...valid, email: '' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.email).toBeTruthy();
  });

  it('fails when email is malformed', () => {
    const result = validateContactForm({ ...valid, email: 'bad@' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.email).toBeTruthy();
  });

  it('fails when message is missing', () => {
    const result = validateContactForm({ ...valid, message: '' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.message).toBeTruthy();
  });

  it('fails for partnership type when organization is missing', () => {
    const result = validateContactForm({ ...valid, formType: 'partnership', organization: '' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.organization).toBeTruthy();
  });

  it('does not require organization for general type', () => {
    expect(validateContactForm({ ...valid, formType: 'general', organization: '' })).toEqual({ valid: true });
  });

  it('reports specific field names in errors', () => {
    const result = validateContactForm({ fname: '', lname: '', email: '', message: '' });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toHaveProperty('fname');
      expect(result.errors).toHaveProperty('lname');
      expect(result.errors).toHaveProperty('email');
      expect(result.errors).toHaveProperty('message');
    }
  });

  it('trims whitespace-only strings as empty', () => {
    const result = validateContactForm({ ...valid, message: '   ' });
    expect(result.valid).toBe(false);
  });
});
