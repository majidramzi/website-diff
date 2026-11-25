export interface CompareOptions {
  ignoreWhitespace: boolean;
  ignoreCase: boolean;
  ignoreAttributes: boolean;
  ignoreTags: string[];
  textOnly: boolean;
  normalizedHtml: boolean;
}

export const DEFAULT_OPTIONS: CompareOptions = {
  ignoreWhitespace: false,
  ignoreCase: false,
  ignoreAttributes: false,
  ignoreTags: ['script', 'style'],
  textOnly: false,
  normalizedHtml: true,
};

export type RowType = 'equal' | 'added' | 'removed' | 'modified';

export interface LineDiffRow {
  type: RowType;
  left: string | null;
  right: string | null;
  leftLine: number | null;
  rightLine: number | null;
}

export interface TextDiffResult {
  rows: LineDiffRow[];
  added: number;
  removed: number;
  modified: number;
  equal: number;
  totalLeft: number;
  totalRight: number;
  changePercent: number;
  unified: string;
}

export interface HeadingItem {
  level: number;
  text: string;
}

export interface LinkItem {
  text: string;
  href: string;
}

export interface ImageItem {
  src: string;
  alt: string;
}

export interface HtmlExtract {
  title: string;
  metaDescription: string;
  canonical: string;
  headings: HeadingItem[];
  paragraphs: string[];
  links: LinkItem[];
  images: ImageItem[];
  meta: Record<string, string>;
  text: string;
  normalizedHtml: string;
}

export interface FieldChange {
  field: string;
  left: string;
  right: string;
  status: 'equal' | 'added' | 'removed' | 'modified';
}

export interface ListChange {
  field: string;
  added: string[];
  removed: string[];
  equal: string[];
}

export interface HtmlDiffResult {
  extractA: HtmlExtract;
  extractB: HtmlExtract;
  scalarChanges: FieldChange[];
  listChanges: ListChange[];
  textDiff: TextDiffResult;
  normalizedDiff: TextDiffResult | null;
  added: number;
  removed: number;
  modified: number;
  changePercent: number;
}

export type CompareMode = 'text' | 'html';

export interface CompareResult {
  mode: CompareMode;
  textDiff: TextDiffResult;
  htmlDiff: HtmlDiffResult | null;
  added: number;
  removed: number;
  modified: number;
  changePercent: number;
  generatedAt: string;
}

export interface InputMeta {
  labelA: string;
  labelB: string;
  urlA?: string;
  urlB?: string;
}
