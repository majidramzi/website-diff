import { diffWordsWithSpace } from 'diff';

/**
 * Inline word-level highlight for a pair of modified lines.
 * Renders plain text nodes only — imported content is never inserted into the
 * DOM as markup.
 */
export default function InlineDiff({ left, right }: { left: string; right: string }) {
  const parts = diffWordsWithSpace(left, right);
  return (
    <span>
      {parts.map((p, idx) =>
        p.added ? null : (
          <span key={`l${idx}`} className={p.removed ? 'rounded bg-rose-200/80 px-0.5 dark:bg-rose-700/60' : undefined}>
            {p.value}
          </span>
        ),
      )}
    </span>
  );
}

export function InlineDiffRight({ left, right }: { left: string; right: string }) {
  const parts = diffWordsWithSpace(left, right);
  return (
    <span>
      {parts.map((p, idx) =>
        p.removed ? null : (
          <span key={`r${idx}`} className={p.added ? 'rounded bg-emerald-200/80 px-0.5 dark:bg-emerald-700/60' : undefined}>
            {p.value}
          </span>
        ),
      )}
    </span>
  );
}
