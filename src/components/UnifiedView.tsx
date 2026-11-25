import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface Props {
  unified: string;
  variant?: 'text' | 'normalized-html';
}

/** Classic unified diff view (`---`, `+++`, `@@` hunks) with +/- coloring. */
export default function UnifiedView({ unified, variant = 'text' }: Props) {
  const [copied, setCopied] = useState(false);
  const lines = unified.split('\n');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(unified);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/50">
        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
          {variant === 'normalized-html' ? 'unified diff · normalized HTML' : 'unified diff · text'}
        </span>
        <button type="button" className="btn-ghost !px-2 !py-1 text-xs" onClick={copy}>
          {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div className="scroll-thin max-h-[70vh] overflow-auto bg-white dark:bg-slate-900">
        <pre className="min-w-full font-mono text-[12.5px] leading-[1.55]">
          {lines.map((line, i) => {
            let cls = 'text-slate-700 dark:text-slate-300';
            if (line.startsWith('+++') || line.startsWith('---')) cls = 'text-sky-600 dark:text-sky-400';
            else if (line.startsWith('@@')) cls = 'bg-slate-100 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400';
            else if (line.startsWith('+')) cls = 'diff-add text-emerald-800 dark:text-emerald-200';
            else if (line.startsWith('-')) cls = 'diff-del text-rose-800 dark:text-rose-200';
            return (
              <div key={i} className={`flex gap-3 px-3 ${cls}`}>
                <span className="w-4 shrink-0 select-none text-right opacity-40">{i + 1}</span>
                <span className="whitespace-pre-wrap break-words">{line || ' '}</span>
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
}
