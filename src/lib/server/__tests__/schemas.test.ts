import { describe, expect, it } from 'vitest';
import { signupSchema, contactSchema, asBorough, BOROUGHS, NOT_IN_NYC } from '../schemas';

const validSignup = {
  fname: 'Jane',
  lname: 'Doe',
  email: 'jane@example.com',
  borough: 'Brooklyn',
  hear: 'Word of Mouth',
  waiverCheck: 'on',
  ageCheck: 'on',
};

const validOutsideNyc = {
  ...validSignup,
  borough: NOT_IN_NYC,
  country: 'United States',
  city: 'Hoboken, New Jersey',
  zip: '07030',
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
    const result = signupSchema.safeParse({ ...validSignup, phone: '', experience: '', hearOther: '', nycBorough: '', botcheck: '' });
    expect(result.success).toBe(true);
  });

  it('requires how-did-you-hear (captain, 2026-10)', () => {
    expect(signupSchema.safeParse({ ...validSignup, hear: '' }).success).toBe(false);
    const { hear: _omitted, ...withoutHear } = validSignup;
    expect(signupSchema.safeParse(withoutHear).success).toBe(false);
  });

  it('accepts the new hear choices with and without the free-text companion', () => {
    expect(signupSchema.safeParse({ ...validSignup, hear: 'Article' }).success).toBe(true);
    expect(signupSchema.safeParse({ ...validSignup, hear: 'Somewhere else', hearOther: 'A podcast' }).success).toBe(true);
    expect(signupSchema.safeParse({ ...validSignup, hear: 'Somewhere else', hearOther: '' }).success).toBe(true);
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

  it('passes the Turnstile token through and tolerates its absence', () => {
    const withToken = signupSchema.safeParse({ ...validSignup, 'cf-turnstile-response': 'tok' });
    expect(withToken.success && withToken.data['cf-turnstile-response']).toBe('tok');
    expect(signupSchema.safeParse(validSignup).success).toBe(true);
  });

  it('rejects a Turnstile token beyond the documented 2048-char max', () => {
    expect(signupSchema.safeParse({ ...validSignup, 'cf-turnstile-response': 'x'.repeat(2049) }).success).toBe(false);
  });

  describe('outside-NYC flow', () => {
    it('accepts a complete outside-NYC signup', () => {
      expect(signupSchema.safeParse(validOutsideNyc).success).toBe(true);
    });

    it.each(['country', 'city'])('requires %s when the borough is Not in NYC', (field) => {
      expect(signupSchema.safeParse({ ...validOutsideNyc, [field]: '' }).success).toBe(false);
    });

    it('requires a valid US ZIP for a United States signup', () => {
      expect(signupSchema.safeParse({ ...validOutsideNyc, zip: '' }).success).toBe(false);
      expect(signupSchema.safeParse({ ...validOutsideNyc, zip: 'abcde' }).success).toBe(false);
    });

    it('skips ZIP for a non-US country', () => {
      expect(signupSchema.safeParse({ ...validOutsideNyc, country: 'France', city: 'Paris', zip: '' }).success).toBe(true);
    });

    it('a valid NYC follow-up borough supersedes the location fields', () => {
      const nycAfterAll = { ...validSignup, borough: NOT_IN_NYC, nycBorough: 'Queens' };
      expect(signupSchema.safeParse(nycAfterAll).success).toBe(true);
    });

    it('an invalid follow-up borough still requires the location fields', () => {
      expect(signupSchema.safeParse({ ...validSignup, borough: NOT_IN_NYC, nycBorough: 'Hoboken' }).success).toBe(false);
      expect(signupSchema.safeParse({ ...validSignup, borough: NOT_IN_NYC, nycBorough: NOT_IN_NYC }).success).toBe(false);
    });
  });
});

describe('asBorough', () => {
  it.each(BOROUGHS)('narrows %s to itself', (borough) => {
    expect(asBorough(borough)).toBe(borough);
  });

  it('returns undefined for anything else', () => {
    expect(asBorough(undefined)).toBeUndefined();
    expect(asBorough('')).toBeUndefined();
    expect(asBorough('Hoboken')).toBeUndefined();
    expect(asBorough(NOT_IN_NYC)).toBeUndefined();
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

  it.each(['partnership', 'sponsor'])('requires organization for %s inquiries', (inquiryType) => {
    const orgBacked = { ...validContact, inquiryType };
    expect(contactSchema.safeParse(orgBacked).success).toBe(false);
    expect(contactSchema.safeParse({ ...orgBacked, organization: '  ' }).success).toBe(false);
    expect(contactSchema.safeParse({ ...orgBacked, organization: 'Acme Co' }).success).toBe(true);
  });

  it('accepts a complete sponsor inquiry', () => {
    expect(
      contactSchema.safeParse({ ...validContact, inquiryType: 'sponsor', organization: 'Acme Co' }).success,
    ).toBe(true);
  });
});
