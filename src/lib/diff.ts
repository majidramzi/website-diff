import { createTwoFilesPatch, diffArrays } from 'diff';
import type { CompareOptions, LineDiffRow, TextDiffResult } from './types';
import { normalizeText } from './normalize';

/** Minimum word-overlap ratio for two lines to be considered "the same line, edited". */
const SIMILARITY_THRESHOLD = 0.34;

/** Word multiset of a line, case- and whitespace-insensitive (used only for pairing). */
function wordSet(line: string): Map<string, number> {
  const map = new Map<string, number>();
  for (const w of line.toLowerCase().split(/[^a-z0-9_$#@€£./:-]+/i)) {
    if (!w) continue;
    map.set(w, (map.get(w) ?? 0) + 1);
  }
  return map;
}

/** Ratio of shared words between two lines: 0 (nothing in common) … 1 (identical words). */
export function lineSimilarity(a: string, b: string): number {
  const wa = wordSet(a);
  const wb = wordSet(b);
  let na = 0;
  let nb = 0;
  for (const v of wa.values()) na += v;
  for (const v of wb.values()) nb += v;
  if (na === 0 && nb === 0) return 1;
  if (na === 0 || nb === 0) return 0;
  let shared = 0;
  for (const [word, count] of wa) {
    const other = wb.get(word);
    if (other) shared += Math.min(count, other);
  }
  return shared / Math.max(na, nb);
}

/**
 * Pair removed lines with added lines inside one changed block.
 * Matching is greedy, monotonic (no crossing pairs) and requires a minimum
 * word overlap, so genuinely new content is reported as "added" and deleted
 * content as "removed" instead of being forced into a "modified" pair.
 */
function pairBlock(lefts: string[], rights: string[]): Map<number, number> {
  const matches = new Map<number, number>();
  if (lefts.length === 0 || rights.length === 0) return matches;

  const setsL = lefts.map(wordSet);
  const setsR = rights.map(wordSet);
  const score = (li: number, ri: number): number => {
    const wa = setsL[li];
    const wb = setsR[ri];
    let na = 0;
    let nb = 0;
    for (const v of wa.values()) na += v;
    for (const v of wb.values()) nb += v;
    if (na === 0 && nb === 0) return 1;
    if (na === 0 || nb === 0) return 0;
    let shared = 0;
    for (const [word, count] of wa) {
      const other = wb.get(word);
      if (other) shared += Math.min(count, other);
    }
    return shared / Math.max(na, nb);
  };

  const huge = lefts.length * rights.length > 40_000;
  let lastRight = -1;

  for (let li = 0; li < lefts.length; li++) {
    if (huge) {
      // Positional fallback keeps very large blocks fast.
      if (li < rights.length && score(li, li) >= SIMILARITY_THRESHOLD && li > lastRight) {
        matches.set(li, li);
        lastRight = li;
      }
      continue;
    }
    let best = -1;
    let bestScore = SIMILARITY_THRESHOLD;
    for (let ri = lastRight + 1; ri < rights.length; ri++) {
      const s = score(li, ri);
      if (s > bestScore) {
        bestScore = s;
        best = ri;
      }
    }
    if (best >= 0) {
      matches.set(li, best);
      lastRight = best;
    }
  }
  return matches;
}

/** Turn one changed block (removed lines + added lines) into aligned rows. */
function emitBlock(
  lefts: string[],
  rights: string[],
  leftStart: number,
  rightStart: number,
  rows: LineDiffRow[],
): void {
  const matches = pairBlock(lefts, rights);
  const matchOfRight = new Map<number, number>();
  for (const [li, ri] of matches) matchOfRight.set(ri, li);

  let li = 0;
  let ri = 0;
  while (li < lefts.length || ri < rights.length) {
    if (li < lefts.length && ri < rights.length) {
      const partner = matches.get(li);
      if (partner === ri) {
        rows.push({ type: 'modified', left: lefts[li], right: rights[ri], leftLine: leftStart + li, rightLine: rightStart + ri });
        li++;
        ri++;
        continue;
      }
      if (partner === undefined && matchOfRight.get(ri) === undefined) {
        // Neither side belongs to a pair: report them separately.
        rows.push({ type: 'removed', left: lefts[li], right: null, leftLine: leftStart + li, rightLine: null });
        li++;
        rows.push({ type: 'added', left: null, right: rights[ri], leftLine: null, rightLine: rightStart + ri });
        ri++;
        continue;
      }
      if (matchOfRight.get(ri) !== undefined) {
        rows.push({ type: 'removed', left: lefts[li], right: null, leftLine: leftStart + li, rightLine: null });
        li++;
        continue;
      }
      rows.push({ type: 'added', left: null, right: rights[ri], leftLine: null, rightLine: rightStart + ri });
      ri++;
      continue;
    }
    if (li < lefts.length) {
      rows.push({ type: 'removed', left: lefts[li], right: null, leftLine: leftStart + li, rightLine: null });
      li++;
    } else {
      rows.push({ type: 'added', left: null, right: rights[ri], leftLine: null, rightLine: rightStart + ri });
      ri++;
    }
  }
}

/**
 * Line-based diff of two documents.
 *
 * Matching uses normalized lines (per `ignoreWhitespace` / `ignoreCase`) while
 * the rows keep the original text for display. Normalization is line-preserving,
 * so indexes stay aligned. Removed/added runs are then paired by word
 * similarity to distinguish "modified" from pure additions and deletions.
 */
export function computeTextDiff(a: string, b: string, opts: CompareOptions): TextDiffResult {
  const aLines = a.split('\n');
  const bLines = b.split('\n');
  const aKeys = normalizeText(a, opts).split('\n');
  const bKeys = normalizeText(b, opts).split('\n');

  const rows: LineDiffRow[] = [];
  let i = 0; // index into aLines
  let j = 0; // index into bLines
  let pendingLeft: string[] = [];
  let pendingRight: string[] = [];
  let pendingLeftStart = 0;
  let pendingRightStart = 0;

  const flush = () => {
    if (pendingLeft.length || pendingRight.length) {
      emitBlock(pendingLeft, pendingRight, pendingLeftStart + 1, pendingRightStart + 1, rows);
    }
    pendingLeft = [];
    pendingRight = [];
  };

  for (const change of diffArrays(aKeys, bKeys)) {
    const values = change.value as string[];
    const count = values.length;
    if (change.added) {
      if (pendingRight.length === 0) pendingRightStart = j;
      pendingRight.push(...bLines.slice(j, j + count));
      j += count;
    } else if (change.removed) {
      if (pendingLeft.length === 0) pendingLeftStart = i;
      pendingLeft.push(...aLines.slice(i, i + count));
      i += count;
    } else {
      flush();
      for (let k = 0; k < count; k++) {
        rows.push({ type: 'equal', left: aLines[i + k], right: bLines[j + k], leftLine: i + k + 1, rightLine: j + k + 1 });
      }
      i += count;
      j += count;
    }
  }
  flush();

  const added = rows.filter((r) => r.type === 'added').length;
  const removed = rows.filter((r) => r.type === 'removed').length;
  const modified = rows.filter((r) => r.type === 'modified').length;
  const equal = rows.filter((r) => r.type === 'equal').length;

  const total = Math.max(aLines.length, bLines.length, 1);
  const changePercent = Math.min(100, Math.round(((added + removed + modified) / total) * 1000) / 10);

  const unified = createTwoFilesPatch(
    'Original',
    'Modified',
    aKeys.join('\n'),
    bKeys.join('\n'),
    'Original',
    'Modified',
    { context: 3 },
  );

  return { rows, added, removed, modified, equal, totalLeft: aLines.length, totalRight: bLines.length, changePercent, unified };
}
