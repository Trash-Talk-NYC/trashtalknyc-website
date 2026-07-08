import { describe, expect, it } from 'vitest';
import { signupSchema, contactSchema, BOROUGHS } from '../schemas';

const validSignup = {
  fname: 'Jane',
  lname: 'Doe',
  email: 'jane@example.com',
  borough: 'Brooklyn',
  waiverCheck: 'on',
  ageCheck: 'on',
};

const validContact = {
  fname: 'Jane',
  lname: 'Doe',
  email: 'jane@example.com',
  inquiryType: 'general',
  message: 'Hello there',
};

describe('signupSchema', () => {
  it('accepts complete required data', () => {
    expect(signupSchema.safeParse(validSignup).success).toBe(true);
  });

  it('accepts optional fields as empty strings (how empty inputs submit)', () => {
    const result = signupSchema.safeParse({ ...validSignup, phone: '', experience: '', hear: '', botcheck: '' });
    expect(result.success).toBe(true);
  });

  it.each(['fname', 'lname', 'email'])('rejects missing %s', (field) => {
    expect(signupSchema.safeParse({ ...validSignup, [field]: '' }).success).toBe(false);
  });

  it('rejects an invalid email', () => {
    expect(signupSchema.safeParse({ ...validSignup, email: 'not-an-email' }).success).toBe(false);
  });

  it.each(BOROUGHS)('accepts borough %s', (borough) => {
    expect(signupSchema.safeParse({ ...validSignup, borough }).success).toBe(true);
  });

  it('rejects an unknown borough', () => {
    expect(signupSchema.safeParse({ ...validSignup, borough: 'Hoboken' }).success).toBe(false);
  });

  it('trims whitespace-only names down to invalid', () => {
    expect(signupSchema.safeParse({ ...validSignup, fname: '   ' }).success).toBe(false);
  });

  it.each(['waiverCheck', 'ageCheck'])('rejects a submission missing %s (checkbox unchecked)', (field) => {
    const { [field]: _omitted, ...rest } = validSignup as Record<string, string>;
    expect(signupSchema.safeParse(rest).success).toBe(false);
  });

  it.each(['waiverCheck', 'ageCheck'])('rejects a non-"on" value for %s', (field) => {
    expect(signupSchema.safeParse({ ...validSignup, [field]: 'true' }).success).toBe(false);
  });

  it('requires both waiver checkboxes to be accepted', () => {
    expect(signupSchema.safeParse(validSignup).success).toBe(true);
  });
});

describe('contactSchema', () => {
  it('accepts a complete general inquiry', () => {
    expect(contactSchema.safeParse(validContact).success).toBe(true);
  });

  it('accepts a general inquiry with the hidden organization field empty', () => {
    expect(contactSchema.safeParse({ ...validContact, organization: '' }).success).toBe(true);
  });

  it('accepts phone as optional or empty (mirrors the signup form)', () => {
    expect(contactSchema.safeParse({ ...validContact, phone: '' }).success).toBe(true);
    expect(contactSchema.safeParse({ ...validContact, phone: '(212) 555-0100' }).success).toBe(true);
  });

  it('rejects a missing message', () => {
    expect(contactSchema.safeParse({ ...validContact, message: '' }).success).toBe(false);
  });

  it('rejects an unknown inquiry type', () => {
    expect(contactSchema.safeParse({ ...validContact, inquiryType: 'sales' }).success).toBe(false);
  });

  it('requires organization for partnership inquiries', () => {
    const partnership = { ...validContact, inquiryType: 'partnership' };
    expect(contactSchema.safeParse(partnership).success).toBe(false);
    expect(contactSchema.safeParse({ ...partnership, organization: '  ' }).success).toBe(false);
    expect(contactSchema.safeParse({ ...partnership, organization: 'Acme Co' }).success).toBe(true);
  });
});
