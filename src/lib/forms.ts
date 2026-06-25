export type ValidationResult =
  | { valid: true }
  | { valid: false; errors: Record<string, string> };

export interface SignupFormData {
  fname: string;
  lname: string;
  email: string;
  borough: string;
  phone?: string;
  experience?: string;
  hear?: string;
}

export interface ContactFormData {
  fname: string;
  lname: string;
  email: string;
  message: string;
  organization?: string;
  formType?: 'general' | 'partnership';
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateSignupForm(data: SignupFormData): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.fname?.trim()) errors.fname = 'First name is required';
  if (!data.lname?.trim()) errors.lname = 'Last name is required';

  if (!data.email?.trim()) {
    errors.email = 'Email address is required';
  } else if (!isValidEmail(data.email.trim())) {
    errors.email = 'Please enter a valid email address';
  }

  if (!data.borough?.trim()) errors.borough = 'Please select a borough';

  return Object.keys(errors).length > 0 ? { valid: false, errors } : { valid: true };
}

export function validateContactForm(data: ContactFormData): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.fname?.trim()) errors.fname = 'First name is required';
  if (!data.lname?.trim()) errors.lname = 'Last name is required';

  if (!data.email?.trim()) {
    errors.email = 'Email address is required';
  } else if (!isValidEmail(data.email.trim())) {
    errors.email = 'Please enter a valid email address';
  }

  if (!data.message?.trim()) errors.message = 'Message is required';

  if (data.formType === 'partnership' && !data.organization?.trim()) {
    errors.organization = 'Organization name is required for partnership inquiries';
  }

  return Object.keys(errors).length > 0 ? { valid: false, errors } : { valid: true };
}
