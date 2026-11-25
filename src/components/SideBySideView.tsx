import type { LineDiffRow } from '../lib/types';
import InlineDiff, { InlineDiffRight } from './InlineDiff';

interface Props {
  rows: LineDiffRow[];
  labelA: string;
  labelB: string;
  collapseEqual: boolean;
}

const rowClass: Record<LineDiffRow['type'], string> = {
  added: 'diff-add',
  removed: 'diff-del',
  modified: 'diff-mod',
  equal: 'diff-eq',
};

const marker: Record<LineDiffRow['type'], string> = {
  added: '+',
  removed: '−',
  modified: '~',
  equal: ' ',
};

const markerClass: Record<LineDiffRow['type'], string> = {
  added: 'text-emerald-600 dark:text-emerald-400',
  removed: 'text-rose-600 dark:text-rose-400',
  modified: 'text-amber-600 dark:text-amber-400',
  equal: 'text-slate-300 dark:text-slate-700',
};

/** Collapse long runs of equal rows into a single divider row. */
type Item = LineDiffRow | 'gap';

function buildItems(rows: LineDiffRow[], collapseEqual: boolean): Item[] {
  if (!collapseEqual) return rows;
  const out: Item[] = [];
  let run: LineDiffRow[] = [];

  const flushRun = () => {
    if (run.length > 6) out.push(...run.slice(0, 3), 'gap', ...run.slice(-3));
    else out.push(...run);
    run = [];
  };

  for (const row of rows) {
    if (row.type === 'equal') {
      run.push(row);
    } else {
      flushRun();
      out.push(row);
    }
  }
  flushRun();
  return out;
}

export default function SideBySideView({ rows, labelA, labelB, collapseEqual }: Props) {
  const items = buildItems(rows, collapseEqual);

  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
        <div className="truncate px-3 py-2">{labelA}</div>
        <div className="truncate border-l border-slate-200 px-3 py-2 dark:border-slate-800">{labelB}</div>
      </div>

      <div className="scroll-thin max-h-[70vh] overflow-auto">
        <table className="w-full table-fixed border-collapse font-mono text-[12.5px] leading-[1.55]">
          <tbody>
            {items.map((item, i) =>
              item === 'gap' ? (
                <tr key={`gap-${i}`}>
                  <td
                    colSpan={6}
                    className="bg-slate-100 px-3 py-1 text-center text-[11px] text-slate-500 dark:bg-slate-900 dark:text-slate-400"
                  >
                    ⋯ unchanged lines hidden ⋯
                  </td>
                </tr>
              ) : (
                <tr key={`row-${i}`} className={rowClass[item.type]}>
                  <td className="diff-gutter w-12 px-2 py-0.5 align-top">{item.leftLine ?? ''}</td>
                  <td className="w-6 px-1 py-0.5 align-top">
                    <span className={markerClass[item.type]}>{marker[item.type]}</span>
                  </td>
                  <td className="whitespace-pre-wrap break-words px-2 py-0.5 align-top">
                    {item.type === 'modified' && item.left !== null && item.right !== null ? (
                      <InlineDiff left={item.left} right={item.right} />
                    ) : (
                      item.left ?? ''
                    )}
                  </td>
                  <td className="diff-gutter w-12 border-l border-slate-200 px-2 py-0.5 align-top dark:border-slate-800">
                    {item.rightLine ?? ''}
                  </td>
                  <td className="w-6 px-1 py-0.5 align-top">
                    <span className={markerClass[item.type]}>{marker[item.type]}</span>
                  </td>
                  <td className="whitespace-pre-wrap break-words px-2 py-0.5 align-top">
                    {item.type === 'modified' && item.left !== null && item.right !== null ? (
                      <InlineDiffRight left={item.left} right={item.right} />
                    ) : (
                      item.right ?? ''
                    )}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
