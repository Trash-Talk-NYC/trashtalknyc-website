import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { attachCombobox, type ComboOption } from '../combobox';

const PICK = { en: 'Pick from the list.', es: 'Elige de la lista.' };
const EMPTY = { en: 'No match.', es: 'Sin coincidencias.' };

const OPTIONS: ComboOption[] = [
  { value: '708 WEST 171 STREET, New York, NY, USA', text: '708 WEST 171 STREET', detail: 'Manhattan 10032', id: 'nycpad:venue:337433' },
  { value: '710 WEST 171 STREET, New York, NY, USA', text: '710 WEST 171 STREET', id: 'nycpad:venue:337434' },
];

let input: HTMLInputElement;
let list: HTMLUListElement;

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = '<input id="addr" /><ul id="addr-list" hidden></ul>';
  input = document.getElementById('addr') as HTMLInputElement;
  list = document.getElementById('addr-list') as HTMLUListElement;
});

afterEach(() => {
  vi.useRealTimers();
});

async function type(text: string) {
  input.value = text;
  input.dispatchEvent(new Event('input'));
  await vi.advanceTimersByTimeAsync(300);
}

function key(k: string) {
  const e = new KeyboardEvent('keydown', { key: k, cancelable: true });
  input.dispatchEvent(e);
  return e;
}

describe('attachCombobox', () => {
  it('blocks free text until an option is picked', async () => {
    attachCombobox({ input, list, search: async () => OPTIONS, pickMessage: PICK, emptyMessage: EMPTY });
    await type('708 w');
    expect(input.validationMessage).toBe(PICK.en);
    expect(list.hidden).toBe(false);
    expect(input.getAttribute('aria-expanded')).toBe('true');
  });

  it('builds options as text, never parsing upstream values as HTML', async () => {
    const hostile = [{ value: '<img src=x onerror=alert(1)>', text: '<img src=x onerror=alert(1)>' }];
    attachCombobox({ input, list, search: async () => hostile, pickMessage: PICK, emptyMessage: EMPTY });
    await type('xx');
    expect(list.querySelector('img')).toBeNull();
    expect(list.textContent).toBe('<img src=x onerror=alert(1)>');
  });

  it('is fully operable from the keyboard', async () => {
    const onChange = vi.fn();
    attachCombobox({ input, list, search: async () => OPTIONS, pickMessage: PICK, emptyMessage: EMPTY, onChange });
    await type('7 w');

    expect(key('ArrowDown').defaultPrevented).toBe(true);
    const first = list.querySelectorAll('li')[0];
    expect(input.getAttribute('aria-activedescendant')).toBe(first.id);
    expect(first.getAttribute('aria-selected')).toBe('true');

    key('ArrowDown');
    key('ArrowDown');
    // Wraps back to the first option
    expect(input.getAttribute('aria-activedescendant')).toBe(first.id);
    key('ArrowUp');
    expect(input.getAttribute('aria-activedescendant')).toBe(list.querySelectorAll('li')[1].id);

    expect(key('Enter').defaultPrevented).toBe(true);
    expect(input.value).toBe(OPTIONS[1].value);
    expect(input.validationMessage).toBe('');
    expect(list.hidden).toBe(true);
    expect(input.hasAttribute('aria-activedescendant')).toBe(false);
    expect(onChange).toHaveBeenLastCalledWith(OPTIONS[1]);
  });

  it('lets Enter submit normally when no option is active', async () => {
    attachCombobox({ input, list, search: async () => OPTIONS, pickMessage: PICK, emptyMessage: EMPTY });
    await type('7 w');
    expect(key('Enter').defaultPrevented).toBe(false);
  });

  it('closes on Escape without picking', async () => {
    attachCombobox({ input, list, search: async () => OPTIONS, pickMessage: PICK, emptyMessage: EMPTY });
    await type('7 w');
    key('ArrowDown');
    expect(key('Escape').defaultPrevented).toBe(true);
    expect(list.hidden).toBe(true);
    expect(input.validationMessage).toBe(PICK.en);
  });

  it('picks with the mouse', async () => {
    attachCombobox({ input, list, search: async () => OPTIONS, pickMessage: PICK, emptyMessage: EMPTY });
    await type('7 w');
    list.querySelectorAll('li')[0].dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    expect(input.value).toBe(OPTIONS[0].value);
  });

  it('shows a bilingual non-selectable row when nothing matches', async () => {
    attachCombobox({ input, list, search: async () => [], pickMessage: PICK, emptyMessage: EMPTY });
    await type('zzz');
    const row = list.querySelector('li')!;
    expect(row.getAttribute('aria-disabled')).toBe('true');
    expect(row.dataset.en).toBe(EMPTY.en);
    expect(row.dataset.es).toBe(EMPTY.es);
    expect(key('ArrowDown').defaultPrevented).toBe(false);
  });

  it('hands search failures to onUnavailable so the page decides open vs closed', async () => {
    attachCombobox({
      input,
      list,
      search: async () => {
        throw new Error('http_503');
      },
      pickMessage: PICK,
      emptyMessage: EMPTY,
      onUnavailable: (picker) => picker.setInvalid(null),
    });
    await type('Hoboken');
    expect(input.validationMessage).toBe('');
    expect(list.hidden).toBe(true);
  });

  it('ignores a stale response that resolves after a newer query', async () => {
    let resolveFirst!: (o: ComboOption[]) => void;
    const search = vi
      .fn<(q: string) => Promise<ComboOption[]>>()
      .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r; }))
      .mockImplementationOnce(async () => [OPTIONS[1]]);
    attachCombobox({ input, list, search, pickMessage: PICK, emptyMessage: EMPTY });
    await type('70');
    await type('710');
    resolveFirst([OPTIONS[0]]);
    await vi.runAllTimersAsync();
    expect(list.querySelectorAll('li')).toHaveLength(1);
    expect(list.textContent).toContain('710');
  });

  it('reset clears text, pick, list and validity', async () => {
    const onChange = vi.fn();
    const picker = attachCombobox({ input, list, search: async () => OPTIONS, pickMessage: PICK, emptyMessage: EMPTY, onChange });
    await type('7 w');
    key('ArrowDown');
    key('Enter');
    picker.reset();
    expect(input.value).toBe('');
    expect(input.validationMessage).toBe('');
    expect(list.childElementCount).toBe(0);
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
