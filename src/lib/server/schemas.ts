// astro/zod is Astro's bundled zod, importable as a plain module (unlike
// the virtual `astro:schema`) so these schemas are unit-testable in vitest.
import { z } from 'astro/zod';

/**
 * Fields shared by both forms, matching the inputs rendered on the pages.
 * `botcheck` is the honeypot: real users never see it, so any value is a
 * bot. `startedAt` is a JS-set render timestamp for the timing heuristic;
 * absent for no-JS submissions, so it stays optional.
 */
const baseFields = {
  fname: z.string().trim().min(1, 'First name is required').max(200),
  lname: z.string().trim().min(1, 'Last name is required').max(200),
  email: z.string().trim().email('Please enter a valid email address').max(320),
  botcheck: z.string().optional(),
  startedAt: z.string().optional(),
};

export const BOROUGHS = ['Manhattan', 'Brooklyn', 'Queens', 'The Bronx', 'Staten Island'] as const;

// Checkboxes submit the string 'on' when checked and are omitted entirely
// from form data when unchecked, so a literal match both requires the box
// to be present and rejects any other value.
const waiverAccepted = z.literal('on', { errorMap: () => ({ message: 'You must accept the liability waiver to sign up' }) });

export const signupSchema = z.object({
  ...baseFields,
  borough: z.enum(BOROUGHS, { errorMap: () => ({ message: 'Please select a borough' }) }),
  phone: z.string().trim().max(50).optional(),
  experience: z.string().trim().max(2000).optional(),
  hear: z.string().trim().max(200).optional(),
  waiverCheck: waiverAccepted,
  ageCheck: waiverAccepted,
});

export const contactSchema = z
  .object({
    ...baseFields,
    inquiryType: z.enum(['general', 'partnership']),
    phone: z.string().trim().max(50).optional(),
    organization: z.string().trim().max(300).optional(),
    message: z.string().trim().min(1, 'Message is required').max(5000),
  })
  .refine((data) => data.inquiryType !== 'partnership' || !!data.organization?.trim(), {
    message: 'Organization name is required for partnership inquiries',
    path: ['organization'],
  });

export type SignupInput = z.infer<typeof signupSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
