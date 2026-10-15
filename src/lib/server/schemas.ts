// astro/zod is Astro's bundled zod, importable as a plain module (unlike
// the virtual `astro:schema`) so these schemas are unit-testable in vitest.
import { z } from 'astro/zod';
import { isValidPhone } from '../phone';
import { COUNTRY_VALUES, US_COUNTRY } from '../countries';
import { US_ZIP_PATTERN } from '../zip';
import { isValidPreferredMonth } from '../months';
import { BEHALF_VALUES, CLEANING_NEED_VALUES, PARTNERSHIP_TYPE_VALUES, SUPPORT_NEED_VALUES } from '../leadOptions';

/**
 * Fields shared by the site forms, matching the inputs rendered on the
 * pages. `botcheck` is the honeypot: real users never see it, so any
 * value is a bot. `startedAt` is a JS-set render timestamp for the
 * timing heuristic; absent for no-JS submissions, so it stays optional.
 */
const baseFields = {
  fname: z.string().trim().min(1, 'First name is required').max(200),
  lname: z.string().trim().min(1, 'Last name is required').max(200),
  email: z.string().trim().email('Please enter a valid email address').max(320),
  botcheck: z.string().optional(),
  startedAt: z.string().optional(),
  // Injected as a hidden input by the Cloudflare Turnstile widget. Optional
  // so parsing still succeeds while Turnstile is unprovisioned — enforcement
  // lives in the action (requireTurnstile), not the schema. 2048 is the
  // documented max token length.
  'cf-turnstile-response': z.string().max(2048).optional(),
};

/** Optional phone: empty is fine, anything typed must be a real number
    (10-digit US, or + and a country code — see src/lib/phone.ts).
    `.optional()` stays OUTERMOST: Astro's form parsing unwraps a
    top-level ZodOptional to map an absent field to undefined, but a
    `.refine()` around the optional hides it and the field arrives as
    null, failing every submission without a phone. */
const optionalPhone = z
  .string()
  .trim()
  .max(50)
  .refine((v) => !v || isValidPhone(v), 'Please enter a valid phone number')
  .optional();

const requiredPhone = z
  .string()
  .trim()
  .min(1, 'Phone number is required')
  .max(50)
  .refine((v) => isValidPhone(v), 'Please enter a valid phone number');

// Checkboxes submit the string 'on' when checked and are omitted entirely
// from form data when unchecked, so a literal match both requires the box
// to be present and rejects any other value.
const waiverAccepted = z.literal('on', { errorMap: () => ({ message: 'You must accept the liability waiver to sign up' }) });

export const signupSchema = z
  .object({
    ...baseFields,
    // Location, country first (captain, 2026-10-09). US: just the ZIP —
    // city, state, and (for NYC ZIPs) the borough are derived from it in
    // the action. Elsewhere: a picked city plus optional region and a
    // postal code in whatever format that country uses.
    country: z.string().trim().max(100),
    zip: z.string().trim().max(10).optional(),
    city: z.string().trim().max(160).optional(),
    region: z.string().trim().max(120).optional(),
    postal: z.string().trim().max(20).optional(),
    phone: optionalPhone,
    experience: z.string().trim().max(2000).optional(),
    hear: z.string().trim().min(1, 'Please tell us how you heard about us').max(200),
    // Free-text "where was that?" companion to the "Somewhere else" choice
    hearOther: z.string().trim().max(200).optional(),
    waiverCheck: waiverAccepted,
    ageCheck: waiverAccepted,
    // Optional photo/video consent: 'on' when checked, absent otherwise
    photoConsent: z.literal('on').optional(),
  })
  .superRefine((data, ctx) => {
    if (!COUNTRY_VALUES.includes(data.country)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['country'], message: 'Please select a country' });
      return;
    }
    if (data.country === US_COUNTRY) {
      if (!US_ZIP_PATTERN.test(data.zip ?? '')) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['zip'], message: 'Enter a 5-digit ZIP code' });
      }
    } else if (!data.city) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['city'], message: 'Please pick your city' });
    }
  });

export const contactSchema = z
  .object({
    ...baseFields,
    inquiryType: z.enum(['general', 'partnership', 'sponsor']),
    // The Partner tile's "What kind of partnership?" (captain, 2026-10-15)
    partnershipType: z.enum(PARTNERSHIP_TYPE_VALUES).optional(),
    phone: optionalPhone,
    organization: z.string().trim().max(300).optional(),
    message: z.string().trim().min(1, 'Message is required').max(5000),
  })
  // Both org-backed tabs (Partner and Sponsor) write in on behalf of an
  // organization, so the org name is required for either.
  .refine((data) => data.inquiryType === 'general' || !!data.organization?.trim(), {
    message: 'Organization name is required for partnership and sponsorship inquiries',
    path: ['organization'],
  })
  // The partnership kind picks the inbox, so a partner inquiry needs one
  .refine((data) => data.inquiryType !== 'partnership' || !!data.partnershipType, {
    message: 'Please choose what kind of partnership',
    path: ['partnershipType'],
  });

/**
 * Lead a Cleanup support request (the first contact tile). The starting
 * address is re-verified against NYC GeoSearch in the action; photo
 * content validation and re-encoding live in src/lib/server/photos.ts —
 * this schema only checks shape (the File array and count land here,
 * sizes and magic bytes in the handler). Route type, the end address,
 * and the mailing address were dropped on team feedback (2026-10-15);
 * the choice lists live in src/lib/leadOptions.ts.
 */
export const leadSchema = z
  .object({
    ...baseFields,
    // Check all that apply (captain, 2026-10-15), at least one
    behalf: z
      .array(z.enum(BEHALF_VALUES))
      .min(1, 'Please choose who the request is on behalf of')
      .max(BEHALF_VALUES.length),
    // What "Other" means, when they checked it
    behalfOther: z.string().trim().max(200).optional(),
    phone: requiredPhone,
    startAddress: z.string().trim().min(1, 'Starting address is required').max(300),
    startAddressId: z.string().trim().min(1, 'Pick a starting address from the list').max(120),
    startAddressPoint: z.string().trim().min(1, 'Pick a starting address from the list').max(60),
    cleaningNeed: z.enum(CLEANING_NEED_VALUES, { errorMap: () => ({ message: 'Please choose what needs cleaning' }) }),
    support: z
      .array(z.enum(SUPPORT_NEED_VALUES))
      .min(1, 'Please choose at least one kind of support')
      .max(SUPPORT_NEED_VALUES.length),
    // Optional, so empty is fine; anything typed must be a whole number of
    // people. `.optional()` stays outermost (see optionalPhone).
    participants: z
      .string()
      .trim()
      .refine((v) => !v || (/^\d{1,5}$/.test(v) && Number(v) >= 1), 'Please enter a number of participants')
      .optional(),
    preferredMonth: z
      .string()
      .trim()
      .refine((v) => isValidPreferredMonth(v), 'Please choose an upcoming month'),
    photos: z.array(z.instanceof(File)).optional(),
  })
  .refine((data) => !data.behalf.includes('other') || !!data.behalfOther?.trim(), {
    message: 'Please tell us who the request is on behalf of',
    path: ['behalfOther'],
  });

export type SignupInput = z.infer<typeof signupSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type LeadInput = z.infer<typeof leadSchema>;
