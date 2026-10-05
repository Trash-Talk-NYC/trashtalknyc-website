import { describe, expect, it } from 'vitest';
import { leadSchema, signupSchema, NOT_IN_NYC } from '../schemas';
import { rollingMonths } from '../../months';

const currentMonth = rollingMonths(1)[0].value;

const validLead = {
  fname: 'Jane',
  lname: 'Doe',
  email: 'jane@example.com',
  phone: '(212) 555-0123',
  behalf: 'individual',
  mailingAddress: '708 W 171st St, Apt 2, New York, NY 10032',
  routeType: 'loop',
  startAddress: '708 WEST 171 STREET, New York, NY, USA',
  startAddressId: 'nycpad:venue:337433',
  preferredMonth: currentMonth,
};

describe('leadSchema', () => {
  it('accepts a complete loop application', () => {
    expect(leadSchema.safeParse(validLead).success).toBe(true);
  });

  it('accepts an organization application', () => {
    expect(leadSchema.safeParse({ ...validLead, behalf: 'organization' }).success).toBe(true);
  });

  it.each(['fname', 'lname', 'email', 'phone', 'mailingAddress', 'startAddress', 'startAddressId', 'preferredMonth'])(
    'rejects a missing %s (all required)',
    (field) => {
      expect(leadSchema.safeParse({ ...validLead, [field]: '' }).success).toBe(false);
    },
  );

  it('requires a REAL phone number, not just any text', () => {
    expect(leadSchema.safeParse({ ...validLead, phone: '12345' }).success).toBe(false);
    expect(leadSchema.safeParse({ ...validLead, phone: '+44 20 7946 0958' }).success).toBe(true);
  });

  it('requires an end address only for one-way routes', () => {
    expect(leadSchema.safeParse({ ...validLead, routeType: 'oneway' }).success).toBe(false);
    expect(
      leadSchema.safeParse({ ...validLead, routeType: 'oneway', endAddress: '710 WEST 171 STREET, New York, NY, USA' }).success,
    ).toBe(false);
    expect(
      leadSchema.safeParse({
        ...validLead,
        routeType: 'oneway',
        endAddress: '710 WEST 171 STREET, New York, NY, USA',
        endAddressId: 'nycpad:venue:337434',
      }).success,
    ).toBe(true);
    // Loop never needs one
    expect(leadSchema.safeParse({ ...validLead, endAddress: '' }).success).toBe(true);
  });

  it('rejects a past or malformed preferred month', () => {
    expect(leadSchema.safeParse({ ...validLead, preferredMonth: 'January 2020' }).success).toBe(false);
    expect(leadSchema.safeParse({ ...validLead, preferredMonth: 'whenever' }).success).toBe(false);
  });

  it('rejects an unknown behalf or route type', () => {
    expect(leadSchema.safeParse({ ...validLead, behalf: 'robot' }).success).toBe(false);
    expect(leadSchema.safeParse({ ...validLead, routeType: 'spiral' }).success).toBe(false);
  });
});

describe('signupSchema outside-NYC flow', () => {
  const base = {
    fname: 'Jane',
    lname: 'Doe',
    email: 'jane@example.com',
    waiverCheck: 'on',
    ageCheck: 'on',
  };

  it('accepts Not in NYC with US country, city, and ZIP', () => {
    const result = signupSchema.safeParse({
      ...base,
      borough: NOT_IN_NYC,
      country: 'United States',
      city: 'Jersey City, New Jersey',
      zip: '07030',
    });
    expect(result.success).toBe(true);
  });

  it('requires country and city when Not in NYC', () => {
    expect(signupSchema.safeParse({ ...base, borough: NOT_IN_NYC }).success).toBe(false);
    expect(
      signupSchema.safeParse({ ...base, borough: NOT_IN_NYC, country: 'United States', zip: '07030' }).success,
    ).toBe(false);
  });

  it('requires a 5-digit ZIP only for the United States', () => {
    expect(
      signupSchema.safeParse({ ...base, borough: NOT_IN_NYC, country: 'United States', city: 'Hoboken, New Jersey' })
        .success,
    ).toBe(false);
    expect(
      signupSchema.safeParse({ ...base, borough: NOT_IN_NYC, country: 'United Kingdom', city: 'London' }).success,
    ).toBe(true);
  });

  it('rejects a country outside the offered list', () => {
    expect(
      signupSchema.safeParse({ ...base, borough: NOT_IN_NYC, country: 'Atlantis', city: 'Somewhere' }).success,
    ).toBe(false);
  });

  it('never demands location fields for NYC boroughs', () => {
    expect(signupSchema.safeParse({ ...base, borough: 'Queens' }).success).toBe(true);
  });

  it('enforces phone validity when a phone is given', () => {
    expect(signupSchema.safeParse({ ...base, borough: 'Queens', phone: 'abc' }).success).toBe(false);
    expect(signupSchema.safeParse({ ...base, borough: 'Queens', phone: '(212) 555-0123' }).success).toBe(true);
    expect(signupSchema.safeParse({ ...base, borough: 'Queens', phone: '' }).success).toBe(true);
  });
});
