// Tagged-PDF support for the report (PDF/UA-1). pdfmake lays the document out but never tags content, so this file adds
// the missing half without touching the layout:
//   1. the builder describes the logical structure as a TagTree (Document > H1/H2/P/Table > TR > TH/TD > P) and puts a
//      reference to the owning TagNode on every text node it emits (`_tag`; pdfmake copies unknown props to the lines);
//   2. installPdfTagging() wraps three methods of pdfmake's Renderer (the pinned 0.3.13): renderLine wraps each line in
//      marked content that points at its struct element, renderVector marks borders and fills as Artifact, and renderPages completes the font CIDSets. pdfkit
//      (subset 'PDF/UA', tagged) writes the XMP metadata and the structure tree. pdfkit pastes the document info into the
//      XMP packet without escaping, so installPdfTagging() also escapes those fields while the packet is written; a
//      repository URL with "&" would otherwise make the XMP invalid XML.
// Lines without a `_tag` are the running header and footer ("Page x of y"), which are Pagination artifacts. Everything
// else, including every heading, paragraph and table cell, is real content in the structure tree.
import { createRequire } from 'node:module';

export type TagType = 'Document' | 'H1' | 'H2' | 'P' | 'Table' | 'TR' | 'TH' | 'TD';

export class TagNode {
  readonly kids: TagNode[] = [];
  // set while rendering
  el?: PdfStructElement;
  firstPage?: object;
  constructor(
    readonly type: TagType,
    readonly parent?: TagNode,
    readonly scope?: 'Row' | 'Column'
  ) {}
  child(type: TagType, scope?: 'Row' | 'Column'): TagNode {
    const n = new TagNode(type, this, scope);
    this.kids.push(n);
    return n;
  }
  root(): TagNode {
    return this.parent ? this.parent.root() : this;
  }
}

export class TagTree {
  readonly document = new TagNode('Document');
}

// ---- minimal pdfkit / pdfmake surface ----
interface PdfStructElement {
  add(child: unknown): PdfStructElement;
}
interface PdfKitDoc {
  options?: { tagged?: boolean };
  _fontFamilies?: Record<string, EmbeddedFontLike>;
  page: object;
  struct(type: string, options?: Record<string, unknown>): PdfStructElement;
  addStructure(el: PdfStructElement): void;
  markStructureContent(tag: string): unknown;
  markContent(tag: string, options?: Record<string, unknown>): void;
  endMarkedContent(): void;
}
interface RendererLike {
  pdfDocument: PdfKitDoc;
  renderPages(pages: unknown[]): void;
  renderLine(line: LineLike, x: number, y: number): void;
  renderVector(vector: unknown): void;
}
interface EmbeddedFontLike {
  subset?: { glyphs: number[]; encode(): unknown };
  font: { getGlyph(id: number): { advanceWidth: number } };
  widths: Array<number | undefined>;
  scale: number;
}
interface LineLike {
  inlines: Array<{ _tag?: TagNode }>;
}
type RendererClass = { prototype: RendererLike };

const MARK_TAG: Record<TagType, string> = { Document: 'Span', H1: 'H1', H2: 'H2', P: 'P', Table: 'Span', TR: 'Span', TH: 'P', TD: 'P' };

function instantiate(doc: PdfKitDoc, n: TagNode): PdfStructElement {
  const el = doc.struct(n.type, n.scope ? { scope: n.scope } : {});
  n.el = el;
  for (const k of n.kids) el.add(instantiate(doc, k));
  return el;
}

// Creates the whole struct tree the first time a tagged line is drawn. Empty cells still exist, so every table row has
// the same number of cells.
function ensureTree(doc: PdfKitDoc, node: TagNode): void {
  if (node.el) return;
  const root = node.root();
  if (root.el) throw new Error('tag node is not part of the instantiated tree');
  doc.addStructure(instantiate(doc, root));
}

const XML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };
const xmlEscape = (v: unknown): unknown => (typeof v === 'string' ? v.replace(/[&<>"']/g, (c) => XML_ESCAPES[c]) : v);
const INFO_KEYS = ['Title', 'Author', 'Subject', 'Keywords', 'Creator', 'Producer'];

// PDF/UA wants a CIDSet that lists every glyph in the embedded font subset. pdfkit builds it from the glyphs the text
// used, but the subset also pulls in component glyphs of composite ones (accented letters), so the set came up short and
// veraPDF failed 7.21.4.2. After the subset is encoded, give those extra glyphs a width so they are listed too.
function completeCidSets(doc: PdfKitDoc): void {
  for (const f of Object.values(doc._fontFamilies ?? {})) {
    const sub = f.subset;
    if (!sub) continue;
    const encode = sub.encode.bind(sub);
    sub.encode = () => {
      const out = encode();
      sub.glyphs.forEach((glyphId, i) => {
        if (f.widths[i] == null) f.widths[i] = f.font.getGlyph(glyphId).advanceWidth * f.scale;
      });
      return out;
    };
  }
}

let installed = false;

export function installPdfTagging(): void {
  if (installed) return;
  const require_ = createRequire(import.meta.url);
  const R = (require_('pdfmake/js/Renderer') as { default: RendererClass }).default.prototype;
  const renderLine = R.renderLine;
  const renderVector = R.renderVector;
  const renderPages = R.renderPages;

  R.renderPages = function (this: RendererLike, pages: unknown[]): void {
    renderPages.call(this, pages);
    if (this.pdfDocument.options?.tagged) completeCidSets(this.pdfDocument);
  };

  R.renderLine = function (this: RendererLike, line: LineLike, x: number, y: number): void {
    const doc = this.pdfDocument;
    if (!doc.options?.tagged) return renderLine.call(this, line, x, y);
    const tag = line.inlines[0]?._tag;
    if (line.inlines.some((i) => i._tag !== tag)) throw new Error('a text line mixes several structure elements');
    // A header row that repeats on a following page is a duplicate of content that is already tagged, so it is an
    // artifact there (same as Word and Acrobat do). Its first occurrence stays real content in the TH.
    const repeat = tag?.type === 'P' && tag.parent?.type === 'TH' && tag.parent.firstPage !== undefined && tag.parent.firstPage !== doc.page;
    if (!tag || repeat) {
      doc.markContent('Artifact', { type: 'Pagination' });
      renderLine.call(this, line, x, y);
      doc.endMarkedContent();
      return;
    }
    ensureTree(doc, tag);
    if (tag.parent?.type === 'TH' && tag.parent.firstPage === undefined) tag.parent.firstPage = doc.page;
    const content = doc.markStructureContent(MARK_TAG[tag.type]);
    renderLine.call(this, line, x, y);
    doc.endMarkedContent();
    (tag.el as PdfStructElement).add(content);
  };

  R.renderVector = function (this: RendererLike, vector: unknown): void {
    const doc = this.pdfDocument;
    if (!doc.options?.tagged) return renderVector.call(this, vector);
    doc.markContent('Artifact', { type: 'Layout' });
    renderVector.call(this, vector);
    doc.endMarkedContent();
  };

  // The pdfkit that pdfmake itself loads (the same module instance).
  const pdfkitRequire = createRequire(require_.resolve('pdfmake/package.json'));
  const Kit = (pdfkitRequire('pdfkit') as { PDFDocument: { prototype: { _addInfo(): void; info: Record<string, unknown> } } }).PDFDocument.prototype;
  const addInfo = Kit._addInfo;
  Kit._addInfo = function (this: { info: Record<string, unknown> }): void {
    const saved = { ...this.info };
    for (const k of INFO_KEYS) this.info[k] = xmlEscape(this.info[k]);
    try {
      addInfo.call(this);
    } finally {
      Object.assign(this.info, saved);
    }
  };
  installed = true;
}
