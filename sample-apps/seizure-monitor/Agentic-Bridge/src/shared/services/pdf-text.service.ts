/**
 * PDF text extraction.
 *
 * The architecture is explicit that an administrator can hand the bridge "a
 * critical architectural decision stored in an obscure, non-indexed PDF" and
 * have it chunked, embedded and folded into the manifest. A PDF read as UTF-8
 * yields binary noise, so `ingest_manual_document` needs a real extractor rather
 * than a hopeful `toString()`.
 *
 * What this implements, working from the PDF 1.7 specification:
 *
 *   - the indirect object table, recovered by scanning for `N G obj … endobj`
 *     rather than trusting the xref (damaged and incrementally-updated files are
 *     common, and a linear scan is immune to a stale offset table);
 *   - object streams (`/Type /ObjStm`), which is where most modern producers put
 *     the page and font dictionaries;
 *   - FlateDecode, with a raw-deflate retry for producers that omit the zlib
 *     header, and ASCIIHexDecode;
 *   - the text-showing operators `Tj`, `TJ`, `'` and `"`, with `TJ`'s kerning
 *     array used to reinstate the spaces the format does not store;
 *   - per-font `/ToUnicode` CMaps (`bfchar` / `bfrange`), which is what makes a
 *     subset-embedded font come back as words instead of glyph indices.
 *
 * What it does not implement: encrypted PDFs, and scanned pages with no text
 * layer. Both are reported as such, because an extractor that silently returns
 * an empty string teaches the administrator to distrust the whole feature.
 */
import { Injectable } from '@nitrostack/core';
import * as zlib from 'zlib';

export interface PdfExtraction {
  text: string;
  pages: number;
  /** True when the document carried no extractable text layer. */
  empty: boolean;
  /** Non-fatal problems worth showing the administrator. */
  warnings: string[];
}

/** Guards against a hostile or malformed file expanding without bound. */
const MAX_DECOMPRESSED_BYTES = 64 * 1024 * 1024;

/** Token kinds the content-stream scanner emits. */
type ContentToken =
  | { kind: 'string'; literal: boolean; value: string }
  | { kind: 'name'; value: string }
  | { kind: 'number'; number: number }
  | { kind: 'operator'; value: string }
  | { kind: 'array-open' }
  | { kind: 'array-close' };

interface PdfObject {
  /** Raw dictionary source, between `<<` and its matching `>>`. */
  dict: string;
  /** Decoded stream payload, when the object had one. */
  stream?: Buffer;
}

@Injectable()
export class PdfTextService {
  /** True when the buffer starts with a PDF header. */
  static isPdf(buffer: Buffer): boolean {
    return buffer.subarray(0, 5).toString('latin1') === '%PDF-';
  }

  extract(buffer: Buffer): PdfExtraction {
    const warnings: string[] = [];
    if (!PdfTextService.isPdf(buffer)) {
      throw new Error('Not a PDF: the file does not begin with a %PDF- header.');
    }

    // latin1 is a byte-preserving round trip, which matters because a PDF is a
    // mix of ASCII syntax and arbitrary binary stream payloads.
    const raw = buffer.toString('latin1');

    if (/\/Encrypt\s/.test(raw)) {
      throw new Error(
        'This PDF is encrypted. Decrypt it, export it to text or markdown, or paste the ' +
          'relevant section into the `text` parameter instead.'
      );
    }

    const objects = this.parseObjects(raw, buffer, warnings);
    this.expandObjectStreams(objects, warnings);

    const fontMaps = this.buildFontMaps(objects);
    const pages = this.collectPages(objects);

    const chunks: string[] = [];
    for (const page of pages) {
      const content = page.contents
        .map((ref) => objects.get(ref)?.stream)
        .filter((s): s is Buffer => !!s)
        .map((s) => s.toString('latin1'))
        .join('\n');
      if (!content) continue;
      const text = this.extractFromContentStream(content, page.fonts, fontMaps);
      if (text.trim()) chunks.push(text.trim());
    }

    // Fallback for producers whose page tree we could not walk (a broken
    // /Pages chain, an unusual /Contents form): decode every content-looking
    // stream in document order. Ordering is less reliable, but recovering the
    // words at all beats refusing the document.
    if (!chunks.length) {
      for (const object of objects.values()) {
        if (!object.stream) continue;
        const content = object.stream.toString('latin1');
        if (!/\b(Tj|TJ)\b/.test(content)) continue;
        const text = this.extractFromContentStream(content, {}, fontMaps);
        if (text.trim()) chunks.push(text.trim());
      }
      if (chunks.length) {
        warnings.push(
          'The page tree could not be walked, so text was recovered stream by stream. ' +
            'Reading order may not match the printed document.'
        );
      }
    }

    const text = this.tidy(chunks.join('\n\n'));
    if (!text) {
      warnings.push(
        'No text layer was found. This is usually a scanned document — it needs OCR before ' +
          'the bridge can index it.'
      );
    }

    return { text, pages: pages.length, empty: !text, warnings };
  }

  /* ------------------------------------------------------------------ *
   * Object table
   * ------------------------------------------------------------------ */

  /**
   * Recover every indirect object by scanning. The stream length is taken from
   * the `endstream` keyword rather than the dictionary's `/Length`, because
   * `/Length` is frequently an indirect reference that has not been resolved yet
   * at this point in the parse.
   */
  private parseObjects(raw: string, buffer: Buffer, warnings: string[]): Map<string, PdfObject> {
    const objects = new Map<string, PdfObject>();
    const header = /(\d+)\s+(\d+)\s+obj\b/g;

    let match: RegExpExecArray | null;
    while ((match = header.exec(raw)) !== null) {
      const id = `${match[1]}:${match[2]}`;
      const bodyStart = match.index + match[0].length;
      const bodyEnd = raw.indexOf('endobj', bodyStart);
      if (bodyEnd === -1) continue;

      const body = raw.slice(bodyStart, bodyEnd);
      const dict = this.sliceDictionary(body);

      const streamKeyword = body.indexOf('stream');
      let stream: Buffer | undefined;
      if (streamKeyword !== -1) {
        // `stream` is followed by CRLF or LF, never by CR alone.
        let dataStart = bodyStart + streamKeyword + 'stream'.length;
        if (raw[dataStart] === '\r') dataStart++;
        if (raw[dataStart] === '\n') dataStart++;

        const dataEnd = raw.indexOf('endstream', dataStart);
        if (dataEnd !== -1) {
          const rawStream = buffer.subarray(dataStart, this.trimEol(raw, dataEnd));
          stream = this.decodeStream(rawStream, dict, id, warnings);
        }
      }

      objects.set(id, { dict, stream });
    }
    return objects;
  }

  /** Walk back over the EOL that precedes `endstream` without eating stream bytes. */
  private trimEol(raw: string, index: number): number {
    let end = index;
    if (raw[end - 1] === '\n') end--;
    if (raw[end - 1] === '\r') end--;
    return end;
  }

  /** Extract `<< … >>` from the head of an object body, respecting nesting. */
  private sliceDictionary(body: string): string {
    const start = body.indexOf('<<');
    if (start === -1) return '';
    let depth = 0;
    for (let i = start; i < body.length - 1; i++) {
      if (body[i] === '<' && body[i + 1] === '<') {
        depth++;
        i++;
      } else if (body[i] === '>' && body[i + 1] === '>') {
        depth--;
        i++;
        if (depth === 0) return body.slice(start, i + 1);
      }
    }
    return body.slice(start);
  }

  private decodeStream(
    data: Buffer,
    dict: string,
    id: string,
    warnings: string[]
  ): Buffer | undefined {
    try {
      let decoded = data;
      if (/\/ASCIIHexDecode\b/.test(dict)) {
        decoded = Buffer.from(
          decoded.toString('latin1').replace(/>[\s\S]*$/, '').replace(/[^0-9a-fA-F]/g, ''),
          'hex'
        );
      }
      if (/\/FlateDecode\b/.test(dict)) {
        decoded = this.inflate(decoded);
      }
      if (decoded.length > MAX_DECOMPRESSED_BYTES) {
        warnings.push(`Stream ${id} exceeded the ${MAX_DECOMPRESSED_BYTES} byte budget and was truncated.`);
        decoded = decoded.subarray(0, MAX_DECOMPRESSED_BYTES);
      }
      return decoded;
    } catch {
      // One unreadable stream (an unsupported filter, a truncated payload) must
      // not cost us the rest of the document.
      return undefined;
    }
  }

  /**
   * zlib first, raw deflate second. Some producers write a bare deflate payload,
   * and `inflateSync` rejects it for a missing header. `finishFlush: Z_SYNC_FLUSH`
   * salvages streams whose final block is truncated, which is common in files
   * that have been through a lossy pipeline.
   */
  private inflate(data: Buffer): Buffer {
    const options = { finishFlush: zlib.constants.Z_SYNC_FLUSH, maxOutputLength: MAX_DECOMPRESSED_BYTES };
    try {
      return zlib.inflateSync(data, options);
    } catch {
      return zlib.inflateRawSync(data, options);
    }
  }

  /**
   * Unpack `/Type /ObjStm` containers. Their header is N pairs of
   * `objectNumber offset`, followed by the objects themselves at those offsets
   * relative to `/First`.
   */
  private expandObjectStreams(objects: Map<string, PdfObject>, warnings: string[]): void {
    for (const [id, object] of [...objects.entries()]) {
      if (!object.stream || !/\/Type\s*\/ObjStm\b/.test(object.dict)) continue;

      const count = Number(object.dict.match(/\/N\s+(\d+)/)?.[1] ?? 0);
      const first = Number(object.dict.match(/\/First\s+(\d+)/)?.[1] ?? 0);
      if (!count || !first) continue;

      const body = object.stream.toString('latin1');
      const pairs = body.slice(0, first).trim().split(/\s+/).map(Number);

      try {
        for (let i = 0; i < count; i++) {
          const objectNumber = pairs[i * 2];
          const offset = pairs[i * 2 + 1];
          if (!Number.isFinite(objectNumber) || !Number.isFinite(offset)) continue;

          const end = i + 1 < count ? first + pairs[(i + 1) * 2 + 1] : body.length;
          const source = body.slice(first + offset, end);
          const key = `${objectNumber}:0`;
          // A directly-stored object always wins over a compressed duplicate.
          if (!objects.has(key)) objects.set(key, { dict: this.sliceDictionary(source) });
        }
      } catch {
        warnings.push(`Object stream ${id} could not be fully unpacked.`);
      }
    }
  }

  /* ------------------------------------------------------------------ *
   * Page tree and fonts
   * ------------------------------------------------------------------ */

  private collectPages(
    objects: Map<string, PdfObject>
  ): { contents: string[]; fonts: Record<string, string> }[] {
    const pages: { contents: string[]; fonts: Record<string, string> }[] = [];

    for (const object of objects.values()) {
      if (!/\/Type\s*\/Page\b/.test(object.dict)) continue;
      if (/\/Type\s*\/Pages\b/.test(object.dict)) continue; // the intermediate node, not a leaf

      const contentsMatch = object.dict.match(/\/Contents\s*(\[[^\]]*\]|\d+\s+\d+\s+R)/);
      const contents = contentsMatch ? this.parseReferences(contentsMatch[1]) : [];

      // /Resources may be inline or an indirect reference to a shared dictionary.
      let resources = this.sliceNamedDictionary(object.dict, 'Resources');
      const resourceRef = object.dict.match(/\/Resources\s+(\d+)\s+(\d+)\s+R/);
      if (!resources && resourceRef) {
        resources = objects.get(`${resourceRef[1]}:${resourceRef[2]}`)?.dict ?? '';
      }

      pages.push({ contents, fonts: this.parseFontResources(resources, objects) });
    }
    return pages;
  }

  /** `/F1 12 0 R /F2 13 0 R` → `{ F1: '12:0', F2: '13:0' }`. */
  private parseFontResources(
    resources: string,
    objects: Map<string, PdfObject>
  ): Record<string, string> {
    let fontDict = this.sliceNamedDictionary(resources, 'Font');
    const fontRef = resources.match(/\/Font\s+(\d+)\s+(\d+)\s+R/);
    if (!fontDict && fontRef) {
      fontDict = objects.get(`${fontRef[1]}:${fontRef[2]}`)?.dict ?? '';
    }

    const fonts: Record<string, string> = {};
    const entry = /\/([A-Za-z0-9#+.\-_]+)\s+(\d+)\s+(\d+)\s+R/g;
    let match: RegExpExecArray | null;
    while ((match = entry.exec(fontDict)) !== null) {
      fonts[match[1]] = `${match[2]}:${match[3]}`;
    }
    return fonts;
  }

  /** Every font object's ToUnicode CMap, keyed by the font's object id. */
  private buildFontMaps(objects: Map<string, PdfObject>): Map<string, Map<number, string>> {
    const maps = new Map<string, Map<number, string>>();

    for (const [id, object] of objects) {
      const toUnicode = object.dict.match(/\/ToUnicode\s+(\d+)\s+(\d+)\s+R/);
      if (!toUnicode) continue;
      const cmapStream = objects.get(`${toUnicode[1]}:${toUnicode[2]}`)?.stream;
      if (!cmapStream) continue;
      maps.set(id, this.parseCMap(cmapStream.toString('latin1')));
    }
    return maps;
  }

  /**
   * Parse the two forms a ToUnicode CMap uses:
   *   `<src> <dst>` pairs inside beginbfchar/endbfchar, and
   *   `<lo> <hi> <dst>` or `<lo> <hi> [<d1> <d2> …]` inside beginbfrange.
   */
  private parseCMap(source: string): Map<number, string> {
    const map = new Map<number, string>();

    const charSection = /beginbfchar([\s\S]*?)endbfchar/g;
    let section: RegExpExecArray | null;
    while ((section = charSection.exec(source)) !== null) {
      const pair = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g;
      let entry: RegExpExecArray | null;
      while ((entry = pair.exec(section[1])) !== null) {
        map.set(parseInt(entry[1], 16), this.utf16BeToString(entry[2]));
      }
    }

    const rangeSection = /beginbfrange([\s\S]*?)endbfrange/g;
    while ((section = rangeSection.exec(source)) !== null) {
      const body = section[1];

      const arrayForm = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*\[([\s\S]*?)\]/g;
      let entry: RegExpExecArray | null;
      while ((entry = arrayForm.exec(body)) !== null) {
        const lo = parseInt(entry[1], 16);
        const destinations = entry[3].match(/<([0-9a-fA-F]+)>/g) ?? [];
        destinations.forEach((destination, index) => {
          map.set(lo + index, this.utf16BeToString(destination.slice(1, -1)));
        });
      }

      // Run the scalar form over the body with array forms removed, so the third
      // `<…>` of an array entry is never mistaken for a scalar destination.
      const scalarForm = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g;
      const withoutArrays = body.replace(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*\[[\s\S]*?\]/g, '');
      while ((entry = scalarForm.exec(withoutArrays)) !== null) {
        const lo = parseInt(entry[1], 16);
        const hi = parseInt(entry[2], 16);
        const base = entry[3];
        // A pathological range would otherwise let a 4-byte span allocate forever.
        for (let code = lo; code <= hi && code - lo < 65536; code++) {
          const shifted = (parseInt(base, 16) + (code - lo)).toString(16).padStart(base.length, '0');
          map.set(code, this.utf16BeToString(shifted));
        }
      }
    }
    return map;
  }

  /** CMap destinations are UTF-16BE, and may hold a surrogate pair or a ligature. */
  private utf16BeToString(hex: string): string {
    const padded = hex.length % 4 === 0 ? hex : hex.padStart(Math.ceil(hex.length / 4) * 4, '0');
    return Buffer.from(padded, 'hex').toString('utf16le').length
      ? Buffer.from(this.swapBytes(padded), 'hex').toString('utf16le')
      : '';
  }

  private swapBytes(hex: string): string {
    let out = '';
    for (let i = 0; i + 3 < hex.length; i += 4) {
      out += hex.slice(i + 2, i + 4) + hex.slice(i, i + 2);
    }
    return out;
  }

  private parseReferences(source: string): string[] {
    const refs: string[] = [];
    const pattern = /(\d+)\s+(\d+)\s+R/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source)) !== null) refs.push(`${match[1]}:${match[2]}`);
    return refs;
  }

  /** Extract the value of `/Name << … >>`, respecting nesting. */
  private sliceNamedDictionary(source: string, name: string): string {
    const key = source.indexOf(`/${name}`);
    if (key === -1) return '';
    const start = source.indexOf('<<', key);
    if (start === -1) return '';
    // Anything between the key and the dictionary means this `<<` belongs to a
    // later key, not to ours.
    if (source.slice(key + name.length + 1, start).trim() !== '') return '';
    return this.sliceDictionary(source.slice(start));
  }

  /* ------------------------------------------------------------------ *
   * Content stream interpretation
   * ------------------------------------------------------------------ */

  /**
   * Walk a content stream and reassemble its text.
   *
   * PDF stores no line or word separators — spacing is geometry — so this is a
   * small interpreter over the text-positioning operators rather than a regex
   * for `Tj`. It has to be: the producer of a Google Docs export emits one
   * `Td … Tj` pair *per glyph*, so treating `Td` as a line break (the obvious
   * shortcut) returns the document one character per line.
   *
   * The pen position is tracked through `Tm`, `Td`, `TD` and `T*`, and a newline
   * is emitted only when the baseline actually moves. Word spacing comes from
   * the two places a producer can put it: an encoded space glyph, and `TJ`'s
   * kerning array, where an adjustment past ~120 thousandths of an em is the
   * producer stepping over a space it never encoded.
   */
  private extractFromContentStream(
    content: string,
    fonts: Record<string, string>,
    fontMaps: Map<string, Map<number, string>>
  ): string {
    let out = '';
    let currentMap: Map<number, string> | undefined;

    // Pen position, in text-space units.
    let lineX = 0;
    let lineY = 0;
    let leading = 0;
    let lastY: number | null = null;

    /** Emit a break when the baseline has moved since the last glyph run. */
    const positionText = (): void => {
      if (lastY !== null && Math.abs(lineY - lastY) > 0.5 && out && !out.endsWith('\n')) {
        out += '\n';
      }
      lastY = lineY;
    };

    const operands: (number | { text: string } | { name: string })[] = [];
    const numbers = (count: number): number[] =>
      operands.filter((o): o is number => typeof o === 'number').slice(-count);

    let inArray = false;

    // Hand-written scanner rather than a regex. A content stream is part text
    // and part binary, and any regex able to match a PDF literal string —
    // which nests parentheses — backtracks catastrophically the moment it meets
    // an unbalanced `(` in binary payload. This pass is strictly linear.
    for (const item of this.tokenize(content)) {
      if (item.kind === 'string') {
        operands.push({ text: this.decodeStringToken(item, currentMap) });
        continue;
      }
      if (item.kind === 'name') {
        operands.push({ name: item.value });
        continue;
      }
      if (item.kind === 'number') {
        // Inside a TJ array a number is a kerning adjustment, not an operand.
        if (inArray) {
          if (item.number <= -120) operands.push({ text: ' ' });
        } else {
          operands.push(item.number);
        }
        continue;
      }
      if (item.kind === 'array-open') {
        inArray = true;
        continue;
      }
      if (item.kind === 'array-close') {
        inArray = false;
        continue;
      }

      const operator = item.value;
      switch (operator) {
        case 'Tf': {
          const fontName = operands.filter((o): o is { name: string } => typeof o === 'object' && 'name' in o).pop();
          const fontId = fontName ? fonts[fontName.name] : undefined;
          currentMap = fontId ? fontMaps.get(fontId) : undefined;
          // A font we cannot resolve on this page may still be the document's
          // only font; falling back to a lone CMap beats emitting glyph indices.
          if (!currentMap && fontMaps.size === 1) currentMap = [...fontMaps.values()][0];
          break;
        }
        case 'BT':
          lineX = 0;
          lineY = 0;
          break;
        case 'Tm': {
          // `a b c d e f Tm` — e and f are the translation.
          const [, , , , e, f] = numbers(6).length === 6 ? numbers(6) : [0, 0, 0, 0, lineX, lineY];
          lineX = e;
          lineY = f;
          break;
        }
        case 'Td': {
          const [tx, ty] = numbers(2);
          lineX += tx ?? 0;
          lineY += ty ?? 0;
          break;
        }
        case 'TD': {
          const [tx, ty] = numbers(2);
          lineX += tx ?? 0;
          lineY += ty ?? 0;
          leading = -(ty ?? 0);
          break;
        }
        case 'TL':
          leading = numbers(1)[0] ?? leading;
          break;
        case 'T*':
          lineY -= leading;
          break;
        case 'Tj':
        case 'TJ': {
          positionText();
          for (const operand of operands) {
            if (typeof operand === 'object' && 'text' in operand) out += operand.text;
          }
          break;
        }
        case "'":
        case '"': {
          lineY -= leading;
          positionText();
          for (const operand of operands) {
            if (typeof operand === 'object' && 'text' in operand) out += operand.text;
          }
          break;
        }
        default:
          break;
      }
      // Every operator consumes its operands, including the ones we ignore.
      operands.length = 0;
    }
    return out;
  }

  /**
   * Linear scanner over a content stream.
   *
   * Emits only the token kinds the text extractor cares about; comments,
   * dictionaries and inline images are skipped rather than modelled. Because it
   * never backtracks, a stream that is half binary costs the same as one that is
   * all text.
   */
  private *tokenize(content: string): Generator<ContentToken> {
    let i = 0;
    const length = content.length;

    while (i < length) {
      const char = content[i];

      // Whitespace
      if (char === ' ' || char === '\n' || char === '\r' || char === '\t' || char === '\f' || char === '\0') {
        i++;
        continue;
      }

      // Comment, to end of line
      if (char === '%') {
        while (i < length && content[i] !== '\n' && content[i] !== '\r') i++;
        continue;
      }

      // Literal string, with balanced-parenthesis nesting and escapes
      if (char === '(') {
        let depth = 1;
        let j = i + 1;
        const start = j;
        while (j < length && depth > 0) {
          const c = content[j];
          if (c === '\\') {
            j += 2;
            continue;
          }
          if (c === '(') depth++;
          else if (c === ')') depth--;
          j++;
        }
        yield { kind: 'string', literal: true, value: content.slice(start, Math.max(start, j - 1)) };
        i = j;
        continue;
      }

      // Hex string, or a dictionary delimiter
      if (char === '<') {
        if (content[i + 1] === '<') {
          // Dictionaries carry no showable text; skip the delimiter and let the
          // contents tokenize as ordinary names and numbers.
          i += 2;
          continue;
        }
        const close = content.indexOf('>', i + 1);
        if (close === -1) break;
        yield { kind: 'string', literal: false, value: content.slice(i + 1, close).replace(/[^0-9a-fA-F]/g, '') };
        i = close + 1;
        continue;
      }
      if (char === '>') {
        i += content[i + 1] === '>' ? 2 : 1;
        continue;
      }

      // Name
      if (char === '/') {
        let j = i + 1;
        while (j < length && /[^\s/()<>[\]{}%]/.test(content[j])) j++;
        yield { kind: 'name', value: content.slice(i + 1, j) };
        i = j;
        continue;
      }

      if (char === '[') {
        yield { kind: 'array-open' };
        i++;
        continue;
      }
      if (char === ']') {
        yield { kind: 'array-close' };
        i++;
        continue;
      }
      if (char === '{' || char === '}') {
        i++;
        continue;
      }

      // Number
      if (char === '+' || char === '-' || char === '.' || (char >= '0' && char <= '9')) {
        let j = i;
        if (content[j] === '+' || content[j] === '-') j++;
        while (j < length && ((content[j] >= '0' && content[j] <= '9') || content[j] === '.')) j++;
        const parsed = Number(content.slice(i, j));
        // A malformed numeric-looking run must still advance the cursor.
        if (Number.isFinite(parsed)) yield { kind: 'number', number: parsed };
        i = Math.max(j, i + 1);
        continue;
      }

      // Operator keyword
      let j = i;
      while (j < length && /[^\s/()<>[\]{}%]/.test(content[j])) j++;
      if (j === i) {
        i++;
        continue;
      }
      yield { kind: 'operator', value: content.slice(i, j) };
      i = j;
    }
  }

  private decodeStringToken(
    token: { literal: boolean; value: string },
    map?: Map<number, string>
  ): string {
    return token.literal
      ? this.decodeLiteralString(token.value, map)
      : this.decodeHexString(token.value, map);
  }

  /** Resolve the escape sequences PDF literal strings use, then map to Unicode. */
  private decodeLiteralString(source: string, map?: Map<number, string>): string {
    const bytes: number[] = [];
    for (let i = 0; i < source.length; i++) {
      const char = source[i];
      if (char !== '\\') {
        bytes.push(source.charCodeAt(i));
        continue;
      }
      const next = source[++i];
      switch (next) {
        case 'n': bytes.push(10); break;
        case 'r': bytes.push(13); break;
        case 't': bytes.push(9); break;
        case 'b': bytes.push(8); break;
        case 'f': bytes.push(12); break;
        case '\n': break; // a backslash-newline is a line continuation
        case '\r': if (source[i + 1] === '\n') i++; break;
        default:
          if (next >= '0' && next <= '7') {
            let octal = next;
            while (octal.length < 3 && source[i + 1] >= '0' && source[i + 1] <= '7') {
              octal += source[++i];
            }
            bytes.push(parseInt(octal, 8));
          } else if (next !== undefined) {
            bytes.push(next.charCodeAt(0));
          }
      }
    }
    return this.mapBytes(bytes, map);
  }

  private decodeHexString(hex: string, map?: Map<number, string>): string {
    const padded = hex.length % 2 ? `${hex}0` : hex;
    const bytes: number[] = [];
    for (let i = 0; i < padded.length; i += 2) bytes.push(parseInt(padded.slice(i, i + 2), 16));
    return this.mapBytes(bytes, map);
  }

  /**
   * Apply the font's CMap. Subset fonts are almost always two-byte encoded, so a
   * CMap whose keys exceed 0xFF is read as 16-bit; otherwise byte at a time,
   * falling back to Latin-1 where no CMap exists.
   */
  private mapBytes(bytes: number[], map?: Map<number, string>): string {
    if (!map || map.size === 0) {
      return bytes.map((b) => String.fromCharCode(b)).join('');
    }

    const twoByte = [...map.keys()].some((code) => code > 0xff);
    let out = '';
    if (twoByte) {
      for (let i = 0; i + 1 < bytes.length; i += 2) {
        const code = (bytes[i] << 8) | bytes[i + 1];
        out += map.get(code) ?? '';
      }
      // A trailing odd byte in a two-byte encoding is a malformed string; the
      // single-byte reading is the only sensible salvage.
      if (bytes.length % 2) out += map.get(bytes[bytes.length - 1]) ?? '';
      return out;
    }
    for (const byte of bytes) out += map.get(byte) ?? String.fromCharCode(byte);
    return out;
  }

  /** Collapse the ragged whitespace that per-line reassembly produces. */
  private tidy(text: string): string {
    return text
      .replace(/\r\n?/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/ ?\n ?/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/ /g, '')
      .trim();
  }
}
