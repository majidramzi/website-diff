import { useMemo } from 'react';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { sanitizeHtml } from '../lib/sanitize';

interface Props {
  htmlA: string;
  htmlB: string;
}

/**
 * Sanitized HTML preview. Imported markup is passed through DOMPurify with
 * scripts, iframes, forms and event handlers forbidden before rendering.
 * This is the single place where markup is inserted into the DOM, and only
 * after sanitization.
 */
export default function SourcePreview({ htmlA, htmlB }: Props) {
  const cleanA = useMemo(() => sanitizeHtml(htmlA), [htmlA]);
  const cleanB = useMemo(() => sanitizeHtml(htmlB), [htmlB]);

  const panels: Array<{ label: string; raw: string; clean: string }> = [
    { label: 'Original (sanitized render)', raw: htmlA, clean: cleanA },
    { label: 'Modified (sanitized render)', raw: htmlB, clean: cleanB },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs leading-relaxed text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200">
        <ShieldCheck size={15} className="mt-0.5 shrink-0" />
        <p>
          Previews are sanitized with DOMPurify: <code className="font-mono">script</code>, <code className="font-mono">style</code>,{' '}
          <code className="font-mono">iframe</code>, <code className="font-mono">object</code>, forms and event handlers are stripped, and the
          HTML is never executed. Raw source below is shown as escaped text.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {panels.map((p) => (
          <div key={p.label} className="card overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{p.label}</h3>
              <span className="chip bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {p.clean.length < p.raw.length ? (
                  <>
                    <ShieldAlert size={11} className="text-amber-500" /> {p.raw.length - p.clean.length} chars removed
                  </>
                ) : (
                  'clean'
                )}
              </span>
            </div>
            <div
              data-sanitized="true"
              className="scroll-thin max-h-[38vh] overflow-auto border-b border-slate-200 p-4 text-sm dark:border-slate-800"
              // Safe: content has been sanitized by DOMPurify above.
              dangerouslySetInnerHTML={{ __html: p.clean }}
            />
            <pre className="scroll-thin max-h-[28vh] overflow-auto bg-slate-50 p-3 font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap break-words text-slate-600 dark:bg-slate-950/50 dark:text-slate-400">
              {p.raw.slice(0, 20000) || '(empty)'}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
