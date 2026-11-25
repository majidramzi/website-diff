import { describe, expect, it } from 'vitest';
import { computeTextDiff } from '../lib/diff';
import { normalizeLine, normalizeText, parseIgnoreTags, chunkToLines, escapeHtml } from '../lib/normalize';
import { DEFAULT_OPTIONS, type CompareOptions } from '../lib/types';

const base: CompareOptions = { ...DEFAULT_OPTIONS, ignoreTags: [] };

describe('computeTextDiff — added and removed text', () => {
  it('detects added lines', () => {
    const r = computeTextDiff('alpha\nbeta', 'alpha\nbeta\ngamma', base);
    expect(r.added).toBe(1);
    expect(r.removed).toBe(0);
    expect(r.modified).toBe(0);
    expect(r.rows.at(-1)).toMatchObject({ type: 'added', right: 'gamma' });
  });

  it('detects removed lines', () => {
    const r = computeTextDiff('alpha\nbeta\ngamma', 'alpha\ngamma', base);
    expect(r.removed).toBe(1);
    expect(r.rows.find((row) => row.type === 'removed')?.left).toBe('beta');
  });

  it('keeps equal lines with correct 1-based line numbers', () => {
    const r = computeTextDiff('one\ntwo\nthree', 'one\ntwo\nthree', base);
    expect(r.added + r.removed + r.modified).toBe(0);
    expect(r.rows[2]).toMatchObject({ type: 'equal', leftLine: 3, rightLine: 3 });
  });

  it('reports 0% change for identical content and 100% for fully replaced content', () => {
    expect(computeTextDiff('same', 'same', base).changePercent).toBe(0);
    expect(computeTextDiff('aaa', 'bbb', base).changePercent).toBe(100);
  });
});

describe('computeTextDiff — modified lines', () => {
  it('pairs a removed line with an added line at the same position as "modified"', () => {
    const r = computeTextDiff('Plans start at $19 per month.', 'Plans start at $29 per month.', base);
    expect(r.modified).toBe(1);
    expect(r.added).toBe(0);
    expect(r.removed).toBe(0);
    expect(r.rows[0]).toMatchObject({ type: 'modified', left: 'Plans start at $19 per month.', right: 'Plans start at $29 per month.' });
  });

  it('handles several modified lines interleaved with equal lines', () => {
    const a = 'h1\nh2\nh3\nh4';
    const b = 'h1\nH2\nh3\nH4';
    const r = computeTextDiff(a, b, base);
    expect(r.modified).toBe(2);
    expect(r.rows.filter((row) => row.type === 'equal')).toHaveLength(2);
  });

  it('produces a unified diff with + and - markers', () => {
    const r = computeTextDiff('line one\nline two', 'line one\nline 2', base);
    expect(r.unified).toContain('---');
    expect(r.unified).toContain('+++');
    expect(r.unified).toContain('-line two');
    expect(r.unified).toContain('+line 2');
  });
});

describe('whitespace and case normalization', () => {
  it('treats differing whitespace as equal when ignoreWhitespace is on', () => {
    const r = computeTextDiff('hello   world', 'hello world', { ...base, ignoreWhitespace: true });
    expect(r.added + r.removed + r.modified).toBe(0);
  });

  it('reports a change when ignoreWhitespace is off', () => {
    const r = computeTextDiff('hello   world', 'hello world', base);
    expect(r.modified).toBe(1);
  });

  it('treats differing case as equal when ignoreCase is on', () => {
    const r = computeTextDiff('Hello World', 'hello world', { ...base, ignoreCase: true });
    expect(r.added + r.removed + r.modified).toBe(0);
  });

  it('normalizes each line independently so line indexes stay aligned', () => {
    const out = normalizeText('  A   B  \n\n\tC\n', { ignoreWhitespace: true, ignoreCase: true });
    expect(out.split('\n')).toHaveLength(4);
    expect(out.split('\n')[0]).toBe('a b');
  });

  it('normalizeLine trims and collapses runs of whitespace', () => {
    expect(normalizeLine('  foo\t\tbar ', { ignoreWhitespace: true, ignoreCase: false })).toBe('foo bar');
    expect(normalizeLine('  foo\t\tbar ', { ignoreWhitespace: false, ignoreCase: false })).toBe('  foo\t\tbar ');
  });
});

describe('normalize helpers', () => {
  it('parseIgnoreTags splits on commas and whitespace and drops invalid entries', () => {
    expect(parseIgnoreTags('script, style nav, <footer>, 1bad, ok-tag')).toEqual(['script', 'style', 'nav', 'footer', 'ok-tag']);
  });

  it('chunkToLines strips the trailing empty fragment', () => {
    expect(chunkToLines('a\nb\n')).toEqual(['a', 'b']);
    expect(chunkToLines('')).toEqual([]);
  });

  it('escapeHtml escapes all markup-sensitive characters', () => {
    expect(escapeHtml(`<a href="x">&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
  });
});
