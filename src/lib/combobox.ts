import { getCurrentLang, onLanguageChange, type Lang } from './language';

/**
 * Pick-from-a-list combobox shared by the Lead a Cleanup address picker
 * and the newsletter's outside-NYC city picker: free text never
 * satisfies the field, so the picker must be fully operable from the
 * keyboard (ArrowUp/ArrowDown/Enter/Escape with aria-activedescendant,
 * per the WAI-ARIA combobox pattern) or keyboard and screen-reader users
 * could never submit the form.
 */

export type BilingualText = Record<Lang, string>;

export type ComboOption = {
  /** Text written into the input when picked. */
  value: string;
  /** Primary line shown in the list. */
  text: string;
  /** Secondary line shown under the primary one. */
  detail?: string;
  /** Opaque identifier of the picked thing (e.g. a GeoSearch gid). */
  id?: string;
};

export type ComboboxConfig = {
  input: HTMLInputElement;
  list: HTMLUListElement;
  /** Resolves the options for a query; throwing means the service is unavailable. */
  search: (query: string, lang: Lang) => Promise<ComboOption[]>;
  /** Validity message while the typed text is not a picked option. */
  pickMessage: BilingualText;
  /** Shown as a non-selectable list row when a search returns nothing. */
  emptyMessage: BilingualText;
  /** Called with the picked option, or null when the pick is cleared. */
  onChange?: (option: ComboOption | null) => void;
  /** Called when a search for the current text fails (network error or non-ok response). */
  onUnavailable?: (combo: Combobox) => void;
};

export type Combobox = {
  /** Clears the text, the pick, the list, and any validity message. */
  reset: () => void;
  /** Sets (or clears, with null) a bilingual validity message that follows the language toggle. */
  setInvalid: (message: BilingualText | null) => void;
};

const MIN_QUERY = 2;
const DEBOUNCE_MS = 250;

export function attachCombobox(config: ComboboxConfig): Combobox {
  const { input, list, search, pickMessage, emptyMessage, onChange, onUnavailable } = config;
  if (!list.id) list.id = `${input.id}-list`;
  input.setAttribute('aria-controls', list.id);

  let options: ComboOption[] = [];
  let active = -1;
  let seq = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let invalid: BilingualText | null = null;

  function setInvalid(message: BilingualText | null) {
    invalid = message;
    input.setCustomValidity(message ? message[getCurrentLang()] : '');
  }

  onLanguageChange((lang) => {
    if (invalid) input.setCustomValidity(invalid[lang]);
  });

  const optionEls = () => Array.from(list.querySelectorAll<HTMLLIElement>('li[role="option"]'));

  function setActive(index: number) {
    active = index;
    optionEls().forEach((li, i) => li.setAttribute('aria-selected', String(i === index)));
    const el = optionEls()[index];
    if (el) {
      input.setAttribute('aria-activedescendant', el.id);
      el.scrollIntoView?.({ block: 'nearest' });
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  }

  function open() {
    if (list.childElementCount === 0) return;
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  function close() {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    setActive(-1);
  }

  function clearList() {
    options = [];
    list.replaceChildren();
    close();
  }

  function render(found: ComboOption[]) {
    options = found;
    const items = found.map((opt, i) => {
      const li = document.createElement('li');
      li.id = `${list.id}-opt-${i}`;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', 'false');
      li.dataset.index = String(i);
      li.textContent = opt.text;
      if (opt.detail) {
        const small = document.createElement('small');
        small.textContent = opt.detail;
        li.append(small);
      }
      return li;
    });
    if (items.length === 0) {
      const none = document.createElement('li');
      none.setAttribute('aria-disabled', 'true');
      none.dataset.en = emptyMessage.en;
      none.dataset.es = emptyMessage.es;
      none.textContent = emptyMessage[getCurrentLang()];
      items.push(none);
    }
    list.replaceChildren(...items);
    setActive(-1);
    open();
  }

  function pick(index: number) {
    const opt = options[index];
    if (!opt) return;
    input.value = opt.value;
    setInvalid(null);
    close();
    onChange?.(opt);
  }

  async function run(query: string) {
    const mySeq = ++seq;
    try {
      const found = await search(query, getCurrentLang());
      if (mySeq !== seq) return;
      render(found);
    } catch {
      if (mySeq !== seq) return;
      clearList();
      onUnavailable?.(combo);
    }
  }

  input.addEventListener('input', () => {
    onChange?.(null);
    const q = input.value.trim();
    setInvalid(q ? pickMessage : null);
    clearTimeout(timer);
    if (q.length < MIN_QUERY) {
      seq++;
      clearList();
      return;
    }
    timer = setTimeout(() => void run(q), DEBOUNCE_MS);
  });

  input.addEventListener('keydown', (e) => {
    const count = options.length;
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        if (count === 0) return;
        e.preventDefault();
        if (list.hidden) open();
        const step = e.key === 'ArrowDown' ? 1 : -1;
        const from = active === -1 ? (step === 1 ? -1 : count) : active;
        setActive((from + step + count) % count);
        break;
      }
      case 'Enter':
        if (list.hidden || active === -1) return;
        e.preventDefault();
        pick(active);
        break;
      case 'Escape':
        if (list.hidden) return;
        e.preventDefault();
        close();
        break;
    }
  });

  list.addEventListener('mousedown', (e) => {
    const li = (e.target as HTMLElement).closest<HTMLLIElement>('li[role="option"]');
    if (!li) return;
    e.preventDefault();
    pick(Number(li.dataset.index));
  });

  input.addEventListener('blur', () => setTimeout(close, 120));

  const combo: Combobox = {
    reset() {
      clearTimeout(timer);
      seq++;
      input.value = '';
      setInvalid(null);
      clearList();
      onChange?.(null);
    },
    setInvalid,
  };
  return combo;
}

/** Fetches JSON, treating a non-ok HTTP status like a network failure. */
export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`http_${res.status}`);
  return (await res.json()) as T;
}
