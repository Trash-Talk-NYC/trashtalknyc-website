import { describe, expect, it } from 'vitest';
import { leadSchema } from '../schemas';
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
  startAddressPoint: '-73.938,40.843',
  preferredMonth: currentMonth,
};

describe('leadSchema', () => {
  it('accepts a complete loop application', () => {
    expect(leadSchema.safeParse(validLead).success).toBe(true);
  });

  it('accepts an organization application', () => {
    expect(leadSchema.safeParse({ ...validLead, behalf: 'organization' }).success).toBe(true);
  });

  it.each(['fname', 'lname', 'email', 'phone', 'mailingAddress', 'startAddress', 'startAddressId', 'startAddressPoint', 'preferredMonth'])(
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
    ).toBe(false);
    expect(
      leadSchema.safeParse({
        ...validLead,
        routeType: 'oneway',
        endAddress: '710 WEST 171 STREET, New York, NY, USA',
        endAddressId: 'nycpad:venue:337434',
        endAddressPoint: '-73.938,40.843',
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
