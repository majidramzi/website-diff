import type { FieldChange, HtmlDiffResult, ListChange } from '../lib/types';

const statusChip: Record<FieldChange['status'], string> = {
  equal: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  added: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300',
  removed: 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300',
  modified: 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300',
};

function ScalarRow({ change }: { change: FieldChange }) {
  return (
    <tr className={change.status === 'equal' ? '' : change.status === 'added' ? 'diff-add' : change.status === 'removed' ? 'diff-del' : 'diff-mod'}>
      <td className="px-3 py-2 align-top font-medium text-slate-700 dark:text-slate-200">{change.field}</td>
      <td className="px-3 py-2 align-top">
        <span className={`chip ${statusChip[change.status]}`}>{change.status}</span>
      </td>
      <td className="px-3 py-2 align-top font-mono text-xs break-words text-slate-600 dark:text-slate-300">
        {change.left || <span className="text-slate-400">(empty)</span>}
      </td>
      <td className="px-3 py-2 align-top font-mono text-xs break-words text-slate-600 dark:text-slate-300">
        {change.right || <span className="text-slate-400">(empty)</span>}
      </td>
    </tr>
  );
}

function ListBlock({ change }: { change: ListChange }) {
  const total = change.added.length + change.removed.length;
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{change.field}</h3>
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <span className="chip bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
            +{change.added.length}
          </span>
          <span className="chip bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300">
            −{change.removed.length}
          </span>
          <span className="chip bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            ={change.equal.length}
          </span>
        </div>
      </div>
      {total === 0 ? (
        <p className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">No changes detected in this group.</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {[...change.added.map((v) => ({ v, t: 'added' as const })), ...change.removed.map((v) => ({ v, t: 'removed' as const }))].map(
            ({ v, t }, i) => (
              <li
                key={`${t}-${i}`}
                className={`flex gap-2 px-4 py-2 font-mono text-xs break-words ${t === 'added' ? 'diff-add text-emerald-800 dark:text-emerald-200' : 'diff-del text-rose-800 dark:text-rose-200'}`}
              >
                <span className="shrink-0 font-bold">{t === 'added' ? '+' : '−'}</span>
                <span className="whitespace-pre-wrap">{v}</span>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}

export default function HtmlContentView({ diff }: { diff: HtmlDiffResult }) {
  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Metadata &amp; selected fields</h3>
        </div>
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">
                <th className="px-3 py-2 font-semibold">Field</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Original</th>
                <th className="px-3 py-2 font-semibold">Modified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {diff.scalarChanges.map((c) => (
                <ScalarRow key={c.field} change={c} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {diff.listChanges.map((c) => (
          <ListBlock key={c.field} change={c} />
        ))}
      </div>
    </div>
  );
}
