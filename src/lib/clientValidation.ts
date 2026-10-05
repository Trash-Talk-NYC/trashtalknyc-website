import { AsYouType } from 'libphonenumber-js';
import { isValidPhone, PHONE_ERROR } from './phone';
import { getCurrentLang } from './language';

/**
 * Client-side email/phone checks shared by every form: shown when the
 * person leaves the field and re-checked as they fix it. Phones: a
 * 10-digit US number formats itself as they type; anyone else types +
 * and their country code. The server repeats both checks (zod email +
 * libphonenumber-js in src/lib/server/schemas.ts) — this layer only
 * catches mistakes before a round-trip.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

const EMAIL_ERROR = {
  en: 'Enter a valid email, like name@example.com.',
  es: 'Escribe un correo válido, como nombre@ejemplo.com.',
};

const EMAIL_REQUIRED = {
  en: 'Email is required.',
  es: 'El correo es obligatorio.',
};

const PHONE_REQUIRED = {
  en: 'Phone number is required.',
  es: 'El teléfono es obligatorio.',
};

const PHONE_PLACEHOLDER = '(212) 555-0100 or +44 20 7946 0958';

/** Shows (or clears) the inline error under a field. */
export function setFieldError(input: HTMLInputElement, text: string): void {
  let msg = input.parentElement?.querySelector<HTMLParagraphElement>('.f-err') ?? null;
  if (!msg && input.parentElement) {
    msg = document.createElement('p');
    msg.className = 'f-err';
    msg.setAttribute('aria-live', 'polite');
    input.after(msg);
  }
  if (msg) {
    msg.textContent = text;
    msg.hidden = !text;
  }
  input.setAttribute('aria-invalid', text ? 'true' : 'false');
  input.setCustomValidity(text);
}

function checkEmail(input: HTMLInputElement): void {
  const lang = getCurrentLang();
  const value = input.value.trim();
  if (!value) {
    setFieldError(input, input.required ? EMAIL_REQUIRED[lang] : '');
    return;
  }
  setFieldError(input, EMAIL_PATTERN.test(value) ? '' : EMAIL_ERROR[lang]);
}

function checkPhone(input: HTMLInputElement): void {
  const lang = getCurrentLang();
  const value = input.value.trim();
  if (!value) {
    setFieldError(input, input.required ? PHONE_REQUIRED[lang] : '');
    return;
  }
  setFieldError(input, isValidPhone(value) ? '' : PHONE_ERROR[lang]);
}

function formatPhoneInput(input: HTMLInputElement): void {
  const value = input.value;
  if (value.trim().startsWith('+')) {
    // International: keep + and digits/spaces as typed
    input.value = '+' + value.replace(/[^\d ]/g, '').replace(/^ +/, '');
    return;
  }
  let digits = value.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  digits = digits.slice(0, 10);
  input.value = digits ? new AsYouType('US').input(digits) : '';
}

/**
 * Wires every email and tel input under `scope`. Call once per page
 * after the DOM exists.
 */
export function attachFieldValidation(scope: ParentNode = document): void {
  scope.querySelectorAll<HTMLInputElement>('input[type=email]').forEach((input) => {
    input.addEventListener('blur', () => checkEmail(input));
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') checkEmail(input);
    });
  });

  scope.querySelectorAll<HTMLInputElement>('input[type=tel]').forEach((input) => {
    if (!input.placeholder) input.placeholder = PHONE_PLACEHOLDER;
    input.addEventListener('input', () => {
      formatPhoneInput(input);
      if (input.getAttribute('aria-invalid') === 'true') checkPhone(input);
    });
    input.addEventListener('blur', () => checkPhone(input));
  });
}
