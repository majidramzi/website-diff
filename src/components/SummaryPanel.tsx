import { CheckCircle2, Minus, PenLine, Plus, Scale } from 'lucide-react';
import type { CompareResult } from '../lib/types';

interface Props {
  result: CompareResult;
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone: string;
}) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>{icon}</span>
      <div className="min-w-0">
        <div className="truncate text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </div>
        <div className="font-mono text-xl font-bold leading-tight text-slate-900 tabular-nums dark:text-slate-50">
          {value}
        </div>
      </div>
    </div>
  );
}

export default function SummaryPanel({ result }: Props) {
  const equal = result.textDiff.equal;
  const total = result.textDiff.rows.length || 1;
  const pct = Math.min(100, Math.round((equal / total) * 100));

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat
          icon={<Plus size={17} className="text-emerald-600 dark:text-emerald-400" />}
          label="Added"
          value={result.added}
          tone="bg-emerald-100 dark:bg-emerald-950/60"
        />
        <Stat
          icon={<Minus size={17} className="text-rose-600 dark:text-rose-400" />}
          label="Removed"
          value={result.removed}
          tone="bg-rose-100 dark:bg-rose-950/60"
        />
        <Stat
          icon={<PenLine size={17} className="text-amber-600 dark:text-amber-400" />}
          label="Modified"
          value={result.modified}
          tone="bg-amber-100 dark:bg-amber-950/60"
        />
        <Stat
          icon={<CheckCircle2 size={17} className="text-slate-500 dark:text-slate-400" />}
          label="Unchanged lines"
          value={equal}
          tone="bg-slate-100 dark:bg-slate-800/60"
        />
        <Stat
          icon={<Scale size={17} className="text-sky-600 dark:text-sky-400" />}
          label="Change"
          value={`${result.changePercent}%`}
          tone="bg-sky-100 dark:bg-sky-950/60"
        />
      </div>

      <div className="card p-4">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span>Similarity of compared lines</span>
          <span className="font-mono">{pct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {result.mode === 'html'
            ? 'HTML mode: counts combine extracted metadata fields, content lists (headings, paragraphs, links, images, meta tags) and visible-text lines.'
            : 'Text mode: counts are line-level additions, removals and in-place modifications.'}
        </p>
      </div>
    </div>
  );
}
