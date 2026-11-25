import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from '../App';

/**
 * UI smoke tests without a testing-library dependency: render the real App in
 * jsdom, drive it through the sample workflow and assert on the DOM.
 */

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render() {
  act(() => root.render(<App />));
}

function byText(selector: string, text: RegExp | string): HTMLElement | undefined {
  return Array.from(container.querySelectorAll<HTMLElement>(selector)).find((el) =>
    typeof text === 'string' ? el.textContent?.includes(text) : text.test(el.textContent ?? ''),
  );
}

function click(el: Element | undefined | null) {
  if (!el) throw new Error('element to click not found');
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

describe('App UI', () => {
  it('renders the header, both input panels and the compare button', () => {
    render();
    expect(container.textContent).toContain('Website Diff');
    expect(container.querySelectorAll('textarea')).toHaveLength(2);
    expect(byText('button', 'Compare versions')).toBeTruthy();
    expect(byText('button', 'Load sample')).toBeTruthy();
    expect(container.textContent).toContain('Comparison settings');
    expect(container.textContent).toContain('DOMParser');
  });

  it('explains the empty state before comparing', () => {
    render();
    expect(container.textContent).toContain('No comparison yet');
  });

  it('warns when comparing two empty panels', () => {
    render();
    click(byText('button', 'Compare versions'));
    expect(container.textContent).toContain('Add content to the Original panel first.');
    expect(container.textContent).toContain('No comparison yet');
  });

  it('loads the HTML sample, compares it and shows the summary counts', () => {
    render();
    click(byText('button', 'Try it with a sample page'));
    const areas = container.querySelectorAll<HTMLTextAreaElement>('textarea');
    expect(areas[0].value).toContain('Acme Analytics');
    expect(areas[1].value).toContain('Real-Time Website Intelligence');

    click(byText('button', 'Compare versions'));

    expect(container.textContent).not.toContain('No comparison yet');
    expect(container.textContent).toContain('Added');
    expect(container.textContent).toContain('Removed');
    expect(container.textContent).toContain('Modified');
    expect(container.textContent).toContain('Unchanged lines');
    // HTML mode exposes the metadata tabs.
    expect(byText('button', 'HTML content')).toBeTruthy();
    expect(byText('button', 'Normalized HTML')).toBeTruthy();
  });

  it('switches to the side-by-side tab and renders diff rows with line numbers', () => {
    render();
    click(byText('button', 'Load sample'));
    click(byText('button', 'Compare versions'));
    click(byText('button', 'Side-by-side'));

    const rows = container.querySelectorAll('table tbody tr');
    expect(rows.length).toBeGreaterThan(3);
    expect(container.querySelector('table')?.textContent).toContain('Measure what matters on your website');
    expect(container.querySelectorAll('tr.diff-eq').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('tr.diff-mod').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('td.diff-gutter').length).toBeGreaterThan(0);
    // The sample sets panel labels from its file names.
    expect(container.textContent).toContain('sample-original.html');
    expect(container.textContent).toContain('sample-modified.html');
  });

  it('collapses long runs of unchanged lines and can expand them again', () => {
    render();
    const unchanged = Array.from({ length: 24 }, (_, i) => `stable line ${i + 1}`).join('\n');
    const areas = container.querySelectorAll<HTMLTextAreaElement>('textarea');
    act(() => {
      setNativeValue(areas[0], `${unchanged}\nold ending`);
      setNativeValue(areas[1], `${unchanged}\nnew ending`);
    });
    click(byText('button', 'Compare versions'));
    click(byText('button', 'Side-by-side'));

    expect(container.textContent).toContain('unchanged lines hidden');
    const collapsedRows = container.querySelectorAll('table tbody tr').length;

    const toggle = byText('label', 'Collapse unchanged lines')?.querySelector('input');
    act(() => toggle?.click());
    const expandedRows = container.querySelectorAll('table tbody tr').length;

    expect(expandedRows).toBeGreaterThan(collapsedRows);
    expect(container.textContent).not.toContain('unchanged lines hidden');
  });

  it('switches to the unified diff tab and renders a patch', () => {
    render();
    click(byText('button', 'Load sample'));
    click(byText('button', 'Compare versions'));
    click(byText('button', 'Unified diff'));

    expect(container.textContent).toContain('---');
    expect(container.textContent).toContain('+++');
    expect(container.textContent).toContain('@@');
  });

  it('shows extracted metadata changes in the HTML content tab', () => {
    render();
    click(byText('button', 'Load sample'));
    click(byText('button', 'Compare versions'));
    click(byText('button', 'HTML content'));

    expect(container.textContent).toContain('Metadata & selected fields');
    expect(container.textContent).toContain('Meta description');
    expect(container.textContent).toContain('Canonical URL');
    expect(container.textContent).toContain('Links');
    expect(container.textContent).toContain('Images');
    expect(container.textContent).toContain('/docs');
  });

  it('sanitizes imported HTML in the preview tab', () => {
    render();
    const hostile = '<h1>Preview</h1><script>window.__pwned = true</script><img src="/x.png" onerror="window.__pwned = true">';
    const areas = container.querySelectorAll<HTMLTextAreaElement>('textarea');
    act(() => {
      setNativeValue(areas[0], hostile);
      setNativeValue(areas[1], '<h1>Preview changed</h1>');
    });
    click(byText('button', 'Compare versions'));
    click(byText('button', 'Sanitized preview'));

    // No script element is ever inserted anywhere in the app.
    expect(container.querySelectorAll('script')).toHaveLength(0);

    // The sanitized render surface must not carry the event handler…
    const sanitized = container.querySelectorAll<HTMLElement>('[data-sanitized]');
    expect(sanitized.length).toBe(2);
    expect(sanitized[0].innerHTML).not.toContain('onerror');
    expect(sanitized[0].innerHTML).not.toContain('<script');
    expect(sanitized[0].querySelector('img')?.hasAttribute('onerror')).toBe(false);
    // …while the harmless parts still render.
    expect(sanitized[0].querySelector('h1')?.textContent).toBe('Preview');
    expect(sanitized[0].querySelector('img')?.getAttribute('src')).toBe('/x.png');

    // The raw source pane shows it escaped as text, never as markup.
    const raw = container.querySelectorAll('pre');
    expect(raw[0].textContent).toContain('onerror=');
    expect(raw[0].querySelector('img')).toBeNull();

    expect((window as unknown as Record<string, unknown>).__pwned).toBeUndefined();
    expect(container.textContent).toContain('Previews are sanitized with DOMPurify');
  });

  it('toggles the dark theme and remembers it', () => {
    render();
    const toggle = byText('button', /Toggle theme/i) ?? container.querySelector('button[aria-label="Toggle theme"]');
    click(toggle);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('website-diff-theme')).toBe('dark');
    click(toggle);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('website-diff-theme')).toBe('light');
  });

  it('swaps the two panels', () => {
    render();
    const areas = container.querySelectorAll<HTMLTextAreaElement>('textarea');
    act(() => {
      setNativeValue(areas[0], 'first version');
      setNativeValue(areas[1], 'second version');
    });
    click(container.querySelector('button[title="Swap Original ↔ Modified"]'));
    const after = container.querySelectorAll<HTMLTextAreaElement>('textarea');
    expect(after[0].value).toBe('second version');
    expect(after[1].value).toBe('first version');
  });

  it('applies comparison options and recomputes', () => {
    render();
    const areas = container.querySelectorAll<HTMLTextAreaElement>('textarea');
    act(() => {
      setNativeValue(areas[0], 'Hello   World');
      setNativeValue(areas[1], 'hello world');
    });
    click(byText('button', 'Compare versions'));
    click(byText('button', 'Side-by-side'));
    expect(container.querySelectorAll('tr.diff-mod').length).toBe(1);

    // Ignore whitespace + ignore case → the same line, nothing changed.
    const ws = byText('label', 'Ignore whitespace')?.querySelector('input');
    const cs = byText('label', 'Ignore case')?.querySelector('input');
    act(() => {
      ws?.click();
      cs?.click();
    });
    click(byText('button', 'Compare versions'));
    click(byText('button', 'Side-by-side'));

    expect(container.querySelectorAll('tr.diff-mod, tr.diff-add, tr.diff-del')).toHaveLength(0);
    expect(container.querySelectorAll('tr.diff-eq').length).toBeGreaterThan(0);
    // Persistent stat chips reflect the recomputed result.
    expect(container.textContent).toContain('+0 added');
    expect(container.textContent).toContain('−0 removed');
    expect(container.textContent).toContain('~0 modified');
    expect(container.textContent).toContain('0% changed');

    click(byText('button', 'Summary'));
    expect(container.textContent).toContain('Unchanged lines');
  });
});

/** React-controlled inputs need a native value setter + input event. */
function setNativeValue(el: HTMLTextAreaElement | HTMLInputElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}
