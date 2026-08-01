/**
 * pdf-parse ships types only for its package root ('pdf-parse'), whose
 * index.js has a debug-mode bug under ESM (see src/pdf.ts). We import the
 * internal implementation directly instead, which has no bundled types.
 */
declare module 'pdf-parse/lib/pdf-parse.js' {
  import PdfParse = require('pdf-parse');
  export = PdfParse;
}
