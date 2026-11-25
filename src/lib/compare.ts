import type { CompareMode, CompareOptions, CompareResult } from './types';
import { computeTextDiff } from './diff';
import { compareHtml, looksLikeHtml } from './html';

/**
 * Top-level comparison. `mode` may be 'auto' (detect from content), 'text',
 * or 'html'. HTML mode falls back to plain-text diff when parsing yields no
 * meaningful structure (e.g. plain text pasted into HTML mode).
 */
export function compareContents(
  a: string,
  b: string,
  opts: CompareOptions,
  mode: 'auto' | CompareMode,
): CompareResult {
  const resolved: CompareMode =
    mode === 'auto' ? (looksLikeHtml(a) || looksLikeHtml(b) ? 'html' : 'text') : mode;

  if (resolved === 'html') {
    const htmlDiff = compareHtml(a, b, opts);
    const hasStructure =
      htmlDiff.extractA.title !== '' ||
      htmlDiff.extractB.title !== '' ||
      htmlDiff.extractA.headings.length > 0 ||
      htmlDiff.extractB.headings.length > 0 ||
      htmlDiff.extractA.paragraphs.length > 0 ||
      htmlDiff.extractB.paragraphs.length > 0 ||
      htmlDiff.extractA.links.length > 0 ||
      htmlDiff.extractB.links.length > 0;
    if (hasStructure) {
      return {
        mode: 'html',
        textDiff: htmlDiff.textDiff,
        htmlDiff,
        added: htmlDiff.added,
        removed: htmlDiff.removed,
        modified: htmlDiff.modified,
        changePercent: htmlDiff.changePercent,
        generatedAt: new Date().toISOString(),
      };
    }
    // No HTML structure found — fall through to text comparison.
  }

  const textDiff = computeTextDiff(a, b, opts);
  return {
    mode: 'text',
    textDiff,
    htmlDiff: null,
    added: textDiff.added,
    removed: textDiff.removed,
    modified: textDiff.modified,
    changePercent: textDiff.changePercent,
    generatedAt: new Date().toISOString(),
  };
}
