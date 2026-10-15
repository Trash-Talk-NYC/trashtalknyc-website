import { describe, expect, it } from 'vitest';
import { leadSchema } from '../schemas';
import { buildLeadNoteLines } from '../leadNote';
import { rollingMonths } from '../../months';

const currentMonth = rollingMonths(1)[0].value;

const validLead = {
  fname: 'Jane',
  lname: 'Doe',
  email: 'jane@example.com',
  phone: '(212) 555-0123',
  behalf: 'individual',
  startAddress: '708 WEST 171 STREET, New York, NY, USA',
  startAddressId: 'nycpad:venue:337433',
  startAddressPoint: '-73.938,40.843',
  cleaningNeed: 'tree-beds',
  support: ['supplies'],
  preferredMonth: currentMonth,
};

describe('leadSchema', () => {
  it('accepts a complete request', () => {
    expect(leadSchema.safeParse(validLead).success).toBe(true);
  });

  it('accepts an organization request', () => {
    expect(leadSchema.safeParse({ ...validLead, behalf: 'organization' }).success).toBe(true);
  });

  it.each(['fname', 'lname', 'email', 'phone', 'startAddress', 'startAddressId', 'startAddressPoint', 'cleaningNeed', 'preferredMonth'])(
    'rejects a missing %s (all required)',
    (field) => {
      expect(leadSchema.safeParse({ ...validLead, [field]: '' }).success).toBe(false);
    },
  );

  it('requires a REAL phone number, not just any text', () => {
    expect(leadSchema.safeParse({ ...validLead, phone: '12345' }).success).toBe(false);
    expect(leadSchema.safeParse({ ...validLead, phone: '+44 20 7946 0958' }).success).toBe(true);
  });

  it('no longer asks for a mailing address, route type, or end address', () => {
    const parsed = leadSchema.safeParse({ ...validLead, mailingAddress: '1 Main St', routeType: 'oneway', endAddress: 'x' });
    expect(parsed.success).toBe(true);
    // Unknown keys are stripped, so they can never reach Brevo
    expect(parsed.success && 'mailingAddress' in parsed.data).toBe(false);
    expect(parsed.success && 'routeType' in parsed.data).toBe(false);
  });

  it('takes one of the offered cleaning needs only', () => {
    for (const need of ['tree-beds', 'streets', 'needles', 'other']) {
      expect(leadSchema.safeParse({ ...validLead, cleaningNeed: need }).success).toBe(true);
    }
    expect(leadSchema.safeParse({ ...validLead, cleaningNeed: 'graffiti' }).success).toBe(false);
  });

  it('needs at least one offered kind of support, and accepts several', () => {
    expect(leadSchema.safeParse({ ...validLead, support: [] }).success).toBe(false);
    expect(leadSchema.safeParse({ ...validLead, support: undefined }).success).toBe(false);
    expect(leadSchema.safeParse({ ...validLead, support: ['money'] }).success).toBe(false);
    expect(
      leadSchema.safeParse({ ...validLead, support: ['supplies', 'promotion', 'facilitation', 'cleanup-group', 'other'] }).success,
    ).toBe(true);
  });

  it('treats the number of participants as optional, but a whole number when given', () => {
    expect(leadSchema.safeParse({ ...validLead, participants: '' }).success).toBe(true);
    expect(leadSchema.safeParse({ ...validLead, participants: '12' }).success).toBe(true);
    expect(leadSchema.safeParse({ ...validLead, participants: '0' }).success).toBe(false);
    expect(leadSchema.safeParse({ ...validLead, participants: '2.5' }).success).toBe(false);
    expect(leadSchema.safeParse({ ...validLead, participants: 'lots' }).success).toBe(false);
  });

  it('rejects a past or malformed preferred month', () => {
    expect(leadSchema.safeParse({ ...validLead, preferredMonth: 'January 2020' }).success).toBe(false);
    expect(leadSchema.safeParse({ ...validLead, preferredMonth: 'whenever' }).success).toBe(false);
  });

  it('rejects an unknown behalf', () => {
    expect(leadSchema.safeParse({ ...validLead, behalf: 'robot' }).success).toBe(false);
  });
});

describe('buildLeadNoteLines', () => {
  it('writes the choices out in plain English for the team', () => {
    const lines = buildLeadNoteLines(
      { behalf: 'organization', cleaningNeed: 'needles', support: ['supplies', 'cleanup-group'], participants: '8', preferredMonth: 'May 2027' },
      '708 WEST 171 STREET, New York, NY, USA',
    );
    expect(lines).toEqual([
      'Requesting on behalf of: organization',
      'Starting address: 708 WEST 171 STREET, New York, NY, USA',
      'What needs cleaning: Needles',
      'Support needed: Supplies, Starting a cleanup group afterwards',
      'Number of participants: 8',
      'Preferred month: May 2027',
    ]);
  });

  it('says when no group size was given', () => {
    const lines = buildLeadNoteLines(
      { behalf: 'individual', cleaningNeed: 'other', support: ['other'], participants: undefined, preferredMonth: 'May 2027' },
      'x',
    );
    expect(lines).toContain('Number of participants: not given');
  });
});
