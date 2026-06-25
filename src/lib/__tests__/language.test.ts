import { beforeEach, describe, expect, it, vi } from 'vitest';

// Re-import the module fresh for each test to reset module-level state.
// Using vi.resetModules() + dynamic import pattern.
let getCurrentLang: () => import('../language').Lang;
let setLang: (lang: import('../language').Lang) => void;
let onLanguageChange: (cb: (lang: import('../language').Lang) => void) => () => void;

beforeEach(async () => {
  // Reset DOM and localStorage before each test
  document.documentElement.lang = '';
  localStorage.clear();
  document.body.innerHTML = '';

  vi.resetModules();
  const mod = await import('../language');
  getCurrentLang = mod.getCurrentLang;
  setLang = mod.setLang;
  onLanguageChange = mod.onLanguageChange;
});

describe('getCurrentLang', () => {
  it('returns en by default when no saved language exists', () => {
    expect(getCurrentLang()).toBe('en');
  });
});

describe('setLang', () => {
  it('updates getCurrentLang to the new value', () => {
    setLang('es');
    expect(getCurrentLang()).toBe('es');
  });

  it('writes the new language to localStorage', () => {
    setLang('es');
    expect(localStorage.getItem('ttnyc-lang')).toBe('es');
  });

  it('updates document.documentElement.lang', () => {
    setLang('es');
    expect(document.documentElement.lang).toBe('es');
  });

  it('swaps data-en/data-es text on DOM elements', () => {
    document.body.innerHTML = '<span data-en="Hello" data-es="Hola">Hello</span>';
    setLang('es');
    expect(document.body.querySelector('span')!.textContent).toBe('Hola');
  });

  it('restores data-en text when switching back to en', () => {
    document.body.innerHTML = '<span data-en="Hello" data-es="Hola">Hola</span>';
    setLang('en');
    expect(document.body.querySelector('span')!.textContent).toBe('Hello');
  });

  it('does not overwrite text on elements that have child elements', () => {
    document.body.innerHTML = '<button data-en="Join" data-es="Únete"><svg></svg>Join</button>';
    setLang('es');
    // Has child elements, so textContent should not be replaced
    expect(document.body.querySelector('button')!.textContent).not.toBe('Únete');
  });
});

describe('onLanguageChange', () => {
  it('invokes the callback with the new lang when setLang is called', () => {
    const cb = vi.fn();
    onLanguageChange(cb);
    setLang('es');
    expect(cb).toHaveBeenCalledWith('es');
  });

  it('cleanup function stops the callback from being called', () => {
    const cb = vi.fn();
    const cleanup = onLanguageChange(cb);
    cleanup();
    setLang('es');
    expect(cb).not.toHaveBeenCalled();
  });

  it('does not call a removed callback when other callbacks still exist', () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    const cleanup1 = onLanguageChange(cb1);
    onLanguageChange(cb2);
    cleanup1();
    setLang('es');
    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).toHaveBeenCalledWith('es');
  });
});

describe('localStorage persistence', () => {
  it('reads saved language from localStorage on first getCurrentLang call', async () => {
    localStorage.setItem('ttnyc-lang', 'es');
    vi.resetModules();
    const mod = await import('../language');
    expect(mod.getCurrentLang()).toBe('es');
  });
});
