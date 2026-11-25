import type { CompareOptions } from './types';

/** Normalize a single line for comparison purposes. */
export function normalizeLine(line: string, opts: Pick<CompareOptions, 'ignoreWhitespace' | 'ignoreCase'>): string {
  let s = line;
  if (opts.ignoreWhitespace) {
    s = s.replace(/\s+/g, ' ').trim();
  }
  if (opts.ignoreCase) {
    s = s.toLowerCase();
  }
  return s;
}

/** Normalize a whole document line-by-line (line count is preserved). */
export function normalizeText(text: string, opts: Pick<CompareOptions, 'ignoreWhitespace' | 'ignoreCase'>): string {
  return text
    .split('\n')
    .map((l) => normalizeLine(l, opts))
    .join('\n');
}

/** Parse a comma/space separated tag list like "script, style nav" into clean tag names. */
export function parseIgnoreTags(input: string): string[] {
  return input
    .split(/[\s,]+/)
    .map((t) => t.trim().toLowerCase().replace(/[<>/]/g, ''))
    .filter((t) => /^[a-z][a-z0-9-]*$/.test(t));
}

/** Escape text for safe insertion into HTML (used by exporters). */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Split a diff chunk value into lines (handles trailing newline). */
export function chunkToLines(value: string): string[] {
  if (value === '') return [];
  const parts = value.split('\n');
  // diffLines terminates chunks with \n; drop the trailing empty fragment.
  if (parts.length > 0 && parts[parts.length - 1] === '') parts.pop();
  return parts;
}
