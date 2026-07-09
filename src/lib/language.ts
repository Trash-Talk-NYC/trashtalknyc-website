export type Lang = 'en' | 'es';

declare global {
  interface Window {
    setLang: (lang: Lang) => void;
    getCurrentLang: () => Lang;
  }
}

const STORAGE_KEY = 'ttnyc-lang';

const callbacks = new Set<(lang: Lang) => void>();

let current: Lang = (
  (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY)) === 'es'
    ? 'es'
    : 'en'
) satisfies Lang;

export function getCurrentLang(): Lang {
  return current;
}

export function setLang(lang: Lang): void {
  current = lang;

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, lang);
  }

  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;

    document.querySelectorAll<HTMLElement>('[data-en]').forEach((el) => {
      const text = el.getAttribute(`data-${lang}`);
      if (!text) return;
      if (!el.children.length) el.textContent = text;
    });

    document.querySelectorAll<HTMLElement>('[data-placeholder-en]').forEach((el) => {
      const ph = el.getAttribute(`data-placeholder-${lang}`);
      if (ph !== null) (el as HTMLInputElement).placeholder = ph;
    });
  }

  callbacks.forEach((cb) => cb(lang));
}

export function onLanguageChange(cb: (lang: Lang) => void): () => void {
  callbacks.add(cb);
  return () => callbacks.delete(cb);
}

export function submitErrorText(lang: Lang): string {
  return lang === 'es' ? '¡Algo salió mal! Inténtalo de nuevo.' : 'Something went wrong — please try again.';
}
