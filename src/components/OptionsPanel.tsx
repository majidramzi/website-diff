import { RotateCcw, Settings2 } from 'lucide-react';
import type { CompareOptions } from '../lib/types';
import { DEFAULT_OPTIONS } from '../lib/types';
import { parseIgnoreTags } from '../lib/normalize';

interface Props {
  options: CompareOptions;
  onChange: (next: CompareOptions) => void;
  mode: 'auto' | 'text' | 'html';
  onModeChange: (mode: 'auto' | 'text' | 'html') => void;
  ignoreTagsInput: string;
  onIgnoreTagsInput: (value: string) => void;
}

const MODES: Array<{ id: 'auto' | 'text' | 'html'; label: string; hint: string }> = [
  { id: 'auto', label: 'Auto-detect', hint: 'HTML mode when the input looks like markup' },
  { id: 'text', label: 'Text', hint: 'Plain line-by-line text comparison' },
  { id: 'html', label: 'HTML', hint: 'Extract title, meta, headings, links, images…' },
];

function Toggle({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
        disabled
          ? 'cursor-not-allowed border-slate-200 opacity-50 dark:border-slate-800'
          : checked
            ? 'border-sky-400 bg-sky-50/60 dark:border-sky-700 dark:bg-sky-950/40'
            : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'
      }`}
    >
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 accent-sky-600"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">{label}</span>
        <span className="block text-xs text-slate-500 dark:text-slate-400">{hint}</span>
      </span>
    </label>
  );
}

export default function OptionsPanel({
  options,
  onChange,
  mode,
  onModeChange,
  ignoreTagsInput,
  onIgnoreTagsInput,
}: Props) {
  const set = <K extends keyof CompareOptions>(key: K, value: CompareOptions[K]) =>
    onChange({ ...options, [key]: value });

  const tags = parseIgnoreTags(ignoreTagsInput);

  return (
    <section className="card p-4">
      <header className="mb-4 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
          <Settings2 size={15} className="text-sky-500" />
          Comparison settings
        </h2>
        <button
          type="button"
          className="btn-ghost !px-2 !py-1 text-xs"
          onClick={() => {
            onChange({ ...DEFAULT_OPTIONS });
            onIgnoreTagsInput(DEFAULT_OPTIONS.ignoreTags.join(', '));
            onModeChange('auto');
          }}
        >
          <RotateCcw size={13} />
          Reset
        </button>
      </header>

      <div className="mb-4">
        <span className="panel-title mb-2 block">Comparison mode</span>
        <div className="grid gap-2 sm:grid-cols-3">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onModeChange(m.id)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                mode === m.id
                  ? 'border-sky-500 bg-sky-50 dark:border-sky-600 dark:bg-sky-950/40'
                  : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'
              }`}
              aria-pressed={mode === m.id}
            >
              <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">{m.label}</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">{m.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <Toggle
          label="Ignore whitespace"
          hint="Collapse runs of spaces/tabs and trim lines"
          checked={options.ignoreWhitespace}
          onChange={(v) => set('ignoreWhitespace', v)}
        />
        <Toggle
          label="Ignore case"
          hint="Compare case-insensitively"
          checked={options.ignoreCase}
          onChange={(v) => set('ignoreCase', v)}
        />
        <Toggle
          label="Ignore HTML attributes"
          hint="Normalized HTML keeps tags and text only"
          checked={options.ignoreAttributes}
          onChange={(v) => set('ignoreAttributes', v)}
          disabled={mode === 'text'}
        />
        <Toggle
          label="Compare text only"
          hint="Ignore all markup, compare visible text"
          checked={options.textOnly}
          onChange={(v) => set('textOnly', v)}
          disabled={mode === 'text'}
        />
        <Toggle
          label="Compare normalized HTML"
          hint="Also diff the normalized markup tree"
          checked={options.normalizedHtml}
          onChange={(v) => set('normalizedHtml', v)}
          disabled={mode === 'text'}
        />
        <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <label className="block text-sm font-medium text-slate-800 dark:text-slate-100" htmlFor="ignore-tags">
            Ignore selected tags
          </label>
          <span className="mb-1.5 block text-xs text-slate-500 dark:text-slate-400">
            Removed from HTML before comparing. script &amp; style are always removed.
          </span>
          <input
            id="ignore-tags"
            className="input !py-1.5 font-mono text-xs"
            placeholder="script, style, nav, footer"
            value={ignoreTagsInput}
            disabled={mode === 'text'}
            onChange={(e) => {
              onIgnoreTagsInput(e.target.value);
              set('ignoreTags', parseIgnoreTags(e.target.value));
            }}
          />
          {tags.length > 0 && (
            <span className="mt-2 flex flex-wrap gap-1">
              {tags.map((t) => (
                <span key={t} className="chip bg-slate-100 font-mono text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  &lt;{t}&gt;
                </span>
              ))}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
