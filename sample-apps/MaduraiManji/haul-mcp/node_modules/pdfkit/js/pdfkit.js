'use strict';

var stream = require('stream');
var zlib = require('zlib');
var utils = require('@noble/hashes/utils');
var md5 = require('js-md5');
var sha2 = require('@noble/hashes/sha2');
var aes = require('@noble/ciphers/aes');
var fs = require('fs');
var fontkit = require('fontkit');
var LineBreaker = require('linebreak');
var PNG = require('png-js');

class PDFAbstractReference {
  toString() {
    throw new Error('Must be implemented by subclasses');
  }
}

class PDFTree {
  constructor(options = {}) {
    this._items = {};
    this.limits = typeof options.limits === 'boolean' ? options.limits : true;
  }
  add(key, val) {
    return this._items[key] = val;
  }
  get(key) {
    return this._items[key];
  }
  toString() {
    const sortedKeys = Object.keys(this._items).sort((a, b) => this._compareKeys(a, b));
    const out = ['<<'];
    if (this.limits && sortedKeys.length > 1) {
      const first = sortedKeys[0],
        last = sortedKeys[sortedKeys.length - 1];
      out.push(`  /Limits ${PDFObject.convert([this._dataForKey(first), this._dataForKey(last)])}`);
    }
    out.push(`  /${this._keysName()} [`);
    for (let key of sortedKeys) {
      out.push(`    ${PDFObject.convert(this._dataForKey(key))} ${PDFObject.convert(this._items[key])}`);
    }
    out.push(']');
    out.push('>>');
    return out.join('\n');
  }
  _compareKeys() {
    throw new Error('Must be implemented by subclasses');
  }
  _keysName() {
    throw new Error('Must be implemented by subclasses');
  }
  _dataForKey() {
    throw new Error('Must be implemented by subclasses');
  }
}

class SpotColor {
  constructor(doc, name, C, M, Y, K) {
    this.id = 'CS' + Object.keys(doc.spotColors).length;
    this.name = name;
    this.values = [C, M, Y, K];
    this.ref = doc.ref(['Separation', escapeName(this.name), 'DeviceCMYK', {
      Range: [0, 1, 0, 1, 0, 1, 0, 1],
      C0: [0, 0, 0, 0],
      C1: this.values.map(value => value / 100),
      FunctionType: 2,
      Domain: [0, 1],
      N: 1
    }]);
    this.ref.end();
  }
  toString() {
    return `${this.ref.id} 0 R`;
  }
}

const pad = (str, length) => (Array(length + 1).join('0') + str).slice(-length);
const isSafeCharCode = code => {
  if (code > 0x7f) return true;
  return code > 0x20 && code !== 0x7f && code !== 0x23 && code !== 0x25 && code !== 0x28 && code !== 0x29 && code !== 0x2f && code !== 0x3c && code !== 0x3e && code !== 0x5b && code !== 0x5d && code !== 0x7b && code !== 0x7d;
};
const escapableRe = /[\n\r\t\b\f()\\]/g;
const escapable = {
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
  '\b': '\\b',
  '\f': '\\f',
  '\\': '\\\\',
  '(': '\\(',
  ')': '\\)'
};
const escapeName = function (name) {
  let escapedName = '';
  for (const char of name) {
    const code = char.charCodeAt(0);
    if (isSafeCharCode(code)) {
      escapedName += char;
    } else {
      escapedName += `#${code.toString(16).toUpperCase().padStart(2, '0')}`;
    }
  }
  return escapedName;
};
const swapBytes = function (buff) {
  const l = buff.length;
  if (l & 0x01) {
    throw new Error('Buffer length must be even');
  } else {
    for (let i = 0, end = l - 1; i < end; i += 2) {
      const a = buff[i];
      buff[i] = buff[i + 1];
      buff[i + 1] = a;
    }
  }
  return buff;
};
class PDFObject {
  static convert(object, encryptFn = null) {
    if (typeof object === 'string') {
      return `/${object}`;
    } else if (object instanceof String) {
      let string = object;
      let isUnicode = false;
      for (let i = 0, end = string.length; i < end; i++) {
        if (string.charCodeAt(i) > 0x7f) {
          isUnicode = true;
          break;
        }
      }
      let stringBuffer;
      if (isUnicode) {
        stringBuffer = swapBytes(Buffer.from(`\ufeff${string}`, 'utf16le'));
      } else {
        stringBuffer = Buffer.from(string.valueOf(), 'ascii');
      }
      if (encryptFn) {
        string = encryptFn(stringBuffer).toString('binary');
      } else {
        string = stringBuffer.toString('binary');
      }
      string = string.replace(escapableRe, c => escapable[c]);
      return `(${string})`;
    } else if (Buffer.isBuffer(object)) {
      return `<${object.toString('hex')}>`;
    } else if (object instanceof PDFAbstractReference || object instanceof PDFTree || object instanceof SpotColor) {
      return object.toString();
    } else if (object instanceof Date) {
      let string = `D:${pad(object.getUTCFullYear(), 4)}` + pad(object.getUTCMonth() + 1, 2) + pad(object.getUTCDate(), 2) + pad(object.getUTCHours(), 2) + pad(object.getUTCMinutes(), 2) + pad(object.getUTCSeconds(), 2) + 'Z';
      if (encryptFn) {
        string = encryptFn(Buffer.from(string, 'ascii')).toString('binary');
        string = string.replace(escapableRe, c => escapable[c]);
      }
      return `(${string})`;
    } else if (Array.isArray(object)) {
      const items = object.map(e => PDFObject.convert(e, encryptFn)).join(' ');
      return `[${items}]`;
    } else if ({}.toString.call(object) === '[object Object]') {
      const out = ['<<'];
      for (let key in object) {
        const val = object[key];
        out.push(`/${key} ${PDFObject.convert(val, encryptFn)}`);
      }
      out.push('>>');
      return out.join('\n');
    } else if (typeof object === 'number') {
      return PDFObject.number(object);
    } else {
      return `${object}`;
    }
  }
  static number(n) {
    if (n > -1e21 && n < 1e21) {
      return Math.round(n * 1e6) / 1e6;
    }
    throw new Error(`unsupported number: ${n}`);
  }
}

class PDFReference extends PDFAbstractReference {
  constructor(document, id, data = {}) {
    super();
    this.document = document;
    this.id = id;
    this.data = data;
    this.gen = 0;
    this.compress = this.document.compress && !this.data.Filter;
    this.uncompressedLength = 0;
    this.buffer = [];
  }
  write(chunk) {
    if (!(chunk instanceof Uint8Array)) {
      chunk = Buffer.from(chunk + '\n', 'binary');
    }
    this.uncompressedLength += chunk.length;
    if (this.data.Length == null) {
      this.data.Length = 0;
    }
    this.buffer.push(chunk);
    this.data.Length += chunk.length;
    if (this.compress) {
      this.data.Filter = 'FlateDecode';
    }
  }
  end(chunk) {
    if (chunk) {
      this.write(chunk);
    }
    this.finalize();
  }
  finalize() {
    this.offset = this.document._offset;
    const encryptFn = this.document._security ? this.document._security.getEncryptFn(this.id, this.gen) : null;
    if (this.buffer.length) {
      this.buffer = Buffer.concat(this.buffer);
      if (this.compress) {
        this.buffer = zlib.deflateSync(this.buffer);
      }
      if (encryptFn) {
        this.buffer = encryptFn(this.buffer);
      }
      this.data.Length = this.buffer.length;
    }
    this.document._write(`${this.id} ${this.gen} obj`);
    this.document._write(PDFObject.convert(this.data, encryptFn));
    if (this.buffer.length) {
      this.document._write('stream');
      this.document._write(this.buffer);
      this.buffer = [];
      this.document._write('\nendstream');
    }
    this.document._write('endobj');
    this.document._refEnd(this);
  }
  toString() {
    return `${this.id} ${this.gen} R`;
  }
}

const fArray = new Float32Array(1);
const uArray = new Uint32Array(fArray.buffer);
function PDFNumber(n) {
  const rounded = Math.fround(n);
  if (rounded <= n) return rounded;
  fArray[0] = n;
  if (n <= 0) {
    uArray[0] += 1;
  } else {
    uArray[0] -= 1;
  }
  return fArray[0];
}
function normalizeSides(sides, defaultDefinition = undefined, transformer = v => v) {
  if (sides == null || typeof sides === 'object' && Object.keys(sides).length === 0) {
    sides = defaultDefinition;
  }
  if (sides == null || typeof sides !== 'object') {
    sides = {
      top: sides,
      right: sides,
      bottom: sides,
      left: sides
    };
  } else if (Array.isArray(sides)) {
    if (sides.length === 2) {
      sides = {
        vertical: sides[0],
        horizontal: sides[1]
      };
    } else {
      sides = {
        top: sides[0],
        right: sides[1],
        bottom: sides[2],
        left: sides[3]
      };
    }
  }
  if ('vertical' in sides || 'horizontal' in sides) {
    sides = {
      top: sides.vertical,
      right: sides.horizontal,
      bottom: sides.vertical,
      left: sides.horizontal
    };
  }
  return {
    top: transformer(sides.top),
    right: transformer(sides.right),
    bottom: transformer(sides.bottom),
    left: transformer(sides.left)
  };
}
const MM_TO_CM = 1 / 10;
const CM_TO_IN = 1 / 2.54;
const PX_TO_IN = 1 / 96;
const IN_TO_PT = 72;
const PC_TO_PT = 12;
function cosine(a) {
  if (a === 0) return 1;
  if (a === 90) return 0;
  if (a === 180) return -1;
  if (a === 270) return 0;
  return Math.cos(a * Math.PI / 180);
}
function sine(a) {
  if (a === 0) return 0;
  if (a === 90) return 1;
  if (a === 180) return 0;
  if (a === 270) return -1;
  return Math.sin(a * Math.PI / 180);
}

const DEFAULT_MARGINS = {
  top: 72,
  left: 72,
  bottom: 72,
  right: 72
};
const SIZES = {
  '4A0': [4767.87, 6740.79],
  '2A0': [3370.39, 4767.87],
  A0: [2383.94, 3370.39],
  A1: [1683.78, 2383.94],
  A2: [1190.55, 1683.78],
  A3: [841.89, 1190.55],
  A4: [595.28, 841.89],
  A5: [419.53, 595.28],
  A6: [297.64, 419.53],
  A7: [209.76, 297.64],
  A8: [147.4, 209.76],
  A9: [104.88, 147.4],
  A10: [73.7, 104.88],
  B0: [2834.65, 4008.19],
  B1: [2004.09, 2834.65],
  B2: [1417.32, 2004.09],
  B3: [1000.63, 1417.32],
  B4: [708.66, 1000.63],
  B5: [498.9, 708.66],
  B6: [354.33, 498.9],
  B7: [249.45, 354.33],
  B8: [175.75, 249.45],
  B9: [124.72, 175.75],
  B10: [87.87, 124.72],
  C0: [2599.37, 3676.54],
  C1: [1836.85, 2599.37],
  C2: [1298.27, 1836.85],
  C3: [918.43, 1298.27],
  C4: [649.13, 918.43],
  C5: [459.21, 649.13],
  C6: [323.15, 459.21],
  C7: [229.61, 323.15],
  C8: [161.57, 229.61],
  C9: [113.39, 161.57],
  C10: [79.37, 113.39],
  RA0: [2437.8, 3458.27],
  RA1: [1729.13, 2437.8],
  RA2: [1218.9, 1729.13],
  RA3: [864.57, 1218.9],
  RA4: [609.45, 864.57],
  SRA0: [2551.18, 3628.35],
  SRA1: [1814.17, 2551.18],
  SRA2: [1275.59, 1814.17],
  SRA3: [907.09, 1275.59],
  SRA4: [637.8, 907.09],
  EXECUTIVE: [521.86, 756.0],
  FOLIO: [612.0, 936.0],
  LEGAL: [612.0, 1008.0],
  LETTER: [612.0, 792.0],
  TABLOID: [792.0, 1224.0]
};
class PDFPage {
  constructor(document, options = {}) {
    this.document = document;
    this._options = options;
    this.size = options.size || 'letter';
    this.layout = options.layout || 'portrait';
    this.userUnit = options.userUnit || 1.0;
    const dimensions = Array.isArray(this.size) ? this.size : SIZES[this.size.toUpperCase()];
    this.width = dimensions[this.layout === 'portrait' ? 0 : 1];
    this.height = dimensions[this.layout === 'portrait' ? 1 : 0];
    this.content = this.document.ref();
    if (options.font) document.font(options.font, options.fontFamily);
    if (options.fontSize) document.fontSize(options.fontSize);
    this.margins = normalizeSides(options.margin ?? options.margins, DEFAULT_MARGINS, x => document.sizeToPoint(x, 0, this));
    this.resources = this.document.ref({
      ProcSet: ['PDF', 'Text', 'ImageB', 'ImageC', 'ImageI']
    });
    this.dictionary = this.document.ref({
      Type: 'Page',
      Parent: this.document._root.data.Pages,
      MediaBox: [0, 0, this.width, this.height],
      Contents: this.content,
      Resources: this.resources,
      UserUnit: this.userUnit
    });
    this.markings = [];
  }
  get fonts() {
    const data = this.resources.data;
    return data.Font != null ? data.Font : data.Font = {};
  }
  get xobjects() {
    const data = this.resources.data;
    return data.XObject != null ? data.XObject : data.XObject = {};
  }
  get ext_gstates() {
    const data = this.resources.data;
    return data.ExtGState != null ? data.ExtGState : data.ExtGState = {};
  }
  get patterns() {
    const data = this.resources.data;
    return data.Pattern != null ? data.Pattern : data.Pattern = {};
  }
  get colorSpaces() {
    const data = this.resources.data;
    return data.ColorSpace || (data.ColorSpace = {});
  }
  get annotations() {
    const data = this.dictionary.data;
    return data.Annots != null ? data.Annots : data.Annots = [];
  }
  get structParentTreeKey() {
    const data = this.dictionary.data;
    return data.StructParents != null ? data.StructParents : data.StructParents = this.document.createStructParentTreeNextKey();
  }
  get contentWidth() {
    return this.width - this.margins.left - this.margins.right;
  }
  get contentHeight() {
    return this.height - this.margins.top - this.margins.bottom;
  }
  maxY() {
    return this.height - this.margins.bottom;
  }
  write(chunk) {
    return this.content.write(chunk);
  }
  _setTabOrder() {
    if (!this.dictionary.Tabs && this.document.hasMarkInfoDictionary()) {
      this.dictionary.data.Tabs = 'S';
    }
  }
  end() {
    this._setTabOrder();
    this.dictionary.end();
    this.resources.data.ColorSpace = this.resources.data.ColorSpace || {};
    for (let color of Object.values(this.document.spotColors)) {
      this.resources.data.ColorSpace[color.id] = color;
    }
    this.resources.end();
    return this.content.end();
  }
}

class PDFNameTree extends PDFTree {
  _compareKeys(a, b) {
    return a.localeCompare(b);
  }
  _keysName() {
    return 'Names';
  }
  _dataForKey(k) {
    return new String(k);
  }
}

function md5Hash(data) {
  return new Uint8Array(md5.arrayBuffer(data));
}
function md5Hex(data) {
  return md5(data);
}

function sha256Hash(data) {
  return sha2.sha256(data);
}

function aesCbcEncrypt(data, key, iv, padding = true) {
  return aes.cbc(key, iv, {
    disablePadding: !padding
  }).encrypt(data);
}
function aesEcbEncrypt(data, key) {
  return aes.ecb(key, {
    disablePadding: true
  }).encrypt(data);
}

function rc4(data, key) {
  const s = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    s[i] = i;
  }
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = j + s[i] + key[i % key.length] & 0xff;
    [s[i], s[j]] = [s[j], s[i]];
  }
  const output = new Uint8Array(data.length);
  for (let i = 0, j = 0, k = 0; k < data.length; k++) {
    i = i + 1 & 0xff;
    j = j + s[i] & 0xff;
    [s[i], s[j]] = [s[j], s[i]];
    output[k] = data[k] ^ s[s[i] + s[j] & 0xff];
  }
  return output;
}

function randomBytes(length) {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

function inRange(value, rangeGroup) {
  if (value < rangeGroup[0]) return false;
  let startRange = 0;
  let endRange = rangeGroup.length / 2;
  while (startRange <= endRange) {
    const middleRange = Math.floor((startRange + endRange) / 2);
    const arrayIndex = middleRange * 2;
    if (value >= rangeGroup[arrayIndex] && value <= rangeGroup[arrayIndex + 1]) {
      return true;
    }
    if (value > rangeGroup[arrayIndex + 1]) {
      startRange = middleRange + 1;
    } else {
      endRange = middleRange - 1;
    }
  }
  return false;
}

const unassigned_code_points = [0x0221, 0x0221, 0x0234, 0x024f, 0x02ae, 0x02af, 0x02ef, 0x02ff, 0x0350, 0x035f, 0x0370, 0x0373, 0x0376, 0x0379, 0x037b, 0x037d, 0x037f, 0x0383, 0x038b, 0x038b, 0x038d, 0x038d, 0x03a2, 0x03a2, 0x03cf, 0x03cf, 0x03f7, 0x03ff, 0x0487, 0x0487, 0x04cf, 0x04cf, 0x04f6, 0x04f7, 0x04fa, 0x04ff, 0x0510, 0x0530, 0x0557, 0x0558, 0x0560, 0x0560, 0x0588, 0x0588, 0x058b, 0x0590, 0x05a2, 0x05a2, 0x05ba, 0x05ba, 0x05c5, 0x05cf, 0x05eb, 0x05ef, 0x05f5, 0x060b, 0x060d, 0x061a, 0x061c, 0x061e, 0x0620, 0x0620, 0x063b, 0x063f, 0x0656, 0x065f, 0x06ee, 0x06ef, 0x06ff, 0x06ff, 0x070e, 0x070e, 0x072d, 0x072f, 0x074b, 0x077f, 0x07b2, 0x0900, 0x0904, 0x0904, 0x093a, 0x093b, 0x094e, 0x094f, 0x0955, 0x0957, 0x0971, 0x0980, 0x0984, 0x0984, 0x098d, 0x098e, 0x0991, 0x0992, 0x09a9, 0x09a9, 0x09b1, 0x09b1, 0x09b3, 0x09b5, 0x09ba, 0x09bb, 0x09bd, 0x09bd, 0x09c5, 0x09c6, 0x09c9, 0x09ca, 0x09ce, 0x09d6, 0x09d8, 0x09db, 0x09de, 0x09de, 0x09e4, 0x09e5, 0x09fb, 0x0a01, 0x0a03, 0x0a04, 0x0a0b, 0x0a0e, 0x0a11, 0x0a12, 0x0a29, 0x0a29, 0x0a31, 0x0a31, 0x0a34, 0x0a34, 0x0a37, 0x0a37, 0x0a3a, 0x0a3b, 0x0a3d, 0x0a3d, 0x0a43, 0x0a46, 0x0a49, 0x0a4a, 0x0a4e, 0x0a58, 0x0a5d, 0x0a5d, 0x0a5f, 0x0a65, 0x0a75, 0x0a80, 0x0a84, 0x0a84, 0x0a8c, 0x0a8c, 0x0a8e, 0x0a8e, 0x0a92, 0x0a92, 0x0aa9, 0x0aa9, 0x0ab1, 0x0ab1, 0x0ab4, 0x0ab4, 0x0aba, 0x0abb, 0x0ac6, 0x0ac6, 0x0aca, 0x0aca, 0x0ace, 0x0acf, 0x0ad1, 0x0adf, 0x0ae1, 0x0ae5, 0x0af0, 0x0b00, 0x0b04, 0x0b04, 0x0b0d, 0x0b0e, 0x0b11, 0x0b12, 0x0b29, 0x0b29, 0x0b31, 0x0b31, 0x0b34, 0x0b35, 0x0b3a, 0x0b3b, 0x0b44, 0x0b46, 0x0b49, 0x0b4a, 0x0b4e, 0x0b55, 0x0b58, 0x0b5b, 0x0b5e, 0x0b5e, 0x0b62, 0x0b65, 0x0b71, 0x0b81, 0x0b84, 0x0b84, 0x0b8b, 0x0b8d, 0x0b91, 0x0b91, 0x0b96, 0x0b98, 0x0b9b, 0x0b9b, 0x0b9d, 0x0b9d, 0x0ba0, 0x0ba2, 0x0ba5, 0x0ba7, 0x0bab, 0x0bad, 0x0bb6, 0x0bb6, 0x0bba, 0x0bbd, 0x0bc3, 0x0bc5, 0x0bc9, 0x0bc9, 0x0bce, 0x0bd6, 0x0bd8, 0x0be6, 0x0bf3, 0x0c00, 0x0c04, 0x0c04, 0x0c0d, 0x0c0d, 0x0c11, 0x0c11, 0x0c29, 0x0c29, 0x0c34, 0x0c34, 0x0c3a, 0x0c3d, 0x0c45, 0x0c45, 0x0c49, 0x0c49, 0x0c4e, 0x0c54, 0x0c57, 0x0c5f, 0x0c62, 0x0c65, 0x0c70, 0x0c81, 0x0c84, 0x0c84, 0x0c8d, 0x0c8d, 0x0c91, 0x0c91, 0x0ca9, 0x0ca9, 0x0cb4, 0x0cb4, 0x0cba, 0x0cbd, 0x0cc5, 0x0cc5, 0x0cc9, 0x0cc9, 0x0cce, 0x0cd4, 0x0cd7, 0x0cdd, 0x0cdf, 0x0cdf, 0x0ce2, 0x0ce5, 0x0cf0, 0x0d01, 0x0d04, 0x0d04, 0x0d0d, 0x0d0d, 0x0d11, 0x0d11, 0x0d29, 0x0d29, 0x0d3a, 0x0d3d, 0x0d44, 0x0d45, 0x0d49, 0x0d49, 0x0d4e, 0x0d56, 0x0d58, 0x0d5f, 0x0d62, 0x0d65, 0x0d70, 0x0d81, 0x0d84, 0x0d84, 0x0d97, 0x0d99, 0x0db2, 0x0db2, 0x0dbc, 0x0dbc, 0x0dbe, 0x0dbf, 0x0dc7, 0x0dc9, 0x0dcb, 0x0dce, 0x0dd5, 0x0dd5, 0x0dd7, 0x0dd7, 0x0de0, 0x0df1, 0x0df5, 0x0e00, 0x0e3b, 0x0e3e, 0x0e5c, 0x0e80, 0x0e83, 0x0e83, 0x0e85, 0x0e86, 0x0e89, 0x0e89, 0x0e8b, 0x0e8c, 0x0e8e, 0x0e93, 0x0e98, 0x0e98, 0x0ea0, 0x0ea0, 0x0ea4, 0x0ea4, 0x0ea6, 0x0ea6, 0x0ea8, 0x0ea9, 0x0eac, 0x0eac, 0x0eba, 0x0eba, 0x0ebe, 0x0ebf, 0x0ec5, 0x0ec5, 0x0ec7, 0x0ec7, 0x0ece, 0x0ecf, 0x0eda, 0x0edb, 0x0ede, 0x0eff, 0x0f48, 0x0f48, 0x0f6b, 0x0f70, 0x0f8c, 0x0f8f, 0x0f98, 0x0f98, 0x0fbd, 0x0fbd, 0x0fcd, 0x0fce, 0x0fd0, 0x0fff, 0x1022, 0x1022, 0x1028, 0x1028, 0x102b, 0x102b, 0x1033, 0x1035, 0x103a, 0x103f, 0x105a, 0x109f, 0x10c6, 0x10cf, 0x10f9, 0x10fa, 0x10fc, 0x10ff, 0x115a, 0x115e, 0x11a3, 0x11a7, 0x11fa, 0x11ff, 0x1207, 0x1207, 0x1247, 0x1247, 0x1249, 0x1249, 0x124e, 0x124f, 0x1257, 0x1257, 0x1259, 0x1259, 0x125e, 0x125f, 0x1287, 0x1287, 0x1289, 0x1289, 0x128e, 0x128f, 0x12af, 0x12af, 0x12b1, 0x12b1, 0x12b6, 0x12b7, 0x12bf, 0x12bf, 0x12c1, 0x12c1, 0x12c6, 0x12c7, 0x12cf, 0x12cf, 0x12d7, 0x12d7, 0x12ef, 0x12ef, 0x130f, 0x130f, 0x1311, 0x1311, 0x1316, 0x1317, 0x131f, 0x131f, 0x1347, 0x1347, 0x135b, 0x1360, 0x137d, 0x139f, 0x13f5, 0x1400, 0x1677, 0x167f, 0x169d, 0x169f, 0x16f1, 0x16ff, 0x170d, 0x170d, 0x1715, 0x171f, 0x1737, 0x173f, 0x1754, 0x175f, 0x176d, 0x176d, 0x1771, 0x1771, 0x1774, 0x177f, 0x17dd, 0x17df, 0x17ea, 0x17ff, 0x180f, 0x180f, 0x181a, 0x181f, 0x1878, 0x187f, 0x18aa, 0x1dff, 0x1e9c, 0x1e9f, 0x1efa, 0x1eff, 0x1f16, 0x1f17, 0x1f1e, 0x1f1f, 0x1f46, 0x1f47, 0x1f4e, 0x1f4f, 0x1f58, 0x1f58, 0x1f5a, 0x1f5a, 0x1f5c, 0x1f5c, 0x1f5e, 0x1f5e, 0x1f7e, 0x1f7f, 0x1fb5, 0x1fb5, 0x1fc5, 0x1fc5, 0x1fd4, 0x1fd5, 0x1fdc, 0x1fdc, 0x1ff0, 0x1ff1, 0x1ff5, 0x1ff5, 0x1fff, 0x1fff, 0x2053, 0x2056, 0x2058, 0x205e, 0x2064, 0x2069, 0x2072, 0x2073, 0x208f, 0x209f, 0x20b2, 0x20cf, 0x20eb, 0x20ff, 0x213b, 0x213c, 0x214c, 0x2152, 0x2184, 0x218f, 0x23cf, 0x23ff, 0x2427, 0x243f, 0x244b, 0x245f, 0x24ff, 0x24ff, 0x2614, 0x2615, 0x2618, 0x2618, 0x267e, 0x267f, 0x268a, 0x2700, 0x2705, 0x2705, 0x270a, 0x270b, 0x2728, 0x2728, 0x274c, 0x274c, 0x274e, 0x274e, 0x2753, 0x2755, 0x2757, 0x2757, 0x275f, 0x2760, 0x2795, 0x2797, 0x27b0, 0x27b0, 0x27bf, 0x27cf, 0x27ec, 0x27ef, 0x2b00, 0x2e7f, 0x2e9a, 0x2e9a, 0x2ef4, 0x2eff, 0x2fd6, 0x2fef, 0x2ffc, 0x2fff, 0x3040, 0x3040, 0x3097, 0x3098, 0x3100, 0x3104, 0x312d, 0x3130, 0x318f, 0x318f, 0x31b8, 0x31ef, 0x321d, 0x321f, 0x3244, 0x3250, 0x327c, 0x327e, 0x32cc, 0x32cf, 0x32ff, 0x32ff, 0x3377, 0x337a, 0x33de, 0x33df, 0x33ff, 0x33ff, 0x4db6, 0x4dff, 0x9fa6, 0x9fff, 0xa48d, 0xa48f, 0xa4c7, 0xabff, 0xd7a4, 0xd7ff, 0xfa2e, 0xfa2f, 0xfa6b, 0xfaff, 0xfb07, 0xfb12, 0xfb18, 0xfb1c, 0xfb37, 0xfb37, 0xfb3d, 0xfb3d, 0xfb3f, 0xfb3f, 0xfb42, 0xfb42, 0xfb45, 0xfb45, 0xfbb2, 0xfbd2, 0xfd40, 0xfd4f, 0xfd90, 0xfd91, 0xfdc8, 0xfdcf, 0xfdfd, 0xfdff, 0xfe10, 0xfe1f, 0xfe24, 0xfe2f, 0xfe47, 0xfe48, 0xfe53, 0xfe53, 0xfe67, 0xfe67, 0xfe6c, 0xfe6f, 0xfe75, 0xfe75, 0xfefd, 0xfefe, 0xff00, 0xff00, 0xffbf, 0xffc1, 0xffc8, 0xffc9, 0xffd0, 0xffd1, 0xffd8, 0xffd9, 0xffdd, 0xffdf, 0xffe7, 0xffe7, 0xffef, 0xfff8, 0x10000, 0x102ff, 0x1031f, 0x1031f, 0x10324, 0x1032f, 0x1034b, 0x103ff, 0x10426, 0x10427, 0x1044e, 0x1cfff, 0x1d0f6, 0x1d0ff, 0x1d127, 0x1d129, 0x1d1de, 0x1d3ff, 0x1d455, 0x1d455, 0x1d49d, 0x1d49d, 0x1d4a0, 0x1d4a1, 0x1d4a3, 0x1d4a4, 0x1d4a7, 0x1d4a8, 0x1d4ad, 0x1d4ad, 0x1d4ba, 0x1d4ba, 0x1d4bc, 0x1d4bc, 0x1d4c1, 0x1d4c1, 0x1d4c4, 0x1d4c4, 0x1d506, 0x1d506, 0x1d50b, 0x1d50c, 0x1d515, 0x1d515, 0x1d51d, 0x1d51d, 0x1d53a, 0x1d53a, 0x1d53f, 0x1d53f, 0x1d545, 0x1d545, 0x1d547, 0x1d549, 0x1d551, 0x1d551, 0x1d6a4, 0x1d6a7, 0x1d7ca, 0x1d7cd, 0x1d800, 0x1fffd, 0x2a6d7, 0x2f7ff, 0x2fa1e, 0x2fffd, 0x30000, 0x3fffd, 0x40000, 0x4fffd, 0x50000, 0x5fffd, 0x60000, 0x6fffd, 0x70000, 0x7fffd, 0x80000, 0x8fffd, 0x90000, 0x9fffd, 0xa0000, 0xafffd, 0xb0000, 0xbfffd, 0xc0000, 0xcfffd, 0xd0000, 0xdfffd, 0xe0000, 0xe0000, 0xe0002, 0xe001f, 0xe0080, 0xefffd];
const isUnassignedCodePoint = character => inRange(character, unassigned_code_points);
const commonly_mapped_to_nothing = [0x00ad, 0x00ad, 0x034f, 0x034f, 0x1806, 0x1806, 0x180b, 0x180b, 0x180c, 0x180c, 0x180d, 0x180d, 0x200b, 0x200b, 0x200c, 0x200c, 0x200d, 0x200d, 0x2060, 0x2060, 0xfe00, 0xfe00, 0xfe01, 0xfe01, 0xfe02, 0xfe02, 0xfe03, 0xfe03, 0xfe04, 0xfe04, 0xfe05, 0xfe05, 0xfe06, 0xfe06, 0xfe07, 0xfe07, 0xfe08, 0xfe08, 0xfe09, 0xfe09, 0xfe0a, 0xfe0a, 0xfe0b, 0xfe0b, 0xfe0c, 0xfe0c, 0xfe0d, 0xfe0d, 0xfe0e, 0xfe0e, 0xfe0f, 0xfe0f, 0xfeff, 0xfeff];
const isCommonlyMappedToNothing = character => inRange(character, commonly_mapped_to_nothing);
const non_ASCII_space_characters = [0x00a0, 0x00a0, 0x1680, 0x1680, 0x2000, 0x2000, 0x2001, 0x2001, 0x2002, 0x2002, 0x2003, 0x2003, 0x2004, 0x2004, 0x2005, 0x2005, 0x2006, 0x2006, 0x2007, 0x2007, 0x2008, 0x2008, 0x2009, 0x2009, 0x200a, 0x200a, 0x200b, 0x200b, 0x202f, 0x202f, 0x205f, 0x205f, 0x3000, 0x3000];
const isNonASCIISpaceCharacter = character => inRange(character, non_ASCII_space_characters);
const non_ASCII_controls_characters = [0x0080, 0x009f, 0x06dd, 0x06dd, 0x070f, 0x070f, 0x180e, 0x180e, 0x200c, 0x200c, 0x200d, 0x200d, 0x2028, 0x2028, 0x2029, 0x2029, 0x2060, 0x2060, 0x2061, 0x2061, 0x2062, 0x2062, 0x2063, 0x2063, 0x206a, 0x206f, 0xfeff, 0xfeff, 0xfff9, 0xfffc, 0x1d173, 0x1d17a];
const non_character_codepoints = [0xfdd0, 0xfdef, 0xfffe, 0xffff, 0x1fffe, 0x1ffff, 0x2fffe, 0x2ffff, 0x3fffe, 0x3ffff, 0x4fffe, 0x4ffff, 0x5fffe, 0x5ffff, 0x6fffe, 0x6ffff, 0x7fffe, 0x7ffff, 0x8fffe, 0x8ffff, 0x9fffe, 0x9ffff, 0xafffe, 0xaffff, 0xbfffe, 0xbffff, 0xcfffe, 0xcffff, 0xdfffe, 0xdffff, 0xefffe, 0xeffff, 0x10fffe, 0x10ffff];
const prohibited_characters = [0, 0x001f, 0x007f, 0x007f, 0x0340, 0x0340, 0x0341, 0x0341, 0x200e, 0x200e, 0x200f, 0x200f, 0x202a, 0x202a, 0x202b, 0x202b, 0x202c, 0x202c, 0x202d, 0x202d, 0x202e, 0x202e, 0x206a, 0x206a, 0x206b, 0x206b, 0x206c, 0x206c, 0x206d, 0x206d, 0x206e, 0x206e, 0x206f, 0x206f, 0x2ff0, 0x2ffb, 0xd800, 0xdfff, 0xe000, 0xf8ff, 0xfff9, 0xfff9, 0xfffa, 0xfffa, 0xfffb, 0xfffb, 0xfffc, 0xfffc, 0xfffd, 0xfffd, 0xe0001, 0xe0001, 0xe0020, 0xe007f, 0xf0000, 0xffffd, 0x100000, 0x10fffd];
const isProhibitedCharacter = character => inRange(character, non_ASCII_space_characters) || inRange(character, prohibited_characters) || inRange(character, non_ASCII_controls_characters) || inRange(character, non_character_codepoints);
const bidirectional_r_al = [0x05be, 0x05be, 0x05c0, 0x05c0, 0x05c3, 0x05c3, 0x05d0, 0x05ea, 0x05f0, 0x05f4, 0x061b, 0x061b, 0x061f, 0x061f, 0x0621, 0x063a, 0x0640, 0x064a, 0x066d, 0x066f, 0x0671, 0x06d5, 0x06dd, 0x06dd, 0x06e5, 0x06e6, 0x06fa, 0x06fe, 0x0700, 0x070d, 0x0710, 0x0710, 0x0712, 0x072c, 0x0780, 0x07a5, 0x07b1, 0x07b1, 0x200f, 0x200f, 0xfb1d, 0xfb1d, 0xfb1f, 0xfb28, 0xfb2a, 0xfb36, 0xfb38, 0xfb3c, 0xfb3e, 0xfb3e, 0xfb40, 0xfb41, 0xfb43, 0xfb44, 0xfb46, 0xfbb1, 0xfbd3, 0xfd3d, 0xfd50, 0xfd8f, 0xfd92, 0xfdc7, 0xfdf0, 0xfdfc, 0xfe70, 0xfe74, 0xfe76, 0xfefc];
const isBidirectionalRAL = character => inRange(character, bidirectional_r_al);
const bidirectional_l = [0x0041, 0x005a, 0x0061, 0x007a, 0x00aa, 0x00aa, 0x00b5, 0x00b5, 0x00ba, 0x00ba, 0x00c0, 0x00d6, 0x00d8, 0x00f6, 0x00f8, 0x0220, 0x0222, 0x0233, 0x0250, 0x02ad, 0x02b0, 0x02b8, 0x02bb, 0x02c1, 0x02d0, 0x02d1, 0x02e0, 0x02e4, 0x02ee, 0x02ee, 0x037a, 0x037a, 0x0386, 0x0386, 0x0388, 0x038a, 0x038c, 0x038c, 0x038e, 0x03a1, 0x03a3, 0x03ce, 0x03d0, 0x03f5, 0x0400, 0x0482, 0x048a, 0x04ce, 0x04d0, 0x04f5, 0x04f8, 0x04f9, 0x0500, 0x050f, 0x0531, 0x0556, 0x0559, 0x055f, 0x0561, 0x0587, 0x0589, 0x0589, 0x0903, 0x0903, 0x0905, 0x0939, 0x093d, 0x0940, 0x0949, 0x094c, 0x0950, 0x0950, 0x0958, 0x0961, 0x0964, 0x0970, 0x0982, 0x0983, 0x0985, 0x098c, 0x098f, 0x0990, 0x0993, 0x09a8, 0x09aa, 0x09b0, 0x09b2, 0x09b2, 0x09b6, 0x09b9, 0x09be, 0x09c0, 0x09c7, 0x09c8, 0x09cb, 0x09cc, 0x09d7, 0x09d7, 0x09dc, 0x09dd, 0x09df, 0x09e1, 0x09e6, 0x09f1, 0x09f4, 0x09fa, 0x0a05, 0x0a0a, 0x0a0f, 0x0a10, 0x0a13, 0x0a28, 0x0a2a, 0x0a30, 0x0a32, 0x0a33, 0x0a35, 0x0a36, 0x0a38, 0x0a39, 0x0a3e, 0x0a40, 0x0a59, 0x0a5c, 0x0a5e, 0x0a5e, 0x0a66, 0x0a6f, 0x0a72, 0x0a74, 0x0a83, 0x0a83, 0x0a85, 0x0a8b, 0x0a8d, 0x0a8d, 0x0a8f, 0x0a91, 0x0a93, 0x0aa8, 0x0aaa, 0x0ab0, 0x0ab2, 0x0ab3, 0x0ab5, 0x0ab9, 0x0abd, 0x0ac0, 0x0ac9, 0x0ac9, 0x0acb, 0x0acc, 0x0ad0, 0x0ad0, 0x0ae0, 0x0ae0, 0x0ae6, 0x0aef, 0x0b02, 0x0b03, 0x0b05, 0x0b0c, 0x0b0f, 0x0b10, 0x0b13, 0x0b28, 0x0b2a, 0x0b30, 0x0b32, 0x0b33, 0x0b36, 0x0b39, 0x0b3d, 0x0b3e, 0x0b40, 0x0b40, 0x0b47, 0x0b48, 0x0b4b, 0x0b4c, 0x0b57, 0x0b57, 0x0b5c, 0x0b5d, 0x0b5f, 0x0b61, 0x0b66, 0x0b70, 0x0b83, 0x0b83, 0x0b85, 0x0b8a, 0x0b8e, 0x0b90, 0x0b92, 0x0b95, 0x0b99, 0x0b9a, 0x0b9c, 0x0b9c, 0x0b9e, 0x0b9f, 0x0ba3, 0x0ba4, 0x0ba8, 0x0baa, 0x0bae, 0x0bb5, 0x0bb7, 0x0bb9, 0x0bbe, 0x0bbf, 0x0bc1, 0x0bc2, 0x0bc6, 0x0bc8, 0x0bca, 0x0bcc, 0x0bd7, 0x0bd7, 0x0be7, 0x0bf2, 0x0c01, 0x0c03, 0x0c05, 0x0c0c, 0x0c0e, 0x0c10, 0x0c12, 0x0c28, 0x0c2a, 0x0c33, 0x0c35, 0x0c39, 0x0c41, 0x0c44, 0x0c60, 0x0c61, 0x0c66, 0x0c6f, 0x0c82, 0x0c83, 0x0c85, 0x0c8c, 0x0c8e, 0x0c90, 0x0c92, 0x0ca8, 0x0caa, 0x0cb3, 0x0cb5, 0x0cb9, 0x0cbe, 0x0cbe, 0x0cc0, 0x0cc4, 0x0cc7, 0x0cc8, 0x0cca, 0x0ccb, 0x0cd5, 0x0cd6, 0x0cde, 0x0cde, 0x0ce0, 0x0ce1, 0x0ce6, 0x0cef, 0x0d02, 0x0d03, 0x0d05, 0x0d0c, 0x0d0e, 0x0d10, 0x0d12, 0x0d28, 0x0d2a, 0x0d39, 0x0d3e, 0x0d40, 0x0d46, 0x0d48, 0x0d4a, 0x0d4c, 0x0d57, 0x0d57, 0x0d60, 0x0d61, 0x0d66, 0x0d6f, 0x0d82, 0x0d83, 0x0d85, 0x0d96, 0x0d9a, 0x0db1, 0x0db3, 0x0dbb, 0x0dbd, 0x0dbd, 0x0dc0, 0x0dc6, 0x0dcf, 0x0dd1, 0x0dd8, 0x0ddf, 0x0df2, 0x0df4, 0x0e01, 0x0e30, 0x0e32, 0x0e33, 0x0e40, 0x0e46, 0x0e4f, 0x0e5b, 0x0e81, 0x0e82, 0x0e84, 0x0e84, 0x0e87, 0x0e88, 0x0e8a, 0x0e8a, 0x0e8d, 0x0e8d, 0x0e94, 0x0e97, 0x0e99, 0x0e9f, 0x0ea1, 0x0ea3, 0x0ea5, 0x0ea5, 0x0ea7, 0x0ea7, 0x0eaa, 0x0eab, 0x0ead, 0x0eb0, 0x0eb2, 0x0eb3, 0x0ebd, 0x0ebd, 0x0ec0, 0x0ec4, 0x0ec6, 0x0ec6, 0x0ed0, 0x0ed9, 0x0edc, 0x0edd, 0x0f00, 0x0f17, 0x0f1a, 0x0f34, 0x0f36, 0x0f36, 0x0f38, 0x0f38, 0x0f3e, 0x0f47, 0x0f49, 0x0f6a, 0x0f7f, 0x0f7f, 0x0f85, 0x0f85, 0x0f88, 0x0f8b, 0x0fbe, 0x0fc5, 0x0fc7, 0x0fcc, 0x0fcf, 0x0fcf, 0x1000, 0x1021, 0x1023, 0x1027, 0x1029, 0x102a, 0x102c, 0x102c, 0x1031, 0x1031, 0x1038, 0x1038, 0x1040, 0x1057, 0x10a0, 0x10c5, 0x10d0, 0x10f8, 0x10fb, 0x10fb, 0x1100, 0x1159, 0x115f, 0x11a2, 0x11a8, 0x11f9, 0x1200, 0x1206, 0x1208, 0x1246, 0x1248, 0x1248, 0x124a, 0x124d, 0x1250, 0x1256, 0x1258, 0x1258, 0x125a, 0x125d, 0x1260, 0x1286, 0x1288, 0x1288, 0x128a, 0x128d, 0x1290, 0x12ae, 0x12b0, 0x12b0, 0x12b2, 0x12b5, 0x12b8, 0x12be, 0x12c0, 0x12c0, 0x12c2, 0x12c5, 0x12c8, 0x12ce, 0x12d0, 0x12d6, 0x12d8, 0x12ee, 0x12f0, 0x130e, 0x1310, 0x1310, 0x1312, 0x1315, 0x1318, 0x131e, 0x1320, 0x1346, 0x1348, 0x135a, 0x1361, 0x137c, 0x13a0, 0x13f4, 0x1401, 0x1676, 0x1681, 0x169a, 0x16a0, 0x16f0, 0x1700, 0x170c, 0x170e, 0x1711, 0x1720, 0x1731, 0x1735, 0x1736, 0x1740, 0x1751, 0x1760, 0x176c, 0x176e, 0x1770, 0x1780, 0x17b6, 0x17be, 0x17c5, 0x17c7, 0x17c8, 0x17d4, 0x17da, 0x17dc, 0x17dc, 0x17e0, 0x17e9, 0x1810, 0x1819, 0x1820, 0x1877, 0x1880, 0x18a8, 0x1e00, 0x1e9b, 0x1ea0, 0x1ef9, 0x1f00, 0x1f15, 0x1f18, 0x1f1d, 0x1f20, 0x1f45, 0x1f48, 0x1f4d, 0x1f50, 0x1f57, 0x1f59, 0x1f59, 0x1f5b, 0x1f5b, 0x1f5d, 0x1f5d, 0x1f5f, 0x1f7d, 0x1f80, 0x1fb4, 0x1fb6, 0x1fbc, 0x1fbe, 0x1fbe, 0x1fc2, 0x1fc4, 0x1fc6, 0x1fcc, 0x1fd0, 0x1fd3, 0x1fd6, 0x1fdb, 0x1fe0, 0x1fec, 0x1ff2, 0x1ff4, 0x1ff6, 0x1ffc, 0x200e, 0x200e, 0x2071, 0x2071, 0x207f, 0x207f, 0x2102, 0x2102, 0x2107, 0x2107, 0x210a, 0x2113, 0x2115, 0x2115, 0x2119, 0x211d, 0x2124, 0x2124, 0x2126, 0x2126, 0x2128, 0x2128, 0x212a, 0x212d, 0x212f, 0x2131, 0x2133, 0x2139, 0x213d, 0x213f, 0x2145, 0x2149, 0x2160, 0x2183, 0x2336, 0x237a, 0x2395, 0x2395, 0x249c, 0x24e9, 0x3005, 0x3007, 0x3021, 0x3029, 0x3031, 0x3035, 0x3038, 0x303c, 0x3041, 0x3096, 0x309d, 0x309f, 0x30a1, 0x30fa, 0x30fc, 0x30ff, 0x3105, 0x312c, 0x3131, 0x318e, 0x3190, 0x31b7, 0x31f0, 0x321c, 0x3220, 0x3243, 0x3260, 0x327b, 0x327f, 0x32b0, 0x32c0, 0x32cb, 0x32d0, 0x32fe, 0x3300, 0x3376, 0x337b, 0x33dd, 0x33e0, 0x33fe, 0x3400, 0x4db5, 0x4e00, 0x9fa5, 0xa000, 0xa48c, 0xac00, 0xd7a3, 0xd800, 0xfa2d, 0xfa30, 0xfa6a, 0xfb00, 0xfb06, 0xfb13, 0xfb17, 0xff21, 0xff3a, 0xff41, 0xff5a, 0xff66, 0xffbe, 0xffc2, 0xffc7, 0xffca, 0xffcf, 0xffd2, 0xffd7, 0xffda, 0xffdc, 0x10300, 0x1031e, 0x10320, 0x10323, 0x10330, 0x1034a, 0x10400, 0x10425, 0x10428, 0x1044d, 0x1d000, 0x1d0f5, 0x1d100, 0x1d126, 0x1d12a, 0x1d166, 0x1d16a, 0x1d172, 0x1d183, 0x1d184, 0x1d18c, 0x1d1a9, 0x1d1ae, 0x1d1dd, 0x1d400, 0x1d454, 0x1d456, 0x1d49c, 0x1d49e, 0x1d49f, 0x1d4a2, 0x1d4a2, 0x1d4a5, 0x1d4a6, 0x1d4a9, 0x1d4ac, 0x1d4ae, 0x1d4b9, 0x1d4bb, 0x1d4bb, 0x1d4bd, 0x1d4c0, 0x1d4c2, 0x1d4c3, 0x1d4c5, 0x1d505, 0x1d507, 0x1d50a, 0x1d50d, 0x1d514, 0x1d516, 0x1d51c, 0x1d51e, 0x1d539, 0x1d53b, 0x1d53e, 0x1d540, 0x1d544, 0x1d546, 0x1d546, 0x1d54a, 0x1d550, 0x1d552, 0x1d6a3, 0x1d6a8, 0x1d7c9, 0x20000, 0x2a6d6, 0x2f800, 0x2fa1d, 0xf0000, 0xffffd, 0x100000, 0x10fffd];
const isBidirectionalL = character => inRange(character, bidirectional_l);

const mapping2space = isNonASCIISpaceCharacter;
const mapping2nothing = isCommonlyMappedToNothing;
const getCodePoint = character => character.codePointAt(0);
const first = x => x[0];
const last = x => x[x.length - 1];
function toCodePoints(input) {
  const codepoints = [];
  const size = input.length;
  for (let i = 0; i < size; i += 1) {
    const before = input.charCodeAt(i);
    if (before >= 0xd800 && before <= 0xdbff && size > i + 1) {
      const next = input.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        codepoints.push((before - 0xd800) * 0x400 + next - 0xdc00 + 0x10000);
        i += 1;
        continue;
      }
    }
    codepoints.push(before);
  }
  return codepoints;
}
function saslprep(input, opts = {}) {
  if (typeof input !== 'string') {
    throw new TypeError('Expected string.');
  }
  if (input.length === 0) {
    return '';
  }
  const mapped_input = toCodePoints(input).map(character => mapping2space(character) ? 0x20 : character).filter(character => !mapping2nothing(character));
  const normalized_input = String.fromCodePoint.apply(null, mapped_input).normalize('NFKC');
  const normalized_map = toCodePoints(normalized_input);
  const hasProhibited = normalized_map.some(isProhibitedCharacter);
  if (hasProhibited) {
    throw new Error('Prohibited character, see https://tools.ietf.org/html/rfc4013#section-2.3');
  }
  if (opts.allowUnassigned !== true) {
    const hasUnassigned = normalized_map.some(isUnassignedCodePoint);
    if (hasUnassigned) {
      throw new Error('Unassigned code point, see https://tools.ietf.org/html/rfc4013#section-2.5');
    }
  }
  const hasBidiRAL = normalized_map.some(isBidirectionalRAL);
  const hasBidiL = normalized_map.some(isBidirectionalL);
  if (hasBidiRAL && hasBidiL) {
    throw new Error('String must not contain RandALCat and LCat at the same time,' + ' see https://tools.ietf.org/html/rfc3454#section-6');
  }
  const isFirstBidiRAL = isBidirectionalRAL(getCodePoint(first(normalized_input)));
  const isLastBidiRAL = isBidirectionalRAL(getCodePoint(last(normalized_input)));
  if (hasBidiRAL && !(isFirstBidiRAL && isLastBidiRAL)) {
    throw new Error('Bidirectional RandALCat character must be the first and the last' + ' character of the string, see https://tools.ietf.org/html/rfc3454#section-6');
  }
  return normalized_input;
}

class PDFSecurity {
  static generateFileID(info = {}) {
    let infoStr = `${info.CreationDate.getTime()}\n`;
    for (let key in info) {
      if (!info.hasOwnProperty(key)) {
        continue;
      }
      infoStr += `${key}: ${info[key].valueOf()}\n`;
    }
    return Buffer.from(md5Hash(infoStr));
  }
  static generateRandomWordArray(bytes) {
    return randomBytes(bytes);
  }
  static create(document, options = {}) {
    if (!options.ownerPassword && !options.userPassword) {
      return null;
    }
    return new PDFSecurity(document, options);
  }
  constructor(document, options = {}) {
    if (!options.ownerPassword && !options.userPassword) {
      throw new Error('None of owner password and user password is defined.');
    }
    this.document = document;
    this._setupEncryption(options);
  }
  _setupEncryption(options) {
    switch (options.pdfVersion) {
      case '1.4':
      case '1.5':
        this.version = 2;
        break;
      case '1.6':
      case '1.7':
        this.version = 4;
        break;
      case '1.7ext3':
        this.version = 5;
        break;
      default:
        this.version = 1;
        break;
    }
    const encDict = {
      Filter: 'Standard'
    };
    switch (this.version) {
      case 1:
      case 2:
      case 4:
        this._setupEncryptionV1V2V4(this.version, encDict, options);
        break;
      case 5:
        this._setupEncryptionV5(encDict, options);
        break;
    }
    this.dictionary = this.document.ref(encDict);
  }
  _setupEncryptionV1V2V4(v, encDict, options) {
    let r, permissions;
    switch (v) {
      case 1:
        r = 2;
        this.keyBits = 40;
        permissions = getPermissionsR2(options.permissions);
        break;
      case 2:
        r = 3;
        this.keyBits = 128;
        permissions = getPermissionsR3(options.permissions);
        break;
      case 4:
        r = 4;
        this.keyBits = 128;
        permissions = getPermissionsR3(options.permissions);
        break;
    }
    const paddedUserPassword = processPasswordR2R3R4(options.userPassword);
    const paddedOwnerPassword = options.ownerPassword ? processPasswordR2R3R4(options.ownerPassword) : paddedUserPassword;
    const ownerPasswordEntry = getOwnerPasswordR2R3R4(r, this.keyBits, paddedUserPassword, paddedOwnerPassword);
    this.encryptionKey = getEncryptionKeyR2R3R4(r, this.keyBits, this.document._id, paddedUserPassword, ownerPasswordEntry, permissions);
    let userPasswordEntry;
    if (r === 2) {
      userPasswordEntry = getUserPasswordR2(this.encryptionKey);
    } else {
      userPasswordEntry = getUserPasswordR3R4(this.document._id, this.encryptionKey);
    }
    encDict.V = v;
    if (v >= 2) {
      encDict.Length = this.keyBits;
    }
    if (v === 4) {
      encDict.CF = {
        StdCF: {
          AuthEvent: 'DocOpen',
          CFM: 'AESV2',
          Length: this.keyBits / 8
        }
      };
      encDict.StmF = 'StdCF';
      encDict.StrF = 'StdCF';
    }
    encDict.R = r;
    encDict.O = Buffer.from(ownerPasswordEntry);
    encDict.U = Buffer.from(userPasswordEntry);
    encDict.P = permissions;
  }
  _setupEncryptionV5(encDict, options) {
    this.keyBits = 256;
    const permissions = getPermissionsR3(options.permissions);
    const processedUserPassword = processPasswordR5(options.userPassword);
    const processedOwnerPassword = options.ownerPassword ? processPasswordR5(options.ownerPassword) : processedUserPassword;
    this.encryptionKey = getEncryptionKeyR5(PDFSecurity.generateRandomWordArray);
    const userPasswordEntry = getUserPasswordR5(processedUserPassword, PDFSecurity.generateRandomWordArray);
    const userKeySalt = userPasswordEntry.slice(40, 48);
    const userEncryptionKeyEntry = getUserEncryptionKeyR5(processedUserPassword, userKeySalt, this.encryptionKey);
    const ownerPasswordEntry = getOwnerPasswordR5(processedOwnerPassword, userPasswordEntry, PDFSecurity.generateRandomWordArray);
    const ownerKeySalt = ownerPasswordEntry.slice(40, 48);
    const ownerEncryptionKeyEntry = getOwnerEncryptionKeyR5(processedOwnerPassword, ownerKeySalt, userPasswordEntry, this.encryptionKey);
    const permsEntry = getEncryptedPermissionsR5(permissions, this.encryptionKey, PDFSecurity.generateRandomWordArray);
    encDict.V = 5;
    encDict.Length = this.keyBits;
    encDict.CF = {
      StdCF: {
        AuthEvent: 'DocOpen',
        CFM: 'AESV3',
        Length: this.keyBits / 8
      }
    };
    encDict.StmF = 'StdCF';
    encDict.StrF = 'StdCF';
    encDict.R = 5;
    encDict.O = Buffer.from(ownerPasswordEntry);
    encDict.OE = Buffer.from(ownerEncryptionKeyEntry);
    encDict.U = Buffer.from(userPasswordEntry);
    encDict.UE = Buffer.from(userEncryptionKeyEntry);
    encDict.P = permissions;
    encDict.Perms = Buffer.from(permsEntry);
  }
  getEncryptFn(obj, gen) {
    let digest;
    if (this.version < 5) {
      const suffix = new Uint8Array([obj & 0xff, obj >> 8 & 0xff, obj >> 16 & 0xff, gen & 0xff, gen >> 8 & 0xff]);
      digest = utils.concatBytes(this.encryptionKey, suffix);
    }
    if (this.version === 1 || this.version === 2) {
      let key = md5Hash(digest);
      const keyLen = Math.min(16, this.keyBits / 8 + 5);
      key = key.slice(0, keyLen);
      return buffer => Buffer.from(rc4(new Uint8Array(buffer), key));
    }
    let key;
    if (this.version === 4) {
      const saltMarker = new Uint8Array([0x73, 0x41, 0x6c, 0x54]);
      key = md5Hash(utils.concatBytes(digest, saltMarker));
    } else {
      key = this.encryptionKey;
    }
    const iv = PDFSecurity.generateRandomWordArray(16);
    return buffer => {
      const encrypted = aesCbcEncrypt(new Uint8Array(buffer), key, iv, true);
      return Buffer.from(utils.concatBytes(iv, encrypted));
    };
  }
  end() {
    this.dictionary.end();
  }
}
function getPermissionsR2(permissionObject = {}) {
  let permissions = 0xffffffc0 >> 0;
  if (permissionObject.printing) {
    permissions |= 0b000000000100;
  }
  if (permissionObject.modifying) {
    permissions |= 0b000000001000;
  }
  if (permissionObject.copying) {
    permissions |= 0b000000010000;
  }
  if (permissionObject.annotating) {
    permissions |= 0b000000100000;
  }
  return permissions;
}
function getPermissionsR3(permissionObject = {}) {
  let permissions = 0xfffff0c0 >> 0;
  if (permissionObject.printing === 'lowResolution') {
    permissions |= 0b000000000100;
  }
  if (permissionObject.printing === 'highResolution') {
    permissions |= 0b100000000100;
  }
  if (permissionObject.modifying) {
    permissions |= 0b000000001000;
  }
  if (permissionObject.copying) {
    permissions |= 0b000000010000;
  }
  if (permissionObject.annotating) {
    permissions |= 0b000000100000;
  }
  if (permissionObject.fillingForms) {
    permissions |= 0b000100000000;
  }
  if (permissionObject.contentAccessibility) {
    permissions |= 0b001000000000;
  }
  if (permissionObject.documentAssembly) {
    permissions |= 0b010000000000;
  }
  return permissions;
}
function getUserPasswordR2(encryptionKey) {
  return rc4(processPasswordR2R3R4(), encryptionKey);
}
function getUserPasswordR3R4(documentId, encryptionKey) {
  const key = encryptionKey.slice();
  let cipher = md5Hash(utils.concatBytes(processPasswordR2R3R4(), new Uint8Array(documentId)));
  for (let i = 0; i < 20; i++) {
    const xorKey = new Uint8Array(key.length);
    for (let j = 0; j < key.length; j++) {
      xorKey[j] = encryptionKey[j] ^ i;
    }
    cipher = rc4(cipher, xorKey);
  }
  const result = new Uint8Array(32);
  result.set(cipher);
  return result;
}
function getOwnerPasswordR2R3R4(r, keyBits, paddedUserPassword, paddedOwnerPassword) {
  let digest = paddedOwnerPassword;
  let round = r >= 3 ? 51 : 1;
  for (let i = 0; i < round; i++) {
    digest = md5Hash(digest);
  }
  const keyLen = keyBits / 8;
  let key = digest.slice(0, keyLen);
  let cipher = paddedUserPassword;
  round = r >= 3 ? 20 : 1;
  for (let i = 0; i < round; i++) {
    const xorKey = new Uint8Array(keyLen);
    for (let j = 0; j < keyLen; j++) {
      xorKey[j] = key[j] ^ i;
    }
    cipher = rc4(cipher, xorKey);
  }
  return cipher;
}
function getEncryptionKeyR2R3R4(r, keyBits, documentId, paddedUserPassword, ownerPasswordEntry, permissions) {
  const permBytes = new Uint8Array([permissions & 0xff, permissions >> 8 & 0xff, permissions >> 16 & 0xff, permissions >> 24 & 0xff]);
  let key = utils.concatBytes(paddedUserPassword, ownerPasswordEntry, permBytes, new Uint8Array(documentId));
  const round = r >= 3 ? 51 : 1;
  const keyLen = keyBits / 8;
  for (let i = 0; i < round; i++) {
    key = md5Hash(key);
    key = key.slice(0, keyLen);
  }
  return key;
}
function getUserPasswordR5(processedUserPassword, generateRandomWordArray) {
  const validationSalt = generateRandomWordArray(8);
  const keySalt = generateRandomWordArray(8);
  const hash = sha256Hash(utils.concatBytes(processedUserPassword, validationSalt));
  return utils.concatBytes(hash, validationSalt, keySalt);
}
function getUserEncryptionKeyR5(processedUserPassword, userKeySalt, encryptionKey) {
  const key = sha256Hash(utils.concatBytes(processedUserPassword, userKeySalt));
  const iv = new Uint8Array(16);
  return aesCbcEncrypt(encryptionKey, key, iv, false);
}
function getOwnerPasswordR5(processedOwnerPassword, userPasswordEntry, generateRandomWordArray) {
  const validationSalt = generateRandomWordArray(8);
  const keySalt = generateRandomWordArray(8);
  const hash = sha256Hash(utils.concatBytes(processedOwnerPassword, validationSalt, userPasswordEntry));
  return utils.concatBytes(hash, validationSalt, keySalt);
}
function getOwnerEncryptionKeyR5(processedOwnerPassword, ownerKeySalt, userPasswordEntry, encryptionKey) {
  const key = sha256Hash(utils.concatBytes(processedOwnerPassword, ownerKeySalt, userPasswordEntry));
  const iv = new Uint8Array(16);
  return aesCbcEncrypt(encryptionKey, key, iv, false);
}
function getEncryptionKeyR5(generateRandomWordArray) {
  return generateRandomWordArray(32);
}
function getEncryptedPermissionsR5(permissions, encryptionKey, generateRandomWordArray) {
  const data = new Uint8Array(16);
  data[0] = permissions & 0xff;
  data[1] = permissions >> 8 & 0xff;
  data[2] = permissions >> 16 & 0xff;
  data[3] = permissions >> 24 & 0xff;
  data[4] = 0xff;
  data[5] = 0xff;
  data[6] = 0xff;
  data[7] = 0xff;
  data[8] = 0x54;
  data[9] = 0x61;
  data[10] = 0x64;
  data[11] = 0x62;
  const randomPart = generateRandomWordArray(4);
  data.set(randomPart, 12);
  return aesEcbEncrypt(data, encryptionKey);
}
function processPasswordR2R3R4(password = '') {
  const out = new Uint8Array(32);
  const length = password.length;
  let index = 0;
  while (index < length && index < 32) {
    const code = password.charCodeAt(index);
    if (code > 0xff) {
      throw new Error('Password contains one or more invalid characters.');
    }
    out[index] = code;
    index++;
  }
  while (index < 32) {
    out[index] = PASSWORD_PADDING[index - length];
    index++;
  }
  return out;
}
function processPasswordR5(password = '') {
  password = unescape(encodeURIComponent(saslprep(password)));
  const length = Math.min(127, password.length);
  const out = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    out[i] = password.charCodeAt(i);
  }
  return out;
}
const PASSWORD_PADDING = [0x28, 0xbf, 0x4e, 0x5e, 0x4e, 0x75, 0x8a, 0x41, 0x64, 0x00, 0x4e, 0x56, 0xff, 0xfa, 0x01, 0x08, 0x2e, 0x2e, 0x00, 0xb6, 0xd0, 0x68, 0x3e, 0x80, 0x2f, 0x0c, 0xa9, 0xfe, 0x64, 0x53, 0x69, 0x7a];

const {
  number: number$2
} = PDFObject;
let PDFGradient$1 = class PDFGradient {
  constructor(doc) {
    this.doc = doc;
    this.stops = [];
    this.embedded = false;
    this.transform = [1, 0, 0, 1, 0, 0];
  }
  stop(pos, color, opacity) {
    if (opacity == null) {
      opacity = 1;
    }
    color = this.doc._normalizeColor(color);
    if (this.stops.length === 0) {
      if (color.length === 3) {
        this._colorSpace = 'DeviceRGB';
      } else if (color.length === 4) {
        this._colorSpace = 'DeviceCMYK';
      } else if (color.length === 1) {
        this._colorSpace = 'DeviceGray';
      } else {
        throw new Error('Unknown color space');
      }
    } else if (this._colorSpace === 'DeviceRGB' && color.length !== 3 || this._colorSpace === 'DeviceCMYK' && color.length !== 4 || this._colorSpace === 'DeviceGray' && color.length !== 1) {
      throw new Error('All gradient stops must use the same color space');
    }
    opacity = Math.max(0, Math.min(1, opacity));
    this.stops.push([pos, color, opacity]);
    return this;
  }
  setTransform(m11, m12, m21, m22, dx, dy) {
    this.transform = [m11, m12, m21, m22, dx, dy];
    return this;
  }
  embed(m) {
    let fn;
    const stopsLength = this.stops.length;
    if (stopsLength === 0) {
      return;
    }
    this.embedded = true;
    this.matrix = m;
    const last = this.stops[stopsLength - 1];
    if (last[0] < 1) {
      this.stops.push([1, last[1], last[2]]);
    }
    const bounds = [];
    const encode = [];
    const stops = [];
    for (let i = 0; i < stopsLength - 1; i++) {
      encode.push(0, 1);
      if (i + 2 !== stopsLength) {
        bounds.push(this.stops[i + 1][0]);
      }
      fn = this.doc.ref({
        FunctionType: 2,
        Domain: [0, 1],
        C0: this.stops[i + 0][1],
        C1: this.stops[i + 1][1],
        N: 1
      });
      stops.push(fn);
      fn.end();
    }
    if (stopsLength === 1) {
      fn = stops[0];
    } else {
      fn = this.doc.ref({
        FunctionType: 3,
        Domain: [0, 1],
        Functions: stops,
        Bounds: bounds,
        Encode: encode
      });
      fn.end();
    }
    this.id = `Sh${++this.doc._gradCount}`;
    const shader = this.shader(fn);
    shader.end();
    const pattern = this.doc.ref({
      Type: 'Pattern',
      PatternType: 2,
      Shading: shader,
      Matrix: this.matrix.map(number$2)
    });
    pattern.end();
    if (this.stops.some(stop => stop[2] < 1)) {
      let grad = this.opacityGradient();
      grad._colorSpace = 'DeviceGray';
      for (let stop of this.stops) {
        grad.stop(stop[0], [stop[2]]);
      }
      grad = grad.embed(this.matrix);
      const pageBBox = [0, 0, this.doc.page.width, this.doc.page.height];
      const form = this.doc.ref({
        Type: 'XObject',
        Subtype: 'Form',
        FormType: 1,
        BBox: pageBBox,
        Group: {
          Type: 'Group',
          S: 'Transparency',
          CS: 'DeviceGray'
        },
        Resources: {
          ProcSet: ['PDF', 'Text', 'ImageB', 'ImageC', 'ImageI'],
          Pattern: {
            Sh1: grad
          }
        }
      });
      form.write('/Pattern cs /Sh1 scn');
      form.end(`${pageBBox.join(' ')} re f`);
      const gstate = this.doc.ref({
        Type: 'ExtGState',
        SMask: {
          Type: 'Mask',
          S: 'Luminosity',
          G: form
        }
      });
      gstate.end();
      const opacityPattern = this.doc.ref({
        Type: 'Pattern',
        PatternType: 1,
        PaintType: 1,
        TilingType: 2,
        BBox: pageBBox,
        XStep: pageBBox[2],
        YStep: pageBBox[3],
        Resources: {
          ProcSet: ['PDF', 'Text', 'ImageB', 'ImageC', 'ImageI'],
          Pattern: {
            Sh1: pattern
          },
          ExtGState: {
            Gs1: gstate
          }
        }
      });
      opacityPattern.write('/Gs1 gs /Pattern cs /Sh1 scn');
      opacityPattern.end(`${pageBBox.join(' ')} re f`);
      this.doc.page.patterns[this.id] = opacityPattern;
    } else {
      this.doc.page.patterns[this.id] = pattern;
    }
    return pattern;
  }
  apply(stroke) {
    const [m0, m1, m2, m3, m4, m5] = this.doc._ctm;
    const [m11, m12, m21, m22, dx, dy] = this.transform;
    const m = [m0 * m11 + m2 * m12, m1 * m11 + m3 * m12, m0 * m21 + m2 * m22, m1 * m21 + m3 * m22, m0 * dx + m2 * dy + m4, m1 * dx + m3 * dy + m5];
    if (!this.embedded || m.join(' ') !== this.matrix.join(' ')) {
      this.embed(m);
    }
    this.doc._setColorSpace('Pattern', stroke);
    const op = stroke ? 'SCN' : 'scn';
    return this.doc.addContent(`/${this.id} ${op}`);
  }
};
let PDFLinearGradient$1 = class PDFLinearGradient extends PDFGradient$1 {
  constructor(doc, x1, y1, x2, y2) {
    super(doc);
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
  }
  shader(fn) {
    return this.doc.ref({
      ShadingType: 2,
      ColorSpace: this._colorSpace,
      Coords: [this.x1, this.y1, this.x2, this.y2],
      Function: fn,
      Extend: [true, true]
    });
  }
  opacityGradient() {
    return new PDFLinearGradient(this.doc, this.x1, this.y1, this.x2, this.y2);
  }
};
let PDFRadialGradient$1 = class PDFRadialGradient extends PDFGradient$1 {
  constructor(doc, x1, y1, r1, x2, y2, r2) {
    super(doc);
    this.doc = doc;
    this.x1 = x1;
    this.y1 = y1;
    this.r1 = r1;
    this.x2 = x2;
    this.y2 = y2;
    this.r2 = r2;
  }
  shader(fn) {
    return this.doc.ref({
      ShadingType: 3,
      ColorSpace: this._colorSpace,
      Coords: [this.x1, this.y1, this.r1, this.x2, this.y2, this.r2],
      Function: fn,
      Extend: [true, true]
    });
  }
  opacityGradient() {
    return new PDFRadialGradient(this.doc, this.x1, this.y1, this.r1, this.x2, this.y2, this.r2);
  }
};
var Gradient = {
  PDFGradient: PDFGradient$1,
  PDFLinearGradient: PDFLinearGradient$1,
  PDFRadialGradient: PDFRadialGradient$1
};

const underlyingColorSpaces = ['DeviceCMYK', 'DeviceRGB'];
let PDFTilingPattern$1 = class PDFTilingPattern {
  constructor(doc, bBox, xStep, yStep, stream) {
    this.doc = doc;
    this.bBox = bBox;
    this.xStep = xStep;
    this.yStep = yStep;
    this.stream = stream;
  }
  createPattern() {
    const resources = this.doc.ref();
    resources.end();
    const [m0, m1, m2, m3, m4, m5] = this.doc._ctm;
    const [m11, m12, m21, m22, dx, dy] = [1, 0, 0, 1, 0, 0];
    const m = [m0 * m11 + m2 * m12, m1 * m11 + m3 * m12, m0 * m21 + m2 * m22, m1 * m21 + m3 * m22, m0 * dx + m2 * dy + m4, m1 * dx + m3 * dy + m5];
    const pattern = this.doc.ref({
      Type: 'Pattern',
      PatternType: 1,
      PaintType: 2,
      TilingType: 2,
      BBox: this.bBox,
      XStep: this.xStep,
      YStep: this.yStep,
      Matrix: m.map(v => +v.toFixed(5)),
      Resources: resources
    });
    pattern.end(this.stream);
    return pattern;
  }
  embedPatternColorSpaces() {
    underlyingColorSpaces.forEach(csName => {
      const csId = this.getPatternColorSpaceId(csName);
      if (this.doc.page.colorSpaces[csId]) return;
      const cs = this.doc.ref(['Pattern', csName]);
      cs.end();
      this.doc.page.colorSpaces[csId] = cs;
    });
  }
  getPatternColorSpaceId(underlyingColorspace) {
    return `CsP${underlyingColorspace}`;
  }
  embed() {
    if (!this.id) {
      this.doc._patternCount = this.doc._patternCount + 1;
      this.id = 'P' + this.doc._patternCount;
      this.pattern = this.createPattern();
    }
    if (!this.doc.page.patterns[this.id]) {
      this.doc.page.patterns[this.id] = this.pattern;
    }
  }
  apply(stroke, patternColor) {
    this.embedPatternColorSpaces();
    this.embed();
    const normalizedColor = this.doc._normalizeColor(patternColor);
    if (!normalizedColor) throw Error(`invalid pattern color. (value: ${patternColor})`);
    const csId = this.getPatternColorSpaceId(this.doc._getColorSpace(normalizedColor));
    this.doc._setColorSpace(csId, stroke);
    const op = stroke ? 'SCN' : 'scn';
    return this.doc.addContent(`${normalizedColor.join(' ')} /${this.id} ${op}`);
  }
};
var pattern = {
  PDFTilingPattern: PDFTilingPattern$1
};

const {
  PDFGradient,
  PDFLinearGradient,
  PDFRadialGradient
} = Gradient;
const {
  PDFTilingPattern
} = pattern;
var ColorMixin = {
  initColor() {
    this.spotColors = {};
    this._opacityRegistry = {};
    this._opacityCount = 0;
    this._patternCount = 0;
    this._gradCount = 0;
  },
  _normalizeColor(color) {
    if (typeof color === 'string') {
      if (color.charAt(0) === '#') {
        if (color.length === 4) {
          color = color.replace(/#([0-9A-F])([0-9A-F])([0-9A-F])/i, '#$1$1$2$2$3$3');
        }
        const hex = parseInt(color.slice(1), 16);
        color = [hex >> 16, hex >> 8 & 0xff, hex & 0xff];
      } else if (namedColors[color]) {
        color = namedColors[color];
      } else if (this.spotColors[color]) {
        return this.spotColors[color];
      }
    }
    if (Array.isArray(color)) {
      if (color.length === 3) {
        color = color.map(part => part / 255);
      } else if (color.length === 4) {
        color = color.map(part => part / 100);
      }
      return color;
    }
    return null;
  },
  _setColor(color, stroke) {
    if (color instanceof PDFGradient) {
      color.apply(stroke);
      return true;
    } else if (Array.isArray(color) && color[0] instanceof PDFTilingPattern) {
      color[0].apply(stroke, color[1]);
      return true;
    }
    return this._setColorCore(color, stroke);
  },
  _setColorCore(color, stroke) {
    color = this._normalizeColor(color);
    if (!color) {
      return false;
    }
    const op = stroke ? 'SCN' : 'scn';
    const space = this._getColorSpace(color);
    this._setColorSpace(space, stroke);
    if (color instanceof SpotColor) {
      this.page.colorSpaces[color.id] = color.ref;
      this.addContent(`1 ${op}`);
    } else {
      this.addContent(`${color.join(' ')} ${op}`);
    }
    return true;
  },
  _setColorSpace(space, stroke) {
    const op = stroke ? 'CS' : 'cs';
    return this.addContent(`/${space} ${op}`);
  },
  _getColorSpace(color) {
    if (color instanceof SpotColor) {
      return color.id;
    }
    return color.length === 4 ? 'DeviceCMYK' : 'DeviceRGB';
  },
  fillColor(color, opacity) {
    const set = this._setColor(color, false);
    if (set) {
      this.fillOpacity(opacity);
    }
    this._fillColor = [color, opacity];
    return this;
  },
  strokeColor(color, opacity) {
    const set = this._setColor(color, true);
    if (set) {
      this.strokeOpacity(opacity);
    }
    return this;
  },
  opacity(opacity) {
    this._doOpacity(opacity, opacity);
    return this;
  },
  fillOpacity(opacity) {
    this._doOpacity(opacity, null);
    return this;
  },
  strokeOpacity(opacity) {
    this._doOpacity(null, opacity);
    return this;
  },
  _doOpacity(fillOpacity, strokeOpacity) {
    let dictionary, name;
    if (fillOpacity == null && strokeOpacity == null) {
      return;
    }
    if (fillOpacity != null) {
      fillOpacity = Math.max(0, Math.min(1, fillOpacity));
    }
    if (strokeOpacity != null) {
      strokeOpacity = Math.max(0, Math.min(1, strokeOpacity));
    }
    const key = `${fillOpacity}_${strokeOpacity}`;
    if (this._opacityRegistry[key]) {
      [dictionary, name] = this._opacityRegistry[key];
    } else {
      dictionary = {
        Type: 'ExtGState'
      };
      if (fillOpacity != null) {
        dictionary.ca = fillOpacity;
      }
      if (strokeOpacity != null) {
        dictionary.CA = strokeOpacity;
      }
      dictionary = this.ref(dictionary);
      dictionary.end();
      const id = ++this._opacityCount;
      name = `Gs${id}`;
      this._opacityRegistry[key] = [dictionary, name];
    }
    this.page.ext_gstates[name] = dictionary;
    return this.addContent(`/${name} gs`);
  },
  linearGradient(x1, y1, x2, y2) {
    return new PDFLinearGradient(this, x1, y1, x2, y2);
  },
  radialGradient(x1, y1, r1, x2, y2, r2) {
    return new PDFRadialGradient(this, x1, y1, r1, x2, y2, r2);
  },
  pattern(bbox, xStep, yStep, stream) {
    return new PDFTilingPattern(this, bbox, xStep, yStep, stream);
  },
  addSpotColor(name, C, M, Y, K) {
    const color = new SpotColor(this, name, C, M, Y, K);
    this.spotColors[name] = color;
    return this;
  }
};
var namedColors = {
  aliceblue: [240, 248, 255],
  antiquewhite: [250, 235, 215],
  aqua: [0, 255, 255],
  aquamarine: [127, 255, 212],
  azure: [240, 255, 255],
  beige: [245, 245, 220],
  bisque: [255, 228, 196],
  black: [0, 0, 0],
  blanchedalmond: [255, 235, 205],
  blue: [0, 0, 255],
  blueviolet: [138, 43, 226],
  brown: [165, 42, 42],
  burlywood: [222, 184, 135],
  cadetblue: [95, 158, 160],
  chartreuse: [127, 255, 0],
  chocolate: [210, 105, 30],
  coral: [255, 127, 80],
  cornflowerblue: [100, 149, 237],
  cornsilk: [255, 248, 220],
  crimson: [220, 20, 60],
  cyan: [0, 255, 255],
  darkblue: [0, 0, 139],
  darkcyan: [0, 139, 139],
  darkgoldenrod: [184, 134, 11],
  darkgray: [169, 169, 169],
  darkgreen: [0, 100, 0],
  darkgrey: [169, 169, 169],
  darkkhaki: [189, 183, 107],
  darkmagenta: [139, 0, 139],
  darkolivegreen: [85, 107, 47],
  darkorange: [255, 140, 0],
  darkorchid: [153, 50, 204],
  darkred: [139, 0, 0],
  darksalmon: [233, 150, 122],
  darkseagreen: [143, 188, 143],
  darkslateblue: [72, 61, 139],
  darkslategray: [47, 79, 79],
  darkslategrey: [47, 79, 79],
  darkturquoise: [0, 206, 209],
  darkviolet: [148, 0, 211],
  deeppink: [255, 20, 147],
  deepskyblue: [0, 191, 255],
  dimgray: [105, 105, 105],
  dimgrey: [105, 105, 105],
  dodgerblue: [30, 144, 255],
  firebrick: [178, 34, 34],
  floralwhite: [255, 250, 240],
  forestgreen: [34, 139, 34],
  fuchsia: [255, 0, 255],
  gainsboro: [220, 220, 220],
  ghostwhite: [248, 248, 255],
  gold: [255, 215, 0],
  goldenrod: [218, 165, 32],
  gray: [128, 128, 128],
  grey: [128, 128, 128],
  green: [0, 128, 0],
  greenyellow: [173, 255, 47],
  honeydew: [240, 255, 240],
  hotpink: [255, 105, 180],
  indianred: [205, 92, 92],
  indigo: [75, 0, 130],
  ivory: [255, 255, 240],
  khaki: [240, 230, 140],
  lavender: [230, 230, 250],
  lavenderblush: [255, 240, 245],
  lawngreen: [124, 252, 0],
  lemonchiffon: [255, 250, 205],
  lightblue: [173, 216, 230],
  lightcoral: [240, 128, 128],
  lightcyan: [224, 255, 255],
  lightgoldenrodyellow: [250, 250, 210],
  lightgray: [211, 211, 211],
  lightgreen: [144, 238, 144],
  lightgrey: [211, 211, 211],
  lightpink: [255, 182, 193],
  lightsalmon: [255, 160, 122],
  lightseagreen: [32, 178, 170],
  lightskyblue: [135, 206, 250],
  lightslategray: [119, 136, 153],
  lightslategrey: [119, 136, 153],
  lightsteelblue: [176, 196, 222],
  lightyellow: [255, 255, 224],
  lime: [0, 255, 0],
  limegreen: [50, 205, 50],
  linen: [250, 240, 230],
  magenta: [255, 0, 255],
  maroon: [128, 0, 0],
  mediumaquamarine: [102, 205, 170],
  mediumblue: [0, 0, 205],
  mediumorchid: [186, 85, 211],
  mediumpurple: [147, 112, 219],
  mediumseagreen: [60, 179, 113],
  mediumslateblue: [123, 104, 238],
  mediumspringgreen: [0, 250, 154],
  mediumturquoise: [72, 209, 204],
  mediumvioletred: [199, 21, 133],
  midnightblue: [25, 25, 112],
  mintcream: [245, 255, 250],
  mistyrose: [255, 228, 225],
  moccasin: [255, 228, 181],
  navajowhite: [255, 222, 173],
  navy: [0, 0, 128],
  oldlace: [253, 245, 230],
  olive: [128, 128, 0],
  olivedrab: [107, 142, 35],
  orange: [255, 165, 0],
  orangered: [255, 69, 0],
  orchid: [218, 112, 214],
  palegoldenrod: [238, 232, 170],
  palegreen: [152, 251, 152],
  paleturquoise: [175, 238, 238],
  palevioletred: [219, 112, 147],
  papayawhip: [255, 239, 213],
  peachpuff: [255, 218, 185],
  peru: [205, 133, 63],
  pink: [255, 192, 203],
  plum: [221, 160, 221],
  powderblue: [176, 224, 230],
  purple: [128, 0, 128],
  red: [255, 0, 0],
  rosybrown: [188, 143, 143],
  royalblue: [65, 105, 225],
  saddlebrown: [139, 69, 19],
  salmon: [250, 128, 114],
  sandybrown: [244, 164, 96],
  seagreen: [46, 139, 87],
  seashell: [255, 245, 238],
  sienna: [160, 82, 45],
  silver: [192, 192, 192],
  skyblue: [135, 206, 235],
  slateblue: [106, 90, 205],
  slategray: [112, 128, 144],
  slategrey: [112, 128, 144],
  snow: [255, 250, 250],
  springgreen: [0, 255, 127],
  steelblue: [70, 130, 180],
  tan: [210, 180, 140],
  teal: [0, 128, 128],
  thistle: [216, 191, 216],
  tomato: [255, 99, 71],
  turquoise: [64, 224, 208],
  violet: [238, 130, 238],
  wheat: [245, 222, 179],
  white: [255, 255, 255],
  whitesmoke: [245, 245, 245],
  yellow: [255, 255, 0],
  yellowgreen: [154, 205, 50]
};

let cx, cy, px, py, sx, sy;
cx = cy = px = py = sx = sy = 0;
const parameters = {
  A: 7,
  a: 7,
  C: 6,
  c: 6,
  H: 1,
  h: 1,
  L: 2,
  l: 2,
  M: 2,
  m: 2,
  Q: 4,
  q: 4,
  S: 4,
  s: 4,
  T: 2,
  t: 2,
  V: 1,
  v: 1,
  Z: 0,
  z: 0
};
const isCommand = function (c) {
  return c in parameters;
};
const isWsp = function (c) {
  const codePoint = c.codePointAt(0);
  return codePoint === 0x20 || codePoint === 0x9 || codePoint === 0xd || codePoint === 0xa;
};
const isDigit = function (c) {
  const codePoint = c.codePointAt(0);
  if (codePoint == null) {
    return false;
  }
  return 48 <= codePoint && codePoint <= 57;
};
const readNumber = function (string, cursor) {
  let i = cursor;
  let value = '';
  let state = 'none';
  for (; i < string.length; i += 1) {
    const c = string[i];
    if (c === '+' || c === '-') {
      if (state === 'none') {
        state = 'sign';
        value += c;
        continue;
      }
      if (state === 'e') {
        state = 'exponent_sign';
        value += c;
        continue;
      }
    }
    if (isDigit(c)) {
      if (state === 'none' || state === 'sign' || state === 'whole') {
        state = 'whole';
        value += c;
        continue;
      }
      if (state === 'decimal_point' || state === 'decimal') {
        state = 'decimal';
        value += c;
        continue;
      }
      if (state === 'e' || state === 'exponent_sign' || state === 'exponent') {
        state = 'exponent';
        value += c;
        continue;
      }
    }
    if (c === '.') {
      if (state === 'none' || state === 'sign' || state === 'whole') {
        state = 'decimal_point';
        value += c;
        continue;
      }
    }
    if (c === 'E' || c === 'e') {
      if (state === 'whole' || state === 'decimal_point' || state === 'decimal') {
        state = 'e';
        value += c;
        continue;
      }
    }
    break;
  }
  const number = Number.parseFloat(value);
  if (Number.isNaN(number)) {
    return [cursor, null];
  }
  return [i - 1, number];
};
const parse = function (path) {
  const pathData = [];
  let command = null;
  let args = [];
  let argsCount = 0;
  let canHaveComma = false;
  let hadComma = false;
  for (let i = 0; i < path.length; i += 1) {
    const c = path.charAt(i);
    if (isWsp(c)) {
      continue;
    }
    if (canHaveComma && c === ',') {
      if (hadComma) {
        break;
      }
      hadComma = true;
      continue;
    }
    if (isCommand(c)) {
      if (hadComma) {
        return pathData;
      }
      if (command == null) {
        if (c !== 'M' && c !== 'm') {
          return pathData;
        }
      } else {
        if (args.length !== 0) {
          return pathData;
        }
      }
      command = c;
      args = [];
      argsCount = parameters[command];
      canHaveComma = false;
      if (argsCount === 0) {
        pathData.push({
          command,
          args
        });
      }
      continue;
    }
    if (command == null) {
      return pathData;
    }
    let newCursor = i;
    let number = null;
    if (command === 'A' || command === 'a') {
      const position = args.length;
      if (position === 0 || position === 1) {
        if (c !== '+' && c !== '-') {
          [newCursor, number] = readNumber(path, i);
        }
      }
      if (position === 2 || position === 5 || position === 6) {
        [newCursor, number] = readNumber(path, i);
      }
      if (position === 3 || position === 4) {
        if (c === '0') {
          number = 0;
        }
        if (c === '1') {
          number = 1;
        }
      }
    } else {
      [newCursor, number] = readNumber(path, i);
    }
    if (number == null) {
      return pathData;
    }
    args.push(number);
    canHaveComma = true;
    hadComma = false;
    i = newCursor;
    if (args.length === argsCount) {
      pathData.push({
        command,
        args
      });
      if (command === 'M') {
        command = 'L';
      }
      if (command === 'm') {
        command = 'l';
      }
      args = [];
    }
  }
  return pathData;
};
const apply = function (commands, doc) {
  cx = cy = px = py = sx = sy = 0;
  for (let i = 0; i < commands.length; i++) {
    const c = commands[i];
    if (typeof runners[c.command] === 'function') {
      runners[c.command](doc, c.args);
    }
  }
};
const runners = {
  M(doc, a) {
    cx = a[0];
    cy = a[1];
    px = py = null;
    sx = cx;
    sy = cy;
    return doc.moveTo(cx, cy);
  },
  m(doc, a) {
    cx += a[0];
    cy += a[1];
    px = py = null;
    sx = cx;
    sy = cy;
    return doc.moveTo(cx, cy);
  },
  C(doc, a) {
    cx = a[4];
    cy = a[5];
    px = a[2];
    py = a[3];
    return doc.bezierCurveTo(...a);
  },
  c(doc, a) {
    doc.bezierCurveTo(a[0] + cx, a[1] + cy, a[2] + cx, a[3] + cy, a[4] + cx, a[5] + cy);
    px = cx + a[2];
    py = cy + a[3];
    cx += a[4];
    return cy += a[5];
  },
  S(doc, a) {
    if (px === null) {
      px = cx;
      py = cy;
    }
    doc.bezierCurveTo(cx - (px - cx), cy - (py - cy), a[0], a[1], a[2], a[3]);
    px = a[0];
    py = a[1];
    cx = a[2];
    return cy = a[3];
  },
  s(doc, a) {
    if (px === null) {
      px = cx;
      py = cy;
    }
    doc.bezierCurveTo(cx - (px - cx), cy - (py - cy), cx + a[0], cy + a[1], cx + a[2], cy + a[3]);
    px = cx + a[0];
    py = cy + a[1];
    cx += a[2];
    return cy += a[3];
  },
  Q(doc, a) {
    px = a[0];
    py = a[1];
    cx = a[2];
    cy = a[3];
    return doc.quadraticCurveTo(a[0], a[1], cx, cy);
  },
  q(doc, a) {
    doc.quadraticCurveTo(a[0] + cx, a[1] + cy, a[2] + cx, a[3] + cy);
    px = cx + a[0];
    py = cy + a[1];
    cx += a[2];
    return cy += a[3];
  },
  T(doc, a) {
    if (px === null) {
      px = cx;
      py = cy;
    } else {
      px = cx - (px - cx);
      py = cy - (py - cy);
    }
    doc.quadraticCurveTo(px, py, a[0], a[1]);
    px = cx - (px - cx);
    py = cy - (py - cy);
    cx = a[0];
    return cy = a[1];
  },
  t(doc, a) {
    if (px === null) {
      px = cx;
      py = cy;
    } else {
      px = cx - (px - cx);
      py = cy - (py - cy);
    }
    doc.quadraticCurveTo(px, py, cx + a[0], cy + a[1]);
    cx += a[0];
    return cy += a[1];
  },
  A(doc, a) {
    solveArc(doc, cx, cy, a);
    cx = a[5];
    return cy = a[6];
  },
  a(doc, a) {
    a[5] += cx;
    a[6] += cy;
    solveArc(doc, cx, cy, a);
    cx = a[5];
    return cy = a[6];
  },
  L(doc, a) {
    cx = a[0];
    cy = a[1];
    px = py = null;
    return doc.lineTo(cx, cy);
  },
  l(doc, a) {
    cx += a[0];
    cy += a[1];
    px = py = null;
    return doc.lineTo(cx, cy);
  },
  H(doc, a) {
    cx = a[0];
    px = py = null;
    return doc.lineTo(cx, cy);
  },
  h(doc, a) {
    cx += a[0];
    px = py = null;
    return doc.lineTo(cx, cy);
  },
  V(doc, a) {
    cy = a[0];
    px = py = null;
    return doc.lineTo(cx, cy);
  },
  v(doc, a) {
    cy += a[0];
    px = py = null;
    return doc.lineTo(cx, cy);
  },
  Z(doc) {
    doc.closePath();
    cx = sx;
    return cy = sy;
  },
  z(doc) {
    doc.closePath();
    cx = sx;
    return cy = sy;
  }
};
const solveArc = function (doc, x, y, coords) {
  const [rx, ry, rot, large, sweep, ex, ey] = coords;
  const segs = arcToSegments(ex, ey, rx, ry, large, sweep, rot, x, y);
  for (let seg of segs) {
    const bez = segmentToBezier(...seg);
    doc.bezierCurveTo(...bez);
  }
};
const arcToSegments = function (x, y, rx, ry, large, sweep, rotateX, ox, oy) {
  const th = rotateX * (Math.PI / 180);
  const sin_th = Math.sin(th);
  const cos_th = Math.cos(th);
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  px = cos_th * (ox - x) * 0.5 + sin_th * (oy - y) * 0.5;
  py = cos_th * (oy - y) * 0.5 - sin_th * (ox - x) * 0.5;
  let pl = px * px / (rx * rx) + py * py / (ry * ry);
  if (pl > 1) {
    pl = Math.sqrt(pl);
    rx *= pl;
    ry *= pl;
  }
  const a00 = cos_th / rx;
  const a01 = sin_th / rx;
  const a10 = -sin_th / ry;
  const a11 = cos_th / ry;
  const x0 = a00 * ox + a01 * oy;
  const y0 = a10 * ox + a11 * oy;
  const x1 = a00 * x + a01 * y;
  const y1 = a10 * x + a11 * y;
  const d = (x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0);
  let sfactor_sq = 1 / d - 0.25;
  if (sfactor_sq < 0) {
    sfactor_sq = 0;
  }
  let sfactor = Math.sqrt(sfactor_sq);
  if (sweep === large) {
    sfactor = -sfactor;
  }
  const xc = 0.5 * (x0 + x1) - sfactor * (y1 - y0);
  const yc = 0.5 * (y0 + y1) + sfactor * (x1 - x0);
  const th0 = Math.atan2(y0 - yc, x0 - xc);
  const th1 = Math.atan2(y1 - yc, x1 - xc);
  let th_arc = th1 - th0;
  if (th_arc < 0 && sweep === 1) {
    th_arc += 2 * Math.PI;
  } else if (th_arc > 0 && sweep === 0) {
    th_arc -= 2 * Math.PI;
  }
  const segments = Math.ceil(Math.abs(th_arc / (Math.PI * 0.5 + 0.001)));
  const result = [];
  for (let i = 0; i < segments; i++) {
    const th2 = th0 + i * th_arc / segments;
    const th3 = th0 + (i + 1) * th_arc / segments;
    result[i] = [xc, yc, th2, th3, rx, ry, sin_th, cos_th];
  }
  return result;
};
const segmentToBezier = function (cx, cy, th0, th1, rx, ry, sin_th, cos_th) {
  const a00 = cos_th * rx;
  const a01 = -sin_th * ry;
  const a10 = sin_th * rx;
  const a11 = cos_th * ry;
  const th_half = 0.5 * (th1 - th0);
  const t = 8 / 3 * Math.sin(th_half * 0.5) * Math.sin(th_half * 0.5) / Math.sin(th_half);
  const x1 = cx + Math.cos(th0) - t * Math.sin(th0);
  const y1 = cy + Math.sin(th0) + t * Math.cos(th0);
  const x3 = cx + Math.cos(th1);
  const y3 = cy + Math.sin(th1);
  const x2 = x3 + t * Math.sin(th1);
  const y2 = y3 - t * Math.cos(th1);
  return [a00 * x1 + a01 * y1, a10 * x1 + a11 * y1, a00 * x2 + a01 * y2, a10 * x2 + a11 * y2, a00 * x3 + a01 * y3, a10 * x3 + a11 * y3];
};
class SVGPath {
  static apply(doc, path) {
    const commands = parse(path);
    apply(commands, doc);
  }
}

const {
  number: number$1
} = PDFObject;
const KAPPA = 4.0 * ((Math.sqrt(2) - 1.0) / 3.0);
var VectorMixin = {
  initVector() {
    this._ctm = [1, 0, 0, 1, 0, 0];
    this._ctmStack = [];
  },
  save() {
    this._ctmStack.push(this._ctm.slice());
    return this.addContent('q');
  },
  restore() {
    this._ctm = this._ctmStack.pop() || [1, 0, 0, 1, 0, 0];
    return this.addContent('Q');
  },
  closePath() {
    return this.addContent('h');
  },
  lineWidth(w) {
    return this.addContent(`${number$1(w)} w`);
  },
  _CAP_STYLES: {
    BUTT: 0,
    ROUND: 1,
    SQUARE: 2
  },
  lineCap(c) {
    if (typeof c === 'string') {
      c = this._CAP_STYLES[c.toUpperCase()];
    }
    return this.addContent(`${c} J`);
  },
  _JOIN_STYLES: {
    MITER: 0,
    ROUND: 1,
    BEVEL: 2
  },
  lineJoin(j) {
    if (typeof j === 'string') {
      j = this._JOIN_STYLES[j.toUpperCase()];
    }
    return this.addContent(`${j} j`);
  },
  miterLimit(m) {
    return this.addContent(`${number$1(m)} M`);
  },
  dash(length, options = {}) {
    const originalLength = length;
    if (!Array.isArray(length)) {
      length = [length, options.space || length];
    }
    const valid = length.every(x => Number.isFinite(x) && x > 0);
    if (!valid) {
      throw new Error(`dash(${JSON.stringify(originalLength)}, ${JSON.stringify(options)}) invalid, lengths must be numeric and greater than zero`);
    }
    length = length.map(number$1).join(' ');
    return this.addContent(`[${length}] ${number$1(options.phase || 0)} d`);
  },
  undash() {
    return this.addContent('[] 0 d');
  },
  moveTo(x, y) {
    return this.addContent(`${number$1(x)} ${number$1(y)} m`);
  },
  lineTo(x, y) {
    return this.addContent(`${number$1(x)} ${number$1(y)} l`);
  },
  bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) {
    return this.addContent(`${number$1(cp1x)} ${number$1(cp1y)} ${number$1(cp2x)} ${number$1(cp2y)} ${number$1(x)} ${number$1(y)} c`);
  },
  quadraticCurveTo(cpx, cpy, x, y) {
    return this.addContent(`${number$1(cpx)} ${number$1(cpy)} ${number$1(x)} ${number$1(y)} v`);
  },
  rect(x, y, w, h) {
    return this.addContent(`${number$1(x)} ${number$1(y)} ${number$1(w)} ${number$1(h)} re`);
  },
  roundedRect(x, y, w, h, borderRadius) {
    if (borderRadius == null) {
      borderRadius = 0;
    }
    let radii;
    if (Array.isArray(borderRadius)) {
      radii = borderRadius.slice(0, 4);
    } else {
      radii = [borderRadius, borderRadius, borderRadius, borderRadius];
    }
    const limit = Math.min(0.5 * w, 0.5 * h);
    const rTL = Math.max(0, Math.min(radii[0] || 0, limit));
    const rTR = Math.max(0, Math.min(radii[1] || 0, limit));
    const rBR = Math.max(0, Math.min(radii[2] || 0, limit));
    const rBL = Math.max(0, Math.min(radii[3] || 0, limit));
    const cpTR = rTR * (1.0 - KAPPA);
    const cpBR = rBR * (1.0 - KAPPA);
    const cpBL = rBL * (1.0 - KAPPA);
    const cpTL = rTL * (1.0 - KAPPA);
    this.moveTo(x + rTL, y);
    this.lineTo(x + w - rTR, y);
    if (rTR > 0) {
      this.bezierCurveTo(x + w - cpTR, y, x + w, y + cpTR, x + w, y + rTR);
    }
    this.lineTo(x + w, y + h - rBR);
    if (rBR > 0) {
      this.bezierCurveTo(x + w, y + h - cpBR, x + w - cpBR, y + h, x + w - rBR, y + h);
    }
    this.lineTo(x + rBL, y + h);
    if (rBL > 0) {
      this.bezierCurveTo(x + cpBL, y + h, x, y + h - cpBL, x, y + h - rBL);
    }
    this.lineTo(x, y + rTL);
    if (rTL > 0) {
      this.bezierCurveTo(x, y + cpTL, x + cpTL, y, x + rTL, y);
    }
    return this.closePath();
  },
  ellipse(x, y, r1, r2) {
    if (r2 == null) {
      r2 = r1;
    }
    x -= r1;
    y -= r2;
    const ox = r1 * KAPPA;
    const oy = r2 * KAPPA;
    const xe = x + r1 * 2;
    const ye = y + r2 * 2;
    const xm = x + r1;
    const ym = y + r2;
    this.moveTo(x, ym);
    this.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
    this.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);
    this.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
    this.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);
    return this.closePath();
  },
  circle(x, y, radius) {
    return this.ellipse(x, y, radius);
  },
  arc(x, y, radius, startAngle, endAngle, anticlockwise) {
    if (anticlockwise == null) {
      anticlockwise = false;
    }
    const TWO_PI = 2.0 * Math.PI;
    const HALF_PI = 0.5 * Math.PI;
    let deltaAng = endAngle - startAngle;
    if (Math.abs(deltaAng) > TWO_PI) {
      deltaAng = TWO_PI;
    } else if (deltaAng !== 0 && anticlockwise !== deltaAng < 0) {
      const dir = anticlockwise ? -1 : 1;
      deltaAng = dir * TWO_PI + deltaAng;
    }
    const numSegs = Math.ceil(Math.abs(deltaAng) / HALF_PI);
    const segAng = deltaAng / numSegs;
    const handleLen = segAng / HALF_PI * KAPPA * radius;
    let curAng = startAngle;
    let deltaCx = -Math.sin(curAng) * handleLen;
    let deltaCy = Math.cos(curAng) * handleLen;
    let ax = x + Math.cos(curAng) * radius;
    let ay = y + Math.sin(curAng) * radius;
    this.moveTo(ax, ay);
    for (let segIdx = 0; segIdx < numSegs; segIdx++) {
      const cp1x = ax + deltaCx;
      const cp1y = ay + deltaCy;
      curAng += segAng;
      ax = x + Math.cos(curAng) * radius;
      ay = y + Math.sin(curAng) * radius;
      deltaCx = -Math.sin(curAng) * handleLen;
      deltaCy = Math.cos(curAng) * handleLen;
      const cp2x = ax - deltaCx;
      const cp2y = ay - deltaCy;
      this.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, ax, ay);
    }
    return this;
  },
  polygon(...points) {
    this.moveTo(...(points.shift() || []));
    for (let point of points) {
      this.lineTo(...(point || []));
    }
    return this.closePath();
  },
  path(path) {
    SVGPath.apply(this, path);
    return this;
  },
  _windingRule(rule) {
    if (/even-?odd/.test(rule)) {
      return '*';
    }
    return '';
  },
  fill(color, rule) {
    if (/(even-?odd)|(non-?zero)/.test(color)) {
      rule = color;
      color = null;
    }
    if (color) {
      this.fillColor(color);
    }
    return this.addContent(`f${this._windingRule(rule)}`);
  },
  stroke(color) {
    if (color) {
      this.strokeColor(color);
    }
    return this.addContent('S');
  },
  fillAndStroke(fillColor, strokeColor, rule) {
    if (strokeColor == null) {
      strokeColor = fillColor;
    }
    const isFillRule = /(even-?odd)|(non-?zero)/;
    if (isFillRule.test(fillColor)) {
      rule = fillColor;
      fillColor = null;
    }
    if (isFillRule.test(strokeColor)) {
      rule = strokeColor;
      strokeColor = fillColor;
    }
    if (fillColor) {
      this.fillColor(fillColor);
      this.strokeColor(strokeColor);
    }
    return this.addContent(`B${this._windingRule(rule)}`);
  },
  clip(rule) {
    return this.addContent(`W${this._windingRule(rule)} n`);
  },
  transform(m11, m12, m21, m22, dx, dy) {
    if (m11 === 1 && m12 === 0 && m21 === 0 && m22 === 1 && dx === 0 && dy === 0) {
      return this;
    }
    const m = this._ctm;
    const [m0, m1, m2, m3, m4, m5] = m;
    m[0] = m0 * m11 + m2 * m12;
    m[1] = m1 * m11 + m3 * m12;
    m[2] = m0 * m21 + m2 * m22;
    m[3] = m1 * m21 + m3 * m22;
    m[4] = m0 * dx + m2 * dy + m4;
    m[5] = m1 * dx + m3 * dy + m5;
    const values = [m11, m12, m21, m22, dx, dy].map(v => number$1(v)).join(' ');
    return this.addContent(`${values} cm`);
  },
  translate(x, y) {
    return this.transform(1, 0, 0, 1, x, y);
  },
  rotate(angle, options = {}) {
    let y;
    const rad = angle * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    let x = y = 0;
    if (options.origin != null) {
      [x, y] = options.origin;
      const x1 = x * cos - y * sin;
      const y1 = x * sin + y * cos;
      x -= x1;
      y -= y1;
    }
    return this.transform(cos, sin, -sin, cos, x, y);
  },
  scale(xFactor, yFactor, options = {}) {
    let y;
    if (yFactor == null) {
      yFactor = xFactor;
    }
    if (typeof yFactor === 'object') {
      options = yFactor;
      yFactor = xFactor;
    }
    let x = y = 0;
    if (options.origin != null) {
      [x, y] = options.origin;
      x -= xFactor * x;
      y -= yFactor * y;
    }
    return this.transform(xFactor, 0, 0, yFactor, x, y);
  }
};

const WIN_ANSI_MAP = {
  402: 131,
  8211: 150,
  8212: 151,
  8216: 145,
  8217: 146,
  8218: 130,
  8220: 147,
  8221: 148,
  8222: 132,
  8224: 134,
  8225: 135,
  8226: 149,
  8230: 133,
  8364: 128,
  8240: 137,
  8249: 139,
  8250: 155,
  710: 136,
  8482: 153,
  338: 140,
  339: 156,
  732: 152,
  352: 138,
  353: 154,
  376: 159,
  381: 142,
  382: 158
};
const characters = `\
.notdef       .notdef        .notdef        .notdef
.notdef       .notdef        .notdef        .notdef
.notdef       .notdef        .notdef        .notdef
.notdef       .notdef        .notdef        .notdef
.notdef       .notdef        .notdef        .notdef
.notdef       .notdef        .notdef        .notdef
.notdef       .notdef        .notdef        .notdef
.notdef       .notdef        .notdef        .notdef
  
space         exclam         quotedbl       numbersign
dollar        percent        ampersand      quotesingle
parenleft     parenright     asterisk       plus
comma         hyphen         period         slash
zero          one            two            three
four          five           six            seven
eight         nine           colon          semicolon
less          equal          greater        question
  
at            A              B              C
D             E              F              G
H             I              J              K
L             M              N              O
P             Q              R              S
T             U              V              W
X             Y              Z              bracketleft
backslash     bracketright   asciicircum    underscore
  
grave         a              b              c
d             e              f              g
h             i              j              k
l             m              n              o
p             q              r              s
t             u              v              w
x             y              z              braceleft
bar           braceright     asciitilde     .notdef
  
Euro          .notdef        quotesinglbase florin
quotedblbase  ellipsis       dagger         daggerdbl
circumflex    perthousand    Scaron         guilsinglleft
OE            .notdef        Zcaron         .notdef
.notdef       quoteleft      quoteright     quotedblleft
quotedblright bullet         endash         emdash
tilde         trademark      scaron         guilsinglright
oe            .notdef        zcaron         ydieresis
  
space         exclamdown     cent           sterling
currency      yen            brokenbar      section
dieresis      copyright      ordfeminine    guillemotleft
logicalnot    hyphen         registered     macron
degree        plusminus      twosuperior    threesuperior
acute         mu             paragraph      periodcentered
cedilla       onesuperior    ordmasculine   guillemotright
onequarter    onehalf        threequarters  questiondown
  
Agrave        Aacute         Acircumflex    Atilde
Adieresis     Aring          AE             Ccedilla
Egrave        Eacute         Ecircumflex    Edieresis
Igrave        Iacute         Icircumflex    Idieresis
Eth           Ntilde         Ograve         Oacute
Ocircumflex   Otilde         Odieresis      multiply
Oslash        Ugrave         Uacute         Ucircumflex
Udieresis     Yacute         Thorn          germandbls
  
agrave        aacute         acircumflex    atilde
adieresis     aring          ae             ccedilla
egrave        eacute         ecircumflex    edieresis
igrave        iacute         icircumflex    idieresis
eth           ntilde         ograve         oacute
ocircumflex   otilde         odieresis      divide
oslash        ugrave         uacute         ucircumflex
udieresis     yacute         thorn          ydieresis\
`.split(/\s+/);
class AFMFont {
  constructor(contents) {
    this.attributes = {};
    this.glyphWidths = {};
    this.boundingBoxes = {};
    this.kernPairs = {};
    this.parse(contents);
    this.bbox = this.attributes['FontBBox'].split(/\s+/).map(e => +e);
    this.ascender = +(this.attributes['Ascender'] || 0);
    this.descender = +(this.attributes['Descender'] || 0);
    this.xHeight = +(this.attributes['XHeight'] || 0);
    this.capHeight = +(this.attributes['CapHeight'] || 0);
    this.lineGap = this.bbox[3] - this.bbox[1] - (this.ascender - this.descender);
  }
  parse(contents) {
    let section = '';
    for (let line of contents.split('\n')) {
      var match;
      var a;
      if (match = line.match(/^Start(\w+)/)) {
        section = match[1];
        continue;
      } else if (line.match(/^End(\w+)/)) {
        section = '';
        continue;
      }
      switch (section) {
        case 'FontMetrics':
          match = line.match(/(^\w+)\s+(.*)/);
          var key = match[1];
          var value = match[2];
          if (a = this.attributes[key]) {
            if (!Array.isArray(a)) {
              a = this.attributes[key] = [a];
            }
            a.push(value);
          } else {
            this.attributes[key] = value;
          }
          break;
        case 'CharMetrics':
          if (!/^CH?\s/.test(line)) {
            continue;
          }
          var name = line.match(/\bN\s+(\.?\w+)\s*;/)[1];
          this.glyphWidths[name] = +line.match(/\bWX\s+(\d+)\s*;/)[1];
          break;
        case 'KernPairs':
          match = line.match(/^KPX\s+(\.?\w+)\s+(\.?\w+)\s+(-?\d+)/);
          if (match) {
            this.kernPairs[match[1] + '\0' + match[2]] = parseInt(match[3]);
          }
          break;
      }
    }
  }
  encodeText(text) {
    const res = [];
    for (let i = 0, len = text.length; i < len; i++) {
      let char = text.charCodeAt(i);
      char = WIN_ANSI_MAP[char] || char;
      res.push(char.toString(16));
    }
    return res;
  }
  glyphsForString(string) {
    const glyphs = [];
    for (let i = 0, len = string.length; i < len; i++) {
      const charCode = string.charCodeAt(i);
      glyphs.push(this.characterToGlyph(charCode));
    }
    return glyphs;
  }
  characterToGlyph(character) {
    return characters[WIN_ANSI_MAP[character] || character] || '.notdef';
  }
  widthOfGlyph(glyph) {
    return this.glyphWidths[glyph] || 0;
  }
  getKernPair(left, right) {
    return this.kernPairs[left + '\0' + right] || 0;
  }
  advancesForGlyphs(glyphs) {
    const advances = [];
    for (let index = 0; index < glyphs.length; index++) {
      const left = glyphs[index];
      const right = glyphs[index + 1];
      advances.push(this.widthOfGlyph(left) + this.getKernPair(left, right));
    }
    return advances;
  }
}

class PDFFont {
  constructor() {}
  encode() {
    throw new Error('Must be implemented by subclasses');
  }
  widthOfString() {
    throw new Error('Must be implemented by subclasses');
  }
  ref() {
    return this.dictionary != null ? this.dictionary : this.dictionary = this.document.ref();
  }
  finalize() {
    if (this.embedded || this.dictionary == null) {
      return;
    }
    this.embed();
    this.embedded = true;
  }
  embed() {
    throw new Error('Must be implemented by subclasses');
  }
  lineHeight(size, includeGap = false) {
    const gap = includeGap ? this.lineGap : 0;
    return (this.ascender + gap - this.descender) / 1000 * size;
  }
}

const STANDARD_FONTS = {
  Courier() {
    return fs.readFileSync(__dirname + '/data/Courier.afm', 'utf8');
  },
  'Courier-Bold'() {
    return fs.readFileSync(__dirname + '/data/Courier-Bold.afm', 'utf8');
  },
  'Courier-Oblique'() {
    return fs.readFileSync(__dirname + '/data/Courier-Oblique.afm', 'utf8');
  },
  'Courier-BoldOblique'() {
    return fs.readFileSync(__dirname + '/data/Courier-BoldOblique.afm', 'utf8');
  },
  Helvetica() {
    return fs.readFileSync(__dirname + '/data/Helvetica.afm', 'utf8');
  },
  'Helvetica-Bold'() {
    return fs.readFileSync(__dirname + '/data/Helvetica-Bold.afm', 'utf8');
  },
  'Helvetica-Oblique'() {
    return fs.readFileSync(__dirname + '/data/Helvetica-Oblique.afm', 'utf8');
  },
  'Helvetica-BoldOblique'() {
    return fs.readFileSync(__dirname + '/data/Helvetica-BoldOblique.afm', 'utf8');
  },
  'Times-Roman'() {
    return fs.readFileSync(__dirname + '/data/Times-Roman.afm', 'utf8');
  },
  'Times-Bold'() {
    return fs.readFileSync(__dirname + '/data/Times-Bold.afm', 'utf8');
  },
  'Times-Italic'() {
    return fs.readFileSync(__dirname + '/data/Times-Italic.afm', 'utf8');
  },
  'Times-BoldItalic'() {
    return fs.readFileSync(__dirname + '/data/Times-BoldItalic.afm', 'utf8');
  },
  Symbol() {
    return fs.readFileSync(__dirname + '/data/Symbol.afm', 'utf8');
  },
  ZapfDingbats() {
    return fs.readFileSync(__dirname + '/data/ZapfDingbats.afm', 'utf8');
  }
};
class StandardFont extends PDFFont {
  constructor(document, name, id) {
    super();
    this.document = document;
    this.name = name;
    this.id = id;
    this.font = new AFMFont(STANDARD_FONTS[this.name]());
    ({
      ascender: this.ascender,
      descender: this.descender,
      bbox: this.bbox,
      lineGap: this.lineGap,
      xHeight: this.xHeight,
      capHeight: this.capHeight
    } = this.font);
  }
  embed() {
    this.dictionary.data = {
      Type: 'Font',
      BaseFont: this.name,
      Subtype: 'Type1',
      Encoding: 'WinAnsiEncoding'
    };
    return this.dictionary.end();
  }
  encode(text) {
    const encoded = this.font.encodeText(text);
    const glyphs = this.font.glyphsForString(`${text}`);
    const advances = this.font.advancesForGlyphs(glyphs);
    const positions = [];
    for (let i = 0; i < glyphs.length; i++) {
      const glyph = glyphs[i];
      positions.push({
        xAdvance: advances[i],
        yAdvance: 0,
        xOffset: 0,
        yOffset: 0,
        advanceWidth: this.font.widthOfGlyph(glyph)
      });
    }
    return [encoded, positions];
  }
  widthOfString(string, size) {
    const glyphs = this.font.glyphsForString(`${string}`);
    const advances = this.font.advancesForGlyphs(glyphs);
    let width = 0;
    for (let advance of advances) {
      width += advance;
    }
    const scale = size / 1000;
    return width * scale;
  }
  static isStandardFont(name) {
    return name in STANDARD_FONTS;
  }
}

const toHex = function (num) {
  return `0000${num.toString(16)}`.slice(-4);
};
class EmbeddedFont extends PDFFont {
  constructor(document, font, id) {
    super();
    this.document = document;
    this.font = font;
    this.id = id;
    this.subset = this.font.createSubset();
    this.unicode = [[0]];
    this.widths = [this.font.getGlyph(0).advanceWidth];
    this.name = this.font.postscriptName;
    this.scale = 1000 / this.font.unitsPerEm;
    this.ascender = this.font.ascent * this.scale;
    this.descender = this.font.descent * this.scale;
    this.xHeight = this.font.xHeight * this.scale;
    this.capHeight = this.font.capHeight * this.scale;
    this.lineGap = this.font.lineGap * this.scale;
    this.bbox = this.font.bbox;
    if (document.options.fontLayoutCache !== false) {
      this.layoutCache = Object.create(null);
    }
  }
  layoutRun(text, features) {
    const run = this.font.layout(text, features);
    for (let i = 0; i < run.positions.length; i++) {
      const position = run.positions[i];
      for (let key in position) {
        position[key] *= this.scale;
      }
      position.advanceWidth = run.glyphs[i].advanceWidth * this.scale;
    }
    return run;
  }
  layoutCached(text) {
    if (!this.layoutCache) {
      return this.layoutRun(text);
    }
    let cached;
    if (cached = this.layoutCache[text]) {
      return cached;
    }
    const run = this.layoutRun(text);
    this.layoutCache[text] = run;
    return run;
  }
  layout(text, features, onlyWidth) {
    if (features) {
      return this.layoutRun(text, features);
    }
    let glyphs = onlyWidth ? null : [];
    let positions = onlyWidth ? null : [];
    let advanceWidth = 0;
    let last = 0;
    let index = 0;
    while (index <= text.length) {
      var needle;
      if (index === text.length && last < index || (needle = text.charAt(index), [' ', '\t'].includes(needle))) {
        const run = this.layoutCached(text.slice(last, ++index));
        if (!onlyWidth) {
          glyphs = glyphs.concat(run.glyphs);
          positions = positions.concat(run.positions);
        }
        advanceWidth += run.advanceWidth;
        last = index;
      } else {
        index++;
      }
    }
    return {
      glyphs,
      positions,
      advanceWidth
    };
  }
  encode(text, features) {
    const {
      glyphs,
      positions
    } = this.layout(text, features);
    const res = [];
    for (let i = 0; i < glyphs.length; i++) {
      const glyph = glyphs[i];
      const gid = this.subset.includeGlyph(glyph.id);
      res.push(`0000${gid.toString(16)}`.slice(-4));
      if (this.widths[gid] == null) {
        this.widths[gid] = glyph.advanceWidth * this.scale;
      }
      if (this.unicode[gid] == null) {
        this.unicode[gid] = glyph.codePoints;
      }
    }
    return [res, positions];
  }
  widthOfString(string, size, features) {
    const width = this.layout(string, features, true).advanceWidth;
    const scale = size / 1000;
    return width * scale;
  }
  embed() {
    const isCFF = this.subset.cff != null;
    const fontFile = this.document.ref();
    if (isCFF) {
      fontFile.data.Subtype = 'CIDFontType0C';
    }
    fontFile.end(this.subset.encode());
    const familyClass = ((this.font['OS/2'] != null ? this.font['OS/2'].sFamilyClass : undefined) || 0) >> 8;
    let flags = 0;
    if (this.font.post.isFixedPitch) {
      flags |= 1 << 0;
    }
    if (1 <= familyClass && familyClass <= 7) {
      flags |= 1 << 1;
    }
    flags |= 1 << 2;
    if (familyClass === 10) {
      flags |= 1 << 3;
    }
    if (this.font.head.macStyle.italic) {
      flags |= 1 << 6;
    }
    const tag = [1, 2, 3, 4, 5, 6].map(i => String.fromCharCode((this.id.charCodeAt(i) || 73) + 17)).join('');
    const name = tag + '+' + this.font.postscriptName?.replaceAll(' ', '_');
    const {
      bbox
    } = this.font;
    const descriptor = this.document.ref({
      Type: 'FontDescriptor',
      FontName: name,
      Flags: flags,
      FontBBox: [bbox.minX * this.scale, bbox.minY * this.scale, bbox.maxX * this.scale, bbox.maxY * this.scale],
      ItalicAngle: this.font.italicAngle,
      Ascent: this.ascender,
      Descent: this.descender,
      CapHeight: (this.font.capHeight || this.font.ascent) * this.scale,
      XHeight: (this.font.xHeight || 0) * this.scale,
      StemV: 0
    });
    if (isCFF) {
      descriptor.data.FontFile3 = fontFile;
    } else {
      descriptor.data.FontFile2 = fontFile;
    }
    if (this.document.subset && this.document.subset === 1) {
      const maxCID = this.widths.length - 1;
      const cidSetBuffer = Buffer.alloc(Math.ceil((maxCID + 1) / 8), 0);
      for (let cid = 0; cid <= maxCID; cid++) {
        if (this.widths[cid] != null) {
          cidSetBuffer[Math.floor(cid / 8)] |= 0x80 >> cid % 8;
        }
      }
      const CIDSetRef = this.document.ref();
      CIDSetRef.write(cidSetBuffer);
      CIDSetRef.end();
      descriptor.data.CIDSet = CIDSetRef;
    }
    descriptor.end();
    const descendantFontData = {
      Type: 'Font',
      Subtype: 'CIDFontType0',
      BaseFont: name,
      CIDSystemInfo: {
        Registry: new String('Adobe'),
        Ordering: new String('Identity'),
        Supplement: 0
      },
      FontDescriptor: descriptor,
      W: [0, this.widths]
    };
    if (!isCFF) {
      descendantFontData.Subtype = 'CIDFontType2';
      descendantFontData.CIDToGIDMap = 'Identity';
    }
    const descendantFont = this.document.ref(descendantFontData);
    descendantFont.end();
    this.dictionary.data = {
      Type: 'Font',
      Subtype: 'Type0',
      BaseFont: name,
      Encoding: 'Identity-H',
      DescendantFonts: [descendantFont],
      ToUnicode: this.toUnicodeCmap()
    };
    return this.dictionary.end();
  }
  toUnicodeCmap() {
    const cmap = this.document.ref();
    const entries = [];
    for (let codePoints of this.unicode) {
      const encoded = [];
      for (let value of codePoints) {
        if (value > 0xffff) {
          value -= 0x10000;
          encoded.push(toHex(value >>> 10 & 0x3ff | 0xd800));
          value = 0xdc00 | value & 0x3ff;
        }
        encoded.push(toHex(value));
      }
      entries.push(`<${encoded.join(' ')}>`);
    }
    const chunkSize = 256;
    const chunks = Math.ceil(entries.length / chunkSize);
    const ranges = [];
    for (let i = 0; i < chunks; i++) {
      const start = i * chunkSize;
      const end = Math.min((i + 1) * chunkSize, entries.length);
      ranges.push(`<${toHex(start)}> <${toHex(end - 1)}> [${entries.slice(start, end).join(' ')}]`);
    }
    cmap.end(`\
/CIDInit /ProcSet findresource begin
12 dict begin
begincmap
/CIDSystemInfo <<
  /Registry (Adobe)
  /Ordering (UCS)
  /Supplement 0
>> def
/CMapName /Adobe-Identity-UCS def
/CMapType 2 def
1 begincodespacerange
<0000><ffff>
endcodespacerange
${ranges.length} beginbfrange
${ranges.join('\n')}
endbfrange
endcmap
CMapName currentdict /CMap defineresource pop
end
end\
`);
    return cmap;
  }
}

class PDFFontFactory {
  static open(document, src, family, id) {
    let font;
    if (typeof src === 'string') {
      if (StandardFont.isStandardFont(src)) {
        return new StandardFont(document, src, id);
      }
      src = fs.readFileSync(src);
    }
    if (src instanceof Uint8Array) {
      font = fontkit.create(src, family);
    } else if (src instanceof ArrayBuffer) {
      font = fontkit.create(new Uint8Array(src), family);
    }
    if (font == null) {
      throw new Error('Not a supported font format or standard PDF font.');
    }
    return new EmbeddedFont(document, font, id);
  }
}

const isEqualFont = (font1, font2) => {
  if (font1.font._tables?.head?.checkSumAdjustment !== font2.font._tables?.head?.checkSumAdjustment) {
    return false;
  }
  if (JSON.stringify(font1.font._tables?.name?.records) !== JSON.stringify(font2.font._tables?.name?.records)) {
    return false;
  }
  return true;
};
var FontsMixin = {
  initFonts(defaultFont = 'Helvetica', defaultFontFamily = null, defaultFontSize = 12) {
    this._fontFamilies = {};
    this._fontCount = 0;
    this._fontSource = defaultFont;
    this._fontFamily = defaultFontFamily;
    this._fontSize = defaultFontSize;
    this._font = null;
    this._remSize = defaultFontSize;
    this._registeredFonts = {};
    if (defaultFont) {
      this.font(defaultFont, defaultFontFamily);
    }
  },
  font(src, family, size) {
    let cacheKey, font;
    if (typeof family === 'number') {
      size = family;
      family = null;
    }
    if (typeof src === 'string' && this._registeredFonts[src]) {
      cacheKey = src;
      ({
        src,
        family
      } = this._registeredFonts[src]);
    } else {
      cacheKey = family || src;
      if (typeof cacheKey !== 'string') {
        cacheKey = null;
      }
    }
    this._fontSource = src;
    this._fontFamily = family;
    if (size != null) {
      this.fontSize(size);
    }
    if (font = this._fontFamilies[cacheKey]) {
      this._font = font;
      return this;
    }
    const id = `F${++this._fontCount}`;
    this._font = PDFFontFactory.open(this, src, family, id);
    if ((font = this._fontFamilies[this._font.name]) && isEqualFont(this._font, font)) {
      this._font = font;
      return this;
    }
    if (cacheKey) {
      this._fontFamilies[cacheKey] = this._font;
    }
    if (this._font.name && !this._fontFamilies[this._font.name]) {
      this._fontFamilies[this._font.name] = this._font;
    }
    if (!cacheKey && (!this._font.name || this._fontFamilies[this._font.name] !== this._font)) {
      this._fontFamilies[this._font.id] = this._font;
    }
    return this;
  },
  fontSize(_fontSize) {
    this._fontSize = this.sizeToPoint(_fontSize);
    return this;
  },
  currentLineHeight(includeGap) {
    return this._font.lineHeight(this._fontSize, includeGap);
  },
  registerFont(name, src, family) {
    this._registeredFonts[name] = {
      src,
      family
    };
    return this;
  },
  sizeToPoint(size, defaultValue = 0, page = this.page, percentageWidth = undefined) {
    if (!percentageWidth) percentageWidth = this._fontSize;
    if (typeof defaultValue !== 'number') defaultValue = this.sizeToPoint(defaultValue);
    if (size === undefined) return defaultValue;
    if (typeof size === 'number') return size;
    if (typeof size === 'boolean') return Number(size);
    const match = String(size).match(/((\d+)?(\.\d+)?)(em|in|px|cm|mm|pc|ex|ch|rem|vw|vh|vmin|vmax|%|pt)?/);
    if (!match) throw new Error(`Unsupported size '${size}'`);
    let multiplier;
    switch (match[4]) {
      case 'em':
        multiplier = this._fontSize;
        break;
      case 'in':
        multiplier = IN_TO_PT;
        break;
      case 'px':
        multiplier = PX_TO_IN * IN_TO_PT;
        break;
      case 'cm':
        multiplier = CM_TO_IN * IN_TO_PT;
        break;
      case 'mm':
        multiplier = MM_TO_CM * CM_TO_IN * IN_TO_PT;
        break;
      case 'pc':
        multiplier = PC_TO_PT;
        break;
      case 'ex':
        multiplier = this.currentLineHeight();
        break;
      case 'ch':
        multiplier = this.widthOfString('0');
        break;
      case 'rem':
        multiplier = this._remSize;
        break;
      case 'vw':
        multiplier = page.width / 100;
        break;
      case 'vh':
        multiplier = page.height / 100;
        break;
      case 'vmin':
        multiplier = Math.min(page.width, page.height) / 100;
        break;
      case 'vmax':
        multiplier = Math.max(page.width, page.height) / 100;
        break;
      case '%':
        multiplier = percentageWidth / 100;
        break;
      case 'pt':
      default:
        multiplier = 1;
    }
    return multiplier * Number(match[1]);
  }
};

const SOFT_HYPHEN = '\u00AD';
const HYPHEN = '-';
class LineWrapper {
  constructor(document, options) {
    this._listeners = Object.create(null);
    this.document = document;
    this.horizontalScaling = options.horizontalScaling || 100;
    this.indent = (options.indent || 0) * this.horizontalScaling / 100;
    this.indentAllLines = options.indentAllLines || false;
    this.characterSpacing = (options.characterSpacing || 0) * this.horizontalScaling / 100;
    this.wordSpacing = (options.wordSpacing === 0) * this.horizontalScaling / 100;
    this.columns = options.columns || 1;
    this.columnGap = (options.columnGap != null ? options.columnGap : 18) * this.horizontalScaling / 100;
    this.lineWidth = (options.width * this.horizontalScaling / 100 - this.columnGap * (this.columns - 1)) / this.columns;
    this.spaceLeft = this.lineWidth;
    this.startX = this.document.x;
    this.startY = this.document.y;
    this.column = 1;
    this.ellipsis = options.ellipsis;
    this.continuedX = 0;
    this.features = options.features;
    if (options.height != null) {
      this.height = options.height;
      this.maxY = PDFNumber(this.startY + options.height);
    } else {
      this.maxY = PDFNumber(this.document.page.maxY());
    }
    this.on('firstLine', options => {
      const indent = this.continuedX || this.indent;
      this.document.x += indent;
      this.lineWidth -= indent;
      if (options.indentAllLines) {
        return;
      }
      this.once('line', () => {
        this.document.x -= indent;
        this.lineWidth += indent;
        if (options.continued && !this.continuedX) {
          this.continuedX = this.indent;
        }
        if (!options.continued) {
          this.continuedX = 0;
        }
      });
    });
    this.on('lastLine', options => {
      const {
        align
      } = options;
      if (align === 'justify') {
        options.align = 'left';
      }
      this.lastLine = true;
      this.once('line', () => {
        this.document.y += options.paragraphGap || 0;
        options.align = align;
        return this.lastLine = false;
      });
    });
  }
  on(event, listener) {
    (this._listeners[event] || (this._listeners[event] = [])).push(listener);
  }
  once(event, listener) {
    const wrapper = (...args) => {
      const listeners = this._listeners[event];
      listeners.splice(listeners.indexOf(wrapper), 1);
      listener(...args);
    };
    this.on(event, wrapper);
  }
  emit(event, ...args) {
    const listeners = this._listeners[event];
    if (!listeners) return;
    for (const listener of listeners.slice()) listener(...args);
  }
  wordWidth(word) {
    return PDFNumber(this.document.widthOfString(word, this) + this.characterSpacing + this.wordSpacing);
  }
  canFit(word, w) {
    if (word[word.length - 1] != SOFT_HYPHEN) {
      return w <= this.spaceLeft;
    }
    return w + this.wordWidth(HYPHEN) <= this.spaceLeft;
  }
  eachWord(text, fn) {
    let bk;
    const breaker = new LineBreaker(text);
    let last = null;
    const wordWidths = Object.create(null);
    while (bk = breaker.nextBreak()) {
      var shouldContinue;
      let word = text.slice((last != null ? last.position : undefined) || 0, bk.position);
      let w = wordWidths[word] != null ? wordWidths[word] : wordWidths[word] = this.wordWidth(word);
      if (w > this.lineWidth + this.continuedX) {
        let lbk = last;
        const fbk = {};
        while (word.length) {
          var l, mightGrow;
          if (w > this.spaceLeft) {
            l = Math.ceil(this.spaceLeft / (w / word.length));
            w = this.wordWidth(word.slice(0, l));
            mightGrow = w <= this.spaceLeft && l < word.length;
          } else {
            l = word.length;
          }
          let mustShrink = w > this.spaceLeft && l > 0;
          while (mustShrink || mightGrow) {
            if (mustShrink) {
              w = this.wordWidth(word.slice(0, --l));
              mustShrink = w > this.spaceLeft && l > 0;
            } else {
              w = this.wordWidth(word.slice(0, ++l));
              mustShrink = w > this.spaceLeft && l > 0;
              mightGrow = w <= this.spaceLeft && l < word.length;
            }
          }
          if (l === 0 && this.spaceLeft === this.lineWidth) {
            l = 1;
          }
          fbk.required = bk.required || l < word.length;
          shouldContinue = fn(word.slice(0, l), w, fbk, lbk);
          lbk = {
            required: false
          };
          word = word.slice(l);
          w = this.wordWidth(word);
          if (shouldContinue === false) {
            break;
          }
        }
      } else {
        shouldContinue = fn(word, w, bk, last);
      }
      if (shouldContinue === false) {
        break;
      }
      last = bk;
    }
  }
  wrap(text, options) {
    const {
      document
    } = this;
    this.horizontalScaling = options.horizontalScaling || 100;
    if (options.indent != null) {
      this.indent = options.indent * this.horizontalScaling / 100;
    }
    if (options.characterSpacing != null) {
      this.characterSpacing = options.characterSpacing * this.horizontalScaling / 100;
    }
    if (options.wordSpacing != null) {
      this.wordSpacing = options.wordSpacing * this.horizontalScaling / 100;
    }
    if (options.ellipsis != null) {
      this.ellipsis = options.ellipsis;
    }
    const nextY = document.y + document.currentLineHeight(true);
    if (document.y > this.maxY || nextY > this.maxY) {
      this.nextSection();
    }
    let buffer = '';
    let textWidth = 0;
    let wc = 0;
    let lc = 0;
    let continueY = document.y;
    const emitLine = () => {
      options.textWidth = textWidth + this.wordSpacing * (wc - 1);
      options.wordCount = wc;
      options.lineWidth = this.lineWidth;
      continueY = document.y;
      this.emit('line', buffer, options, this);
      return lc++;
    };
    this.emit('sectionStart', options, this);
    this.eachWord(text, (word, w, bk, last) => {
      if (last == null || last.required) {
        this.emit('firstLine', options, this);
        this.spaceLeft = this.lineWidth;
      }
      if (this.canFit(word, w)) {
        buffer += word;
        textWidth += w;
        wc++;
      }
      if (bk.required || !this.canFit(word, w)) {
        const lh = document.currentLineHeight(true);
        if (this.height != null && this.ellipsis && PDFNumber(document.y + lh * 2) > this.maxY && this.column >= this.columns) {
          if (this.ellipsis === true) {
            this.ellipsis = '…';
          }
          buffer = buffer.replace(/\s+$/, '');
          textWidth = this.wordWidth(buffer + this.ellipsis);
          while (buffer && textWidth > this.lineWidth) {
            buffer = buffer.slice(0, -1).replace(/\s+$/, '');
            textWidth = this.wordWidth(buffer + this.ellipsis);
          }
          if (textWidth <= this.lineWidth) {
            buffer = buffer + this.ellipsis;
          }
          textWidth = this.wordWidth(buffer);
        }
        if (bk.required) {
          if (w > this.spaceLeft) {
            emitLine();
            buffer = word;
            textWidth = w;
            wc = 1;
          }
          this.emit('lastLine', options, this);
        }
        if (buffer[buffer.length - 1] == SOFT_HYPHEN) {
          buffer = buffer.slice(0, -1) + HYPHEN;
          this.spaceLeft -= this.wordWidth(HYPHEN);
        }
        emitLine();
        if (PDFNumber(document.y + lh) > this.maxY) {
          this.emit('sectionEnd', options, this);
          const shouldContinue = this.nextSection();
          if (!shouldContinue) {
            wc = 0;
            buffer = '';
            return false;
          }
          this.emit('sectionStart', options, this);
        }
        if (bk.required) {
          this.spaceLeft = this.lineWidth;
          buffer = '';
          textWidth = 0;
          return wc = 0;
        } else {
          this.spaceLeft = this.lineWidth - w;
          buffer = word;
          textWidth = w;
          return wc = 1;
        }
      } else {
        return this.spaceLeft -= w;
      }
    });
    if (wc > 0) {
      this.emit('lastLine', options, this);
      emitLine();
    }
    this.emit('sectionEnd', options, this);
    if (options.continued === true) {
      if (lc > 1) {
        this.continuedX = 0;
      }
      this.continuedX += options.textWidth || 0;
      document.y = continueY;
    } else {
      document.x = this.startX;
    }
  }
  nextSection(options) {
    if (++this.column > this.columns) {
      if (this.height != null) {
        return false;
      }
      this.document.continueOnNewPage();
      this.column = 1;
      this.startY = this.document.page.margins.top;
      this.maxY = this.document.page.maxY();
      if (this.indentAllLines) {
        const indent = this.continuedX || this.indent;
        this.document.x += indent;
        this.lineWidth -= indent;
      } else {
        this.document.x = this.startX;
      }
      if (this.document._fillColor) {
        this.document.fillColor(...this.document._fillColor);
      }
      this.emit('pageBreak', options, this);
    } else {
      this.document.x += this.lineWidth + this.columnGap;
      this.document.y = this.startY;
      this.emit('columnBreak', options, this);
    }
    return true;
  }
}

const {
  number
} = PDFObject;
function formatListLabel(n, listType) {
  if (listType === 'numbered') {
    return `${n}.`;
  }
  var letter = String.fromCharCode((n - 1) % 26 + 65);
  var times = Math.floor((n - 1) / 26 + 1);
  var text = Array(times + 1).join(letter);
  return `${text}.`;
}
var TextMixin = {
  initText() {
    this._line = this._line.bind(this);
    this.x = 0;
    this.y = 0;
    this._lineGap = 0;
  },
  lineGap(_lineGap) {
    this._lineGap = _lineGap;
    return this;
  },
  moveDown(lines) {
    if (lines == null) {
      lines = 1;
    }
    this.y += this.currentLineHeight(true) * lines + this._lineGap;
    return this;
  },
  moveUp(lines) {
    if (lines == null) {
      lines = 1;
    }
    this.y -= this.currentLineHeight(true) * lines + this._lineGap;
    return this;
  },
  _text(text, x, y, options, lineCallback) {
    options = this._initOptions(x, y, options);
    text = text == null ? '' : `${text}`;
    if (options.wordSpacing) {
      text = text.replace(/\s{2,}/g, ' ');
    }
    const addStructure = () => {
      if (options.structParent) {
        options.structParent.add(this.struct(options.structType || 'P', [this.markStructureContent(options.structType || 'P')]));
      }
    };
    if (options.rotation !== 0) {
      this.save();
      this.rotate(-options.rotation, {
        origin: [this.x, this.y]
      });
    }
    if (options.width) {
      let wrapper = this._wrapper;
      if (!wrapper) {
        wrapper = new LineWrapper(this, options);
        wrapper.on('line', lineCallback);
        wrapper.on('firstLine', addStructure);
      }
      this._wrapper = options.continued ? wrapper : null;
      this._textOptions = options.continued ? options : null;
      wrapper.wrap(text, options);
    } else {
      for (let line of text.split('\n')) {
        addStructure();
        lineCallback(line, options);
      }
    }
    if (options.rotation !== 0) this.restore();
    return this;
  },
  text(text, x, y, options) {
    return this._text(text, x, y, options, this._line);
  },
  widthOfString(string, options = {}) {
    const horizontalScaling = options.horizontalScaling || 100;
    return (this._font.widthOfString(string, this._fontSize, options.features) + (options.characterSpacing || 0) * (string.length - 1)) * horizontalScaling / 100;
  },
  boundsOfString(string, x, y, options) {
    options = this._initOptions(x, y, options);
    ({
      x,
      y
    } = this);
    const lineGap = options.lineGap ?? this._lineGap ?? 0;
    const lineHeight = this.currentLineHeight(true) + lineGap;
    let contentWidth = 0;
    string = String(string ?? '');
    if (options.wordSpacing) {
      string = string.replace(/\s{2,}/g, ' ');
    }
    if (options.width) {
      let wrapper = new LineWrapper(this, options);
      wrapper.on('line', (text, options) => {
        this.y += lineHeight;
        text = text.replace(/\n/g, '');
        if (text.length) {
          let wordSpacing = options.wordSpacing ?? 0;
          const characterSpacing = options.characterSpacing ?? 0;
          if (options.width && options.align === 'justify') {
            const words = text.trim().split(/\s+/);
            const textWidth = this.widthOfString(text.replace(/\s+/g, ''), options);
            const spaceWidth = this.widthOfString(' ') + characterSpacing;
            wordSpacing = Math.max(0, (options.lineWidth - textWidth) / Math.max(1, words.length - 1) - spaceWidth);
          }
          contentWidth = Math.max(contentWidth, options.textWidth + wordSpacing * (options.wordCount - 1) + characterSpacing * (text.length - 1));
        }
      });
      wrapper.wrap(string, options);
    } else {
      for (let line of string.split('\n')) {
        const lineWidth = this.widthOfString(line, options);
        this.y += lineHeight;
        contentWidth = Math.max(contentWidth, lineWidth);
      }
    }
    let contentHeight = this.y - y;
    if (options.height) contentHeight = Math.min(contentHeight, options.height);
    this.x = x;
    this.y = y;
    if (options.rotation === 0) {
      return {
        x,
        y,
        width: contentWidth,
        height: contentHeight
      };
    } else if (options.rotation === 90) {
      return {
        x: x,
        y: y - contentWidth,
        width: contentHeight,
        height: contentWidth
      };
    } else if (options.rotation === 180) {
      return {
        x: x - contentWidth,
        y: y - contentHeight,
        width: contentWidth,
        height: contentHeight
      };
    } else if (options.rotation === 270) {
      return {
        x: x - contentHeight,
        y: y,
        width: contentHeight,
        height: contentWidth
      };
    }
    const cos = cosine(options.rotation);
    const sin = sine(options.rotation);
    const x1 = x;
    const y1 = y;
    const x2 = x + contentWidth * cos;
    const y2 = y - contentWidth * sin;
    const x3 = x + contentWidth * cos + contentHeight * sin;
    const y3 = y - contentWidth * sin + contentHeight * cos;
    const x4 = x + contentHeight * sin;
    const y4 = y + contentHeight * cos;
    const xMin = Math.min(x1, x2, x3, x4);
    const xMax = Math.max(x1, x2, x3, x4);
    const yMin = Math.min(y1, y2, y3, y4);
    const yMax = Math.max(y1, y2, y3, y4);
    return {
      x: xMin,
      y: yMin,
      width: xMax - xMin,
      height: yMax - yMin
    };
  },
  heightOfString(text, options) {
    const {
      x,
      y
    } = this;
    options = this._initOptions(options);
    options.height = Infinity;
    const lineGap = options.lineGap || this._lineGap || 0;
    this._text(text, this.x, this.y, options, () => {
      this.y += this.currentLineHeight(true) + lineGap;
    });
    const height = this.y - y;
    this.x = x;
    this.y = y;
    return height;
  },
  list(list, x, y, options) {
    options = this._initOptions(x, y, options);
    const listType = options.listType || 'bullet';
    const unit = Math.round(this._font.ascender / 1000 * this._fontSize);
    const midLine = unit / 2;
    const r = options.bulletRadius || unit / 3;
    const indent = options.textIndent || (listType === 'bullet' ? r * 5 : unit * 2);
    const itemIndent = options.bulletIndent || (listType === 'bullet' ? r * 8 : unit * 2);
    let level = 1;
    const items = [];
    const levels = [];
    const numbers = [];
    var flatten = function (list) {
      let n = 1;
      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        if (Array.isArray(item)) {
          level++;
          flatten(item);
          level--;
        } else {
          items.push(item);
          levels.push(level);
          if (listType !== 'bullet') {
            numbers.push(n++);
          }
        }
      }
    };
    flatten(list);
    const drawListItem = function (listItem, i) {
      const wrapper = new LineWrapper(this, options);
      wrapper.on('line', this._line);
      level = 1;
      wrapper.once('firstLine', () => {
        let item, itemType, labelType, bodyType;
        if (options.structParent) {
          if (options.structTypes) {
            [itemType, labelType, bodyType] = options.structTypes;
          } else {
            [itemType, labelType, bodyType] = ['LI', 'Lbl', 'LBody'];
          }
        }
        if (itemType) {
          item = this.struct(itemType);
          options.structParent.add(item);
        } else if (options.structParent) {
          item = options.structParent;
        }
        let l;
        if ((l = levels[i++]) !== level) {
          const diff = itemIndent * (l - level);
          this.x += diff;
          wrapper.lineWidth -= diff;
          level = l;
        }
        if (item && (labelType || bodyType)) {
          item.add(this.struct(labelType || bodyType, [this.markStructureContent(labelType || bodyType)]));
        }
        switch (listType) {
          case 'bullet':
            this.circle(this.x - indent + r, this.y + midLine, r);
            this.fill();
            break;
          case 'numbered':
          case 'lettered':
            var text = formatListLabel(numbers[i - 1], listType);
            this._fragment(text, this.x - indent, this.y, options);
            break;
        }
        if (item && labelType && bodyType) {
          item.add(this.struct(bodyType, [this.markStructureContent(bodyType)]));
        }
        if (item && item !== options.structParent) {
          item.end();
        }
      });
      wrapper.on('sectionStart', () => {
        const pos = indent + itemIndent * (level - 1);
        this.x += pos;
        wrapper.lineWidth -= pos;
      });
      wrapper.on('sectionEnd', () => {
        const pos = indent + itemIndent * (level - 1);
        this.x -= pos;
        wrapper.lineWidth += pos;
      });
      wrapper.wrap(listItem, options);
    };
    for (let i = 0; i < items.length; i++) {
      drawListItem.call(this, items[i], i);
    }
    return this;
  },
  _initOptions(x = {}, y, options = {}) {
    if (x && typeof x === 'object') {
      options = x;
      x = null;
    }
    const result = Object.assign({}, options);
    if (this._textOptions) {
      for (let key in this._textOptions) {
        const val = this._textOptions[key];
        if (key !== 'continued') {
          if (result[key] === undefined) {
            result[key] = val;
          }
        }
      }
    }
    if (x != null) {
      this.x = x;
    }
    if (y != null) {
      this.y = y;
    }
    if (result.lineBreak !== false) {
      if (result.width == null) {
        result.width = this.page.width - this.x - this.page.margins.right;
      }
      result.width = Math.max(result.width, 0);
    }
    if (!result.columns) {
      result.columns = 0;
    }
    if (result.columnGap == null) {
      result.columnGap = 18;
    }
    result.rotation = Number(result.rotation ?? 0) % 360;
    if (result.rotation < 0) result.rotation += 360;
    return result;
  },
  _line(text, options = {}, wrapper) {
    this._fragment(text, this.x, this.y, options);
    if (wrapper) {
      const lineGap = options.lineGap || this._lineGap || 0;
      this.y += this.currentLineHeight(true) + lineGap;
    } else {
      this.x += this.widthOfString(text, options);
    }
  },
  _fragment(text, x, y, options) {
    let dy, encoded, i, positions, textWidth, words;
    text = `${text}`.replace(/\n/g, '');
    if (text.length === 0) {
      return;
    }
    const align = options.align || 'left';
    let wordSpacing = options.wordSpacing || 0;
    const characterSpacing = options.characterSpacing || 0;
    const horizontalScaling = options.horizontalScaling || 100;
    if (options.width) {
      switch (align) {
        case 'right':
          textWidth = this.widthOfString(text.replace(/\s+$/, ''), options);
          x += options.lineWidth - textWidth;
          break;
        case 'center':
          x += options.lineWidth / 2 - options.textWidth / 2;
          break;
        case 'justify':
          words = text.trim().split(/\s+/);
          textWidth = this.widthOfString(text.replace(/\s+/g, ''), options);
          var spaceWidth = this.widthOfString(' ') + characterSpacing;
          wordSpacing = Math.max(0, (options.lineWidth - textWidth) / Math.max(1, words.length - 1) - spaceWidth);
          break;
      }
    }
    if (typeof options.baseline === 'number') {
      dy = -options.baseline;
    } else {
      switch (options.baseline) {
        case 'svg-middle':
          dy = 0.5 * this._font.xHeight;
          break;
        case 'middle':
        case 'svg-central':
          dy = 0.5 * (this._font.descender + this._font.ascender);
          break;
        case 'bottom':
        case 'ideographic':
          dy = this._font.descender;
          break;
        case 'alphabetic':
          dy = 0;
          break;
        case 'mathematical':
          dy = 0.5 * this._font.ascender;
          break;
        case 'hanging':
          dy = 0.8 * this._font.ascender;
          break;
        case 'top':
          dy = this._font.ascender;
          break;
        default:
          dy = this._font.ascender;
      }
      dy = dy / 1000 * this._fontSize;
    }
    const renderedWidth = options.textWidth + wordSpacing * (options.wordCount - 1) + characterSpacing * (text.length - 1);
    if (options.link != null) {
      const linkOptions = {};
      if (this._currentStructureElement && this._currentStructureElement.dictionary.data.S === 'Link') {
        linkOptions.structParent = this._currentStructureElement;
      }
      this.link(x, y, renderedWidth, this.currentLineHeight(), options.link, linkOptions);
    }
    if (options.goTo != null) {
      this.goTo(x, y, renderedWidth, this.currentLineHeight(), options.goTo);
    }
    if (options.destination != null) {
      this.addNamedDestination(options.destination, 'XYZ', x, y, null);
    }
    if (options.underline) {
      this.save();
      if (!options.stroke) {
        this.strokeColor(...(this._fillColor || []));
      }
      const lineWidth = this._fontSize < 10 ? 0.5 : Math.floor(this._fontSize / 10);
      this.lineWidth(lineWidth);
      let lineY = y + this.currentLineHeight() - lineWidth;
      this.moveTo(x, lineY);
      this.lineTo(x + renderedWidth, lineY);
      this.stroke();
      this.restore();
    }
    if (options.strike) {
      this.save();
      if (!options.stroke) {
        this.strokeColor(...(this._fillColor || []));
      }
      const lineWidth = this._fontSize < 10 ? 0.5 : Math.floor(this._fontSize / 10);
      this.lineWidth(lineWidth);
      let lineY = y + this.currentLineHeight() / 2;
      this.moveTo(x, lineY);
      this.lineTo(x + renderedWidth, lineY);
      this.stroke();
      this.restore();
    }
    this.save();
    if (options.oblique) {
      let skew;
      if (typeof options.oblique === 'number') {
        skew = -Math.tan(options.oblique * Math.PI / 180);
      } else {
        skew = -0.25;
      }
      this.transform(1, 0, 0, 1, x, y);
      this.transform(1, 0, skew, 1, -skew * dy, 0);
      this.transform(1, 0, 0, 1, -x, -y);
    }
    this.transform(1, 0, 0, -1, 0, this.page.height);
    y = this.page.height - y - dy;
    if (this.page.fonts[this._font.id] == null) {
      this.page.fonts[this._font.id] = this._font.ref();
    }
    this.addContent('BT');
    this.addContent(`1 0 0 1 ${number(x)} ${number(y)} Tm`);
    this.addContent(`/${this._font.id} ${number(this._fontSize)} Tf`);
    const mode = options.fill && options.stroke ? 2 : options.stroke ? 1 : 0;
    if (mode) {
      this.addContent(`${mode} Tr`);
    }
    if (characterSpacing) {
      this.addContent(`${number(characterSpacing)} Tc`);
    }
    if (horizontalScaling !== 100) {
      this.addContent(`${horizontalScaling} Tz`);
    }
    if (wordSpacing) {
      words = text.trim().split(/\s+/);
      wordSpacing += this.widthOfString(' ') + characterSpacing;
      wordSpacing *= 1000 / this._fontSize;
      encoded = [];
      positions = [];
      for (let word of words) {
        const [encodedWord, positionsWord] = this._font.encode(word, options.features);
        encoded = encoded.concat(encodedWord);
        positions = positions.concat(positionsWord);
        const space = {};
        const object = positions[positions.length - 1];
        for (let key in object) {
          const val = object[key];
          space[key] = val;
        }
        space.xAdvance += wordSpacing;
        positions[positions.length - 1] = space;
      }
    } else {
      [encoded, positions] = this._font.encode(text, options.features);
    }
    const scale = this._fontSize / 1000;
    const commands = [];
    let last = 0;
    let hadOffset = false;
    const addSegment = cur => {
      if (last < cur) {
        const hex = encoded.slice(last, cur).join('');
        const advance = positions[cur - 1].xAdvance - positions[cur - 1].advanceWidth;
        commands.push(`<${hex}> ${number(-advance)}`);
      }
      last = cur;
    };
    const flush = i => {
      addSegment(i);
      if (commands.length > 0) {
        this.addContent(`[${commands.join(' ')}] TJ`);
        commands.length = 0;
      }
    };
    for (i = 0; i < positions.length; i++) {
      const pos = positions[i];
      if (pos.xOffset || pos.yOffset) {
        flush(i);
        this.addContent(`1 0 0 1 ${number(x + pos.xOffset * scale)} ${number(y + pos.yOffset * scale)} Tm`);
        flush(i + 1);
        hadOffset = true;
      } else {
        if (hadOffset) {
          this.addContent(`1 0 0 1 ${number(x)} ${number(y)} Tm`);
          hadOffset = false;
        }
        if (pos.xAdvance - pos.advanceWidth !== 0) {
          addSegment(i + 1);
        }
      }
      x += pos.xAdvance * scale;
    }
    flush(i);
    this.addContent('ET');
    this.restore();
  }
};

const toBinaryString = bytes => {
  const chunkSize = 0x8000;
  let out = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const end = Math.min(i + chunkSize, bytes.length);
    out += String.fromCharCode.apply(null, bytes.subarray(i, end));
  }
  return out;
};
const readUInt16BE = (bytes, offset = 0) => (bytes[offset] << 8 | bytes[offset + 1]) >>> 0;
const readUInt16LE = (bytes, offset = 0) => (bytes[offset + 1] << 8 | bytes[offset]) >>> 0;
const readUInt32BE = (bytes, offset = 0) => bytes[offset] * 0x1000000 + (bytes[offset + 1] << 16 | bytes[offset + 2] << 8 | bytes[offset + 3]) >>> 0;
const readUInt32LE = (bytes, offset = 0) => (bytes[offset] | bytes[offset + 1] << 8 | bytes[offset + 2] << 16) + bytes[offset + 3] * 0x1000000 >>> 0;

const parseExifOrientation = data => {
  if (!data || data.length < 20) return null;
  let pos = 2;
  while (pos < data.length - 4) {
    while (pos < data.length && data[pos] !== 0xff) pos++;
    if (pos >= data.length - 4) return null;
    const marker = readUInt16BE(data, pos);
    pos += 2;
    if (marker === 0xffda) return null;
    if (marker >= 0xffd0 && marker <= 0xffd9 || marker === 0xff01) continue;
    if (pos + 2 > data.length) return null;
    const segmentLength = readUInt16BE(data, pos);
    if (marker === 0xffe1 && pos + 8 <= data.length) {
      const exifHeader = toBinaryString(data.subarray(pos + 2, pos + 8));
      if (exifHeader === 'Exif\x00\x00') {
        const tiffStart = pos + 8;
        if (tiffStart + 8 > data.length) return null;
        const byteOrder = toBinaryString(data.subarray(tiffStart, tiffStart + 2));
        const isLittleEndian = byteOrder === 'II';
        if (!isLittleEndian && byteOrder !== 'MM') return null;
        const read16 = isLittleEndian ? o => readUInt16LE(data, o) : o => readUInt16BE(data, o);
        const read32 = isLittleEndian ? o => readUInt32LE(data, o) : o => readUInt32BE(data, o);
        if (read16(tiffStart + 2) !== 42) return null;
        const ifdPos = tiffStart + read32(tiffStart + 4);
        if (ifdPos + 2 > data.length) return null;
        const entryCount = read16(ifdPos);
        for (let i = 0; i < entryCount; i++) {
          const entryPos = ifdPos + 2 + i * 12;
          if (entryPos + 12 > data.length) return null;
          if (read16(entryPos) === 0x0112) {
            const value = read16(entryPos + 8);
            return value >= 1 && value <= 8 ? value : null;
          }
        }
        return null;
      }
    }
    pos += segmentLength;
  }
  return null;
};
const MARKERS = [0xffc0, 0xffc1, 0xffc2, 0xffc3, 0xffc5, 0xffc6, 0xffc7, 0xffc8, 0xffc9, 0xffca, 0xffcb, 0xffcc, 0xffcd, 0xffce, 0xffcf];
const COLOR_SPACE_MAP = {
  1: 'DeviceGray',
  3: 'DeviceRGB',
  4: 'DeviceCMYK'
};
class JPEG {
  constructor(data, label) {
    let marker;
    this.data = data;
    this.label = label;
    if (this.data.readUInt16BE(0) !== 0xffd8) {
      throw 'SOI not found in JPEG';
    }
    this.orientation = parseExifOrientation(this.data) || 1;
    let pos = 2;
    while (pos < this.data.length) {
      while (pos < this.data.length && this.data[pos] !== 0xff) pos++;
      if (pos >= this.data.length) break;
      marker = this.data.readUInt16BE(pos);
      pos += 2;
      if (MARKERS.includes(marker)) {
        break;
      }
      pos += this.data.readUInt16BE(pos);
    }
    if (!MARKERS.includes(marker)) {
      throw 'Invalid JPEG.';
    }
    pos += 2;
    this.bits = this.data[pos++];
    this.height = this.data.readUInt16BE(pos);
    pos += 2;
    this.width = this.data.readUInt16BE(pos);
    pos += 2;
    const channels = this.data[pos];
    this.colorSpace = COLOR_SPACE_MAP[channels];
    this.obj = null;
  }
  embed(document) {
    if (this.obj) {
      return;
    }
    this.obj = document.ref({
      Type: 'XObject',
      Subtype: 'Image',
      BitsPerComponent: this.bits,
      Width: this.width,
      Height: this.height,
      ColorSpace: this.colorSpace,
      Filter: 'DCTDecode'
    });
    if (this.colorSpace === 'DeviceCMYK') {
      this.obj.data['Decode'] = [1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0];
    }
    this.obj.end(this.data);
    return this.data = null;
  }
}

class PNGImage {
  constructor(data, label) {
    this.label = label;
    this.image = new PNG(data);
    this.width = this.image.width;
    this.height = this.image.height;
    this.imgData = this.image.imgData;
    this.obj = null;
  }
  embed(document) {
    this.document = document;
    if (this.obj) {
      return;
    }
    const {
      image,
      height,
      width
    } = this;
    const hasAlphaChannel = image.hasAlphaChannel;
    const isInterlaced = image.interlaceMethod === 1;
    const obj = this.obj = document.ref({
      Type: 'XObject',
      Subtype: 'Image',
      BitsPerComponent: hasAlphaChannel ? 8 : image.bits,
      Width: width,
      Height: height,
      Filter: 'FlateDecode'
    });
    if (!hasAlphaChannel) {
      const params = document.ref({
        Predictor: isInterlaced ? 1 : 15,
        Colors: image.colors,
        BitsPerComponent: image.bits,
        Columns: width
      });
      obj.data['DecodeParms'] = params;
      params.end();
    }
    if (image.palette.length === 0) {
      obj.data['ColorSpace'] = image.colorSpace;
    } else {
      const palette = document.ref();
      palette.end(Buffer.from(image.palette));
      obj.data['ColorSpace'] = ['Indexed', 'DeviceRGB', image.palette.length / 3 - 1, palette];
    }
    if (image.transparency.grayscale != null) {
      const val = image.transparency.grayscale;
      obj.data['Mask'] = [val, val];
    } else if (image.transparency.rgb) {
      const {
        rgb
      } = image.transparency;
      const mask = [];
      for (let x of rgb) {
        mask.push(x, x);
      }
      obj.data['Mask'] = mask;
    } else if (image.transparency.indexed) {
      return this.loadIndexedAlphaChannel();
    } else if (hasAlphaChannel) {
      return this.splitAlphaChannel();
    }
    if (isInterlaced && true) {
      return this.decodeData();
    }
    this.finalize();
  }
  finalize() {
    if (this.alphaChannel) {
      const sMask = this.document.ref({
        Type: 'XObject',
        Subtype: 'Image',
        Height: this.height,
        Width: this.width,
        BitsPerComponent: 8,
        Filter: 'FlateDecode',
        ColorSpace: 'DeviceGray',
        Decode: [0, 1]
      });
      sMask.end(this.alphaChannel);
      this.obj.data['SMask'] = sMask;
    }
    this.obj.end(this.imgData);
    this.image = null;
    return this.imgData = null;
  }
  splitAlphaChannel() {
    return this.image.decodePixels(pixels => {
      let a, p;
      const colorCount = this.image.colors;
      const pixelCount = this.width * this.height;
      const imgData = Buffer.alloc(pixelCount * colorCount);
      const alphaChannel = Buffer.alloc(pixelCount);
      let i = p = a = 0;
      const len = pixels.length;
      const skipByteCount = this.image.bits === 16 ? 1 : 0;
      while (i < len) {
        for (let colorIndex = 0; colorIndex < colorCount; colorIndex++) {
          imgData[p++] = pixels[i++];
          i += skipByteCount;
        }
        alphaChannel[a++] = pixels[i++];
        i += skipByteCount;
      }
      this.imgData = zlib.deflateSync(imgData);
      this.alphaChannel = zlib.deflateSync(alphaChannel);
      return this.finalize();
    });
  }
  loadIndexedAlphaChannel() {
    const transparency = this.image.transparency.indexed;
    const isInterlaced = this.image.interlaceMethod === 1;
    return this.image.decodePixels(pixels => {
      const alphaChannel = Buffer.alloc(this.width * this.height);
      let i = 0;
      for (let j = 0, end = pixels.length; j < end; j++) {
        alphaChannel[i++] = transparency[pixels[j]];
      }
      if (isInterlaced) {
        this.imgData = zlib.deflateSync(Buffer.from(pixels));
      }
      this.alphaChannel = zlib.deflateSync(alphaChannel);
      return this.finalize();
    });
  }
  decodeData() {
    this.image.decodePixels(pixels => {
      this.imgData = zlib.deflateSync(pixels);
      this.finalize();
    });
  }
}

class PDFImage {
  static open(src, label) {
    let data;
    if (Buffer.isBuffer(src)) {
      data = src;
    } else if (src instanceof ArrayBuffer) {
      data = Buffer.from(new Uint8Array(src));
    } else {
      const match = /^data:.+?;base64,(.*)$/.exec(src);
      if (match) {
        data = Buffer.from(match[1], 'base64');
      } else {
        data = fs.readFileSync(src);
        if (!data) {
          return;
        }
      }
    }
    if (data[0] === 0xff && data[1] === 0xd8) {
      return new JPEG(data, label);
    } else if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) {
      return new PNGImage(data, label);
    } else {
      throw new Error('Unknown image format.');
    }
  }
}

var ImagesMixin = {
  initImages() {
    this._imageRegistry = {};
    this._imageCount = 0;
  },
  image(src, x, y, options = {}) {
    let bh, bp, bw, image, ip, left, left1, originX, originY;
    if (typeof x === 'object') {
      options = x;
      x = null;
    }
    const ignoreOrientation = options.ignoreOrientation || options.ignoreOrientation !== false && this.options.ignoreOrientation;
    const inDocumentFlow = typeof y !== 'number';
    x = (left = x != null ? x : options.x) != null ? left : this.x;
    y = (left1 = y != null ? y : options.y) != null ? left1 : this.y;
    if (typeof src === 'string') {
      image = this._imageRegistry[src];
    }
    if (!image) {
      if (src.width && src.height) {
        image = src;
      } else {
        image = this.openImage(src);
      }
    }
    if (!image.obj) {
      image.embed(this);
    }
    if (this.page.xobjects[image.label] == null) {
      this.page.xobjects[image.label] = image.obj;
    }
    let {
      width,
      height
    } = image;
    if (!ignoreOrientation && image.orientation > 4) {
      [width, height] = [height, width];
    }
    let w = options.width || width;
    let h = options.height || height;
    if (options.width && !options.height) {
      const wp = w / width;
      w = width * wp;
      h = height * wp;
    } else if (options.height && !options.width) {
      const hp = h / height;
      w = width * hp;
      h = height * hp;
    } else if (options.scale) {
      w = width * options.scale;
      h = height * options.scale;
    } else if (options.fit) {
      [bw, bh] = options.fit;
      bp = bw / bh;
      ip = width / height;
      if (ip > bp) {
        w = bw;
        h = bw / ip;
      } else {
        h = bh;
        w = bh * ip;
      }
    } else if (options.cover) {
      [bw, bh] = options.cover;
      bp = bw / bh;
      ip = width / height;
      if (ip > bp) {
        h = bh;
        w = bh * ip;
      } else {
        w = bw;
        h = bw / ip;
      }
    }
    if (options.fit || options.cover) {
      if (options.align === 'center') {
        x = x + bw / 2 - w / 2;
      } else if (options.align === 'right') {
        x = x + bw - w;
      }
      if (options.valign === 'center') {
        y = y + bh / 2 - h / 2;
      } else if (options.valign === 'bottom') {
        y = y + bh - h;
      }
    }
    let rotateAngle = 0;
    let xTransform = x;
    let yTransform = y;
    let hTransform = h;
    let wTransform = w;
    if (!ignoreOrientation) {
      switch (image.orientation) {
        default:
        case 1:
          hTransform = -h;
          yTransform += h;
          break;
        case 2:
          wTransform = -w;
          hTransform = -h;
          xTransform += w;
          yTransform += h;
          break;
        case 3:
          originX = x;
          originY = y;
          hTransform = -h;
          xTransform -= w;
          rotateAngle = 180;
          break;
        case 4:
          break;
        case 5:
          originX = x;
          originY = y;
          wTransform = h;
          hTransform = w;
          yTransform -= hTransform;
          rotateAngle = 90;
          break;
        case 6:
          originX = x;
          originY = y;
          wTransform = h;
          hTransform = -w;
          rotateAngle = 90;
          break;
        case 7:
          originX = x;
          originY = y;
          hTransform = -w;
          wTransform = -h;
          xTransform += h;
          rotateAngle = 90;
          break;
        case 8:
          originX = x;
          originY = y;
          wTransform = h;
          hTransform = -w;
          xTransform -= h;
          yTransform += w;
          rotateAngle = -90;
          break;
      }
    } else {
      hTransform = -h;
      yTransform += h;
    }
    if (options.link != null) {
      this.link(x, y, w, h, options.link);
    }
    if (options.goTo != null) {
      this.goTo(x, y, w, h, options.goTo);
    }
    if (options.destination != null) {
      this.addNamedDestination(options.destination, 'XYZ', x, y, null);
    }
    if (inDocumentFlow) {
      this.y += h;
    }
    this.save();
    if (options.opacity != null) {
      this._doOpacity(options.opacity, null);
    }
    if (rotateAngle) {
      this.rotate(rotateAngle, {
        origin: [originX, originY]
      });
    }
    this.transform(wTransform, 0, 0, hTransform, xTransform, yTransform);
    this.addContent(`/${image.label} Do`);
    this.restore();
    return this;
  },
  openImage(src) {
    let image;
    if (typeof src === 'string') {
      image = this._imageRegistry[src];
    }
    if (!image) {
      image = PDFImage.open(src, `I${++this._imageCount}`);
      if (typeof src === 'string') {
        this._imageRegistry[src] = image;
      }
    }
    return image;
  }
};

class PDFAnnotationReference {
  constructor(annotationRef) {
    this.annotationRef = annotationRef;
  }
}

var AnnotationsMixin = {
  annotate(x, y, w, h, options) {
    options.Type = 'Annot';
    options.Rect = this._convertRect(x, y, w, h);
    options.Border = [0, 0, 0];
    if (options.Subtype === 'Link' && typeof options.F === 'undefined') {
      options.F = 1 << 2;
    }
    if (options.Subtype !== 'Link') {
      if (options.C == null) {
        options.C = this._normalizeColor(options.color || [0, 0, 0]);
      }
    }
    delete options.color;
    if (typeof options.Dest === 'string') {
      options.Dest = new String(options.Dest);
    }
    const structParent = options.structParent;
    delete options.structParent;
    for (let key in options) {
      const val = options[key];
      options[key[0].toUpperCase() + key.slice(1)] = val;
    }
    const ref = this.ref(options);
    this.page.annotations.push(ref);
    if (structParent && typeof structParent.add === 'function') {
      const annotRef = new PDFAnnotationReference(ref);
      structParent.add(annotRef);
    }
    ref.end();
    return this;
  },
  note(x, y, w, h, contents, options = {}) {
    options.Subtype = 'Text';
    options.Contents = new String(contents);
    if (options.Name == null) {
      options.Name = 'Comment';
    }
    if (options.color == null) {
      options.color = [243, 223, 92];
    }
    return this.annotate(x, y, w, h, options);
  },
  goTo(x, y, w, h, name, options = {}) {
    options.Subtype = 'Link';
    options.A = this.ref({
      S: 'GoTo',
      D: new String(name)
    });
    options.A.end();
    return this.annotate(x, y, w, h, options);
  },
  link(x, y, w, h, url, options = {}) {
    options.Subtype = 'Link';
    if (typeof url === 'number') {
      const pages = this._root.data.Pages.data;
      if (url >= 0 && url < pages.Kids.length) {
        options.A = this.ref({
          S: 'GoTo',
          D: [pages.Kids[url], 'XYZ', null, null, null]
        });
        options.A.end();
      } else {
        throw new Error(`The document has no page ${url}`);
      }
    } else {
      options.A = this.ref({
        S: 'URI',
        URI: new String(url)
      });
      options.A.end();
    }
    if (options.structParent && !options.Contents) {
      options.Contents = new String('');
    }
    return this.annotate(x, y, w, h, options);
  },
  _markup(x, y, w, h, options = {}) {
    const [x1, y1, x2, y2] = this._convertRect(x, y, w, h);
    options.QuadPoints = [x1, y2, x2, y2, x1, y1, x2, y1];
    options.Contents = new String();
    return this.annotate(x, y, w, h, options);
  },
  highlight(x, y, w, h, options = {}) {
    options.Subtype = 'Highlight';
    if (options.color == null) {
      options.color = [241, 238, 148];
    }
    return this._markup(x, y, w, h, options);
  },
  underline(x, y, w, h, options = {}) {
    options.Subtype = 'Underline';
    return this._markup(x, y, w, h, options);
  },
  strike(x, y, w, h, options = {}) {
    options.Subtype = 'StrikeOut';
    return this._markup(x, y, w, h, options);
  },
  lineAnnotation(x1, y1, x2, y2, options = {}) {
    options.Subtype = 'Line';
    options.Contents = new String();
    options.L = [x1, this.page.height - y1, x2, this.page.height - y2];
    return this.annotate(x1, y1, x2, y2, options);
  },
  rectAnnotation(x, y, w, h, options = {}) {
    options.Subtype = 'Square';
    options.Contents = new String();
    return this.annotate(x, y, w, h, options);
  },
  ellipseAnnotation(x, y, w, h, options = {}) {
    options.Subtype = 'Circle';
    options.Contents = new String();
    return this.annotate(x, y, w, h, options);
  },
  textAnnotation(x, y, w, h, text, options = {}) {
    options.Subtype = 'FreeText';
    options.Contents = new String(text);
    options.DA = new String();
    return this.annotate(x, y, w, h, options);
  },
  fileAnnotation(x, y, w, h, file = {}, options = {}) {
    const filespec = this.file(file.src, Object.assign({
      hidden: true
    }, file));
    options.Subtype = 'FileAttachment';
    options.FS = filespec;
    if (options.Contents) {
      options.Contents = new String(options.Contents);
    } else if (filespec.data.Desc) {
      options.Contents = filespec.data.Desc;
    }
    return this.annotate(x, y, w, h, options);
  },
  _convertRect(x1, y1, w, h) {
    let y2 = y1;
    y1 += h;
    let x2 = x1 + w;
    const [m0, m1, m2, m3, m4, m5] = this._ctm;
    x1 = m0 * x1 + m2 * y1 + m4;
    y1 = m1 * x1 + m3 * y1 + m5;
    x2 = m0 * x2 + m2 * y2 + m4;
    y2 = m1 * x2 + m3 * y2 + m5;
    return [x1, y1, x2, y2];
  }
};

const DEFAULT_OPTIONS = {
  top: 0,
  left: 0,
  zoom: 0,
  fit: true,
  pageNumber: null,
  expanded: false
};
class PDFOutline {
  constructor(document, parent, title, dest, options = DEFAULT_OPTIONS) {
    this.document = document;
    this.options = options;
    this.outlineData = {};
    if (dest !== null) {
      const destWidth = dest.data.MediaBox[2];
      const destHeight = dest.data.MediaBox[3];
      const top = destHeight - (options.top || 0);
      const left = destWidth - (options.left || 0);
      const zoom = options.zoom || 0;
      this.outlineData['Dest'] = options.fit ? [dest, 'Fit'] : [dest, 'XYZ', left, top, zoom];
    }
    if (parent !== null) {
      this.outlineData['Parent'] = parent;
    }
    if (title !== null) {
      this.outlineData['Title'] = new String(title);
    }
    this.dictionary = this.document.ref(this.outlineData);
    this.children = [];
  }
  addItem(title, options = DEFAULT_OPTIONS) {
    const pages = this.document._root.data.Pages.data.Kids;
    const dest = options.pageNumber != null ? pages[options.pageNumber] : this.document.page.dictionary;
    const result = new PDFOutline(this.document, this.dictionary, title, dest, options);
    this.children.push(result);
    return result;
  }
  endOutline() {
    if (this.children.length > 0) {
      if (this.options.expanded) {
        this.outlineData.Count = this.children.length;
      }
      const first = this.children[0],
        last = this.children[this.children.length - 1];
      this.outlineData.First = first.dictionary;
      this.outlineData.Last = last.dictionary;
      for (let i = 0, len = this.children.length; i < len; i++) {
        const child = this.children[i];
        if (i > 0) {
          child.outlineData.Prev = this.children[i - 1].dictionary;
        }
        if (i < this.children.length - 1) {
          child.outlineData.Next = this.children[i + 1].dictionary;
        }
        child.endOutline();
      }
    }
    return this.dictionary.end();
  }
}

var OutlineMixin = {
  initOutline() {
    this.outline = new PDFOutline(this, null, null, null);
  },
  endOutline() {
    this.outline.endOutline();
    if (this.outline.children.length > 0) {
      this._root.data.Outlines = this.outline.dictionary;
      return this._root.data.PageMode = this._root.data.PageMode || 'UseOutlines';
    }
  }
};

class PDFStructureContent {
  constructor(pageRef, mcid) {
    this.refs = [{
      pageRef,
      mcid
    }];
  }
  push(structContent) {
    structContent.refs.forEach(ref => this.refs.push(ref));
  }
}

class PDFStructureElement {
  constructor(document, type, options = {}, children = null) {
    this.document = document;
    this._attached = false;
    this._ended = false;
    this._flushed = false;
    this.dictionary = document.ref({
      S: type
    });
    const data = this.dictionary.data;
    if (Array.isArray(options) || this._isValidChild(options)) {
      children = options;
      options = {};
    }
    if (options.title) {
      data.T = new String(options.title);
    }
    if (options.lang) {
      data.Lang = new String(options.lang);
    }
    if (options.alt) {
      data.Alt = new String(options.alt);
    }
    if (options.expanded) {
      data.E = new String(options.expanded);
    }
    if (options.actual) {
      data.ActualText = new String(options.actual);
    }
    const hasBbox = Array.isArray(options.bbox) && options.bbox.length === 4;
    const hasPlacement = typeof options.placement === 'string';
    if (hasBbox || hasPlacement) {
      const attrs = {
        O: 'Layout'
      };
      attrs.Placement = hasPlacement ? options.placement : 'Block';
      if (hasBbox) {
        const height = document.page.height;
        attrs.BBox = [options.bbox[0], height - options.bbox[3], options.bbox[2], height - options.bbox[1]];
      }
      data.A = attrs;
    }
    if (options.scope) {
      data.A = {
        ...(data.A || {}),
        O: 'Table',
        Scope: options.scope
      };
    }
    this._children = [];
    if (children) {
      if (!Array.isArray(children)) {
        children = [children];
      }
      children.forEach(child => this.add(child));
      this.end();
    }
  }
  add(child) {
    if (this._ended) {
      throw new Error(`Cannot add child to already-ended structure element`);
    }
    if (!this._isValidChild(child)) {
      throw new Error(`Invalid structure element child`);
    }
    if (child instanceof PDFStructureElement) {
      child.setParent(this.dictionary);
      if (this._attached) {
        child.setAttached();
      }
    }
    if (child instanceof PDFStructureContent) {
      this._addContentToParentTree(child);
    }
    if (child instanceof PDFAnnotationReference) {
      this._addAnnotationToParentTree(child.annotationRef);
    }
    if (typeof child === 'function' && this._attached) {
      child = this._contentForClosure(child);
    }
    this._children.push(child);
    return this;
  }
  _addContentToParentTree(content) {
    content.refs.forEach(({
      pageRef,
      mcid
    }) => {
      const pageStructParents = this.document.getStructParentTree().get(pageRef.data.StructParents);
      pageStructParents[mcid] = this.dictionary;
    });
  }
  _addAnnotationToParentTree(annotRef) {
    const parentTreeKey = this.document.createStructParentTreeNextKey();
    annotRef.data.StructParent = parentTreeKey;
    const parentTree = this.document.getStructParentTree();
    parentTree.add(parentTreeKey, this.dictionary);
  }
  setParent(parentRef) {
    if (this.dictionary.data.P) {
      throw new Error(`Structure element added to more than one parent`);
    }
    this.dictionary.data.P = parentRef;
    this._flush();
  }
  setAttached() {
    if (this._attached) {
      return;
    }
    this._children.forEach((child, index) => {
      if (child instanceof PDFStructureElement) {
        child.setAttached();
      }
      if (typeof child === 'function') {
        this._children[index] = this._contentForClosure(child);
      }
    });
    this._attached = true;
    this._flush();
  }
  end() {
    if (this._ended) {
      return;
    }
    this._children.filter(child => child instanceof PDFStructureElement).forEach(child => child.end());
    this._ended = true;
    this._flush();
  }
  _isValidChild(child) {
    return child instanceof PDFStructureElement || child instanceof PDFStructureContent || child instanceof PDFAnnotationReference || typeof child === 'function';
  }
  _contentForClosure(closure) {
    const content = this.document.markStructureContent(this.dictionary.data.S);
    const prevStructElement = this.document._currentStructureElement;
    this.document._currentStructureElement = this;
    const wasEnded = this._ended;
    this._ended = false;
    closure();
    this._ended = wasEnded;
    this.document._currentStructureElement = prevStructElement;
    this.document.endMarkedContent();
    this._addContentToParentTree(content);
    return content;
  }
  _isFlushable() {
    if (!this.dictionary.data.P || !this._ended) {
      return false;
    }
    return this._children.every(child => {
      if (typeof child === 'function') {
        return false;
      }
      if (child instanceof PDFStructureElement) {
        return child._isFlushable();
      }
      return true;
    });
  }
  _flush() {
    if (this._flushed || !this._isFlushable()) {
      return;
    }
    this.dictionary.data.K = [];
    this._children.forEach(child => this._flushChild(child));
    this.dictionary.end();
    this._children = [];
    this.dictionary.data.K = null;
    this._flushed = true;
  }
  _flushChild(child) {
    if (child instanceof PDFStructureElement) {
      this.dictionary.data.K.push(child.dictionary);
    }
    if (child instanceof PDFStructureContent) {
      child.refs.forEach(({
        pageRef,
        mcid
      }) => {
        if (!this.dictionary.data.Pg) {
          this.dictionary.data.Pg = pageRef;
        }
        if (this.dictionary.data.Pg === pageRef) {
          this.dictionary.data.K.push(mcid);
        } else {
          this.dictionary.data.K.push({
            Type: 'MCR',
            Pg: pageRef,
            MCID: mcid
          });
        }
      });
    }
    if (child instanceof PDFAnnotationReference) {
      const pageRef = this.document.page.dictionary;
      const objr = {
        Type: 'OBJR',
        Obj: child.annotationRef,
        Pg: pageRef
      };
      this.dictionary.data.K.push(objr);
    }
  }
}

class PDFNumberTree extends PDFTree {
  _compareKeys(a, b) {
    return parseInt(a) - parseInt(b);
  }
  _keysName() {
    return 'Nums';
  }
  _dataForKey(k) {
    return parseInt(k);
  }
}

var MarkingsMixin = {
  initMarkings(options) {
    this.structChildren = [];
    if (options.tagged) {
      this.getMarkInfoDictionary().data.Marked = true;
      this.getStructTreeRoot();
    }
  },
  markContent(tag, options = null) {
    if (tag === 'Artifact' || options && options.mcid) {
      let toClose = 0;
      this.page.markings.forEach(marking => {
        if (toClose || marking.structContent || marking.tag === 'Artifact') {
          toClose++;
        }
      });
      while (toClose--) {
        this.endMarkedContent();
      }
    }
    if (!options) {
      this.page.markings.push({
        tag
      });
      this.addContent(`/${tag} BMC`);
      return this;
    }
    this.page.markings.push({
      tag,
      options
    });
    const dictionary = {};
    if (typeof options.mcid !== 'undefined') {
      dictionary.MCID = options.mcid;
    }
    if (tag === 'Artifact') {
      if (typeof options.type === 'string') {
        dictionary.Type = options.type;
      }
      if (Array.isArray(options.bbox)) {
        dictionary.BBox = [options.bbox[0], this.page.height - options.bbox[3], options.bbox[2], this.page.height - options.bbox[1]];
      }
      if (Array.isArray(options.attached) && options.attached.every(val => typeof val === 'string')) {
        dictionary.Attached = options.attached;
      }
    }
    if (tag === 'Span') {
      if (options.lang) {
        dictionary.Lang = new String(options.lang);
      }
      if (options.alt) {
        dictionary.Alt = new String(options.alt);
      }
      if (options.expanded) {
        dictionary.E = new String(options.expanded);
      }
      if (options.actual) {
        dictionary.ActualText = new String(options.actual);
      }
    }
    this.addContent(`/${tag} ${PDFObject.convert(dictionary)} BDC`);
    return this;
  },
  markStructureContent(tag, options = {}) {
    const pageStructParents = this.getStructParentTree().get(this.page.structParentTreeKey);
    const mcid = pageStructParents.length;
    pageStructParents.push(null);
    this.markContent(tag, {
      ...options,
      mcid
    });
    const structContent = new PDFStructureContent(this.page.dictionary, mcid);
    this.page.markings.slice(-1)[0].structContent = structContent;
    return structContent;
  },
  endMarkedContent() {
    this.page.markings.pop();
    this.addContent('EMC');
    if (this._textOptions) {
      delete this._textOptions.link;
      delete this._textOptions.goTo;
      delete this._textOptions.destination;
      delete this._textOptions.underline;
      delete this._textOptions.strike;
    }
    return this;
  },
  struct(type, options = {}, children = null) {
    return new PDFStructureElement(this, type, options, children);
  },
  addStructure(structElem) {
    const structTreeRoot = this.getStructTreeRoot();
    structElem.setParent(structTreeRoot);
    structElem.setAttached();
    this.structChildren.push(structElem);
    if (!structTreeRoot.data.K) {
      structTreeRoot.data.K = [];
    }
    structTreeRoot.data.K.push(structElem.dictionary);
    return this;
  },
  initPageMarkings(pageMarkings) {
    pageMarkings.forEach(marking => {
      if (marking.structContent) {
        const structContent = marking.structContent;
        const newStructContent = this.markStructureContent(marking.tag, marking.options);
        structContent.push(newStructContent);
        this.page.markings.slice(-1)[0].structContent = structContent;
      } else {
        this.markContent(marking.tag, marking.options);
      }
    });
  },
  endPageMarkings(page) {
    const pageMarkings = page.markings;
    pageMarkings.forEach(() => page.write('EMC'));
    page.markings = [];
    return pageMarkings;
  },
  getMarkInfoDictionary() {
    if (!this._root.data.MarkInfo) {
      this._root.data.MarkInfo = this.ref({});
    }
    return this._root.data.MarkInfo;
  },
  hasMarkInfoDictionary() {
    return !!this._root.data.MarkInfo;
  },
  getStructTreeRoot() {
    if (!this._root.data.StructTreeRoot) {
      this._root.data.StructTreeRoot = this.ref({
        Type: 'StructTreeRoot',
        ParentTree: new PDFNumberTree(),
        ParentTreeNextKey: 0
      });
    }
    return this._root.data.StructTreeRoot;
  },
  getStructParentTree() {
    return this.getStructTreeRoot().data.ParentTree;
  },
  createStructParentTreeNextKey() {
    this.getMarkInfoDictionary();
    const structTreeRoot = this.getStructTreeRoot();
    const key = structTreeRoot.data.ParentTreeNextKey++;
    structTreeRoot.data.ParentTree.add(key, []);
    return key;
  },
  endMarkings() {
    const structTreeRoot = this._root.data.StructTreeRoot;
    if (structTreeRoot) {
      structTreeRoot.end();
      this.structChildren.forEach(structElem => structElem.end());
    }
    if (this._root.data.MarkInfo) {
      this._root.data.MarkInfo.end();
    }
  }
};

const FIELD_FLAGS = {
  readOnly: 1,
  required: 2,
  noExport: 4,
  multiline: 0x1000,
  password: 0x2000,
  toggleToOffButton: 0x4000,
  radioButton: 0x8000,
  pushButton: 0x10000,
  combo: 0x20000,
  edit: 0x40000,
  sort: 0x80000,
  multiSelect: 0x200000,
  noSpell: 0x400000
};
const FIELD_JUSTIFY = {
  left: 0,
  center: 1,
  right: 2
};
const VALUE_MAP = {
  value: 'V',
  defaultValue: 'DV'
};
const FORMAT_SPECIAL = {
  zip: '0',
  zipPlus4: '1',
  zip4: '1',
  phone: '2',
  ssn: '3'
};
const FORMAT_DEFAULT = {
  number: {
    nDec: 0,
    sepComma: false,
    negStyle: 'MinusBlack',
    currency: '',
    currencyPrepend: true
  },
  percent: {
    nDec: 0,
    sepComma: false
  }
};
var AcroFormMixin = {
  initForm() {
    if (!this._font) {
      throw new Error('Must set a font before calling initForm method');
    }
    this._acroform = {
      fonts: {},
      defaultFont: this._font.name
    };
    this._acroform.fonts[this._font.id] = this._font.ref();
    let data = {
      Fields: [],
      NeedAppearances: true,
      DA: new String(`/${this._font.id} 0 Tf 0 g`),
      DR: {
        Font: {}
      }
    };
    data.DR.Font[this._font.id] = this._font.ref();
    const AcroForm = this.ref(data);
    this._root.data.AcroForm = AcroForm;
    return this;
  },
  endAcroForm() {
    if (this._root.data.AcroForm) {
      if (!Object.keys(this._acroform.fonts).length && !this._acroform.defaultFont) {
        throw new Error('No fonts specified for PDF form');
      }
      let fontDict = this._root.data.AcroForm.data.DR.Font;
      Object.keys(this._acroform.fonts).forEach(name => {
        fontDict[name] = this._acroform.fonts[name];
      });
      this._root.data.AcroForm.data.Fields.forEach(fieldRef => {
        this._endChild(fieldRef);
      });
      this._root.data.AcroForm.end();
    }
    return this;
  },
  _endChild(ref) {
    if (Array.isArray(ref.data.Kids)) {
      ref.data.Kids.forEach(childRef => {
        this._endChild(childRef);
      });
      ref.end();
    }
    return this;
  },
  formField(name, options = {}) {
    let fieldDict = this._fieldDict(name, null, options);
    let fieldRef = this.ref(fieldDict);
    this._addToParent(fieldRef);
    return fieldRef;
  },
  formAnnotation(name, type, x, y, w, h, options = {}) {
    let fieldDict = this._fieldDict(name, type, options);
    fieldDict.Subtype = 'Widget';
    if (fieldDict.F === undefined) {
      fieldDict.F = 4;
    }
    this.annotate(x, y, w, h, fieldDict);
    let annotRef = this.page.annotations[this.page.annotations.length - 1];
    return this._addToParent(annotRef);
  },
  formText(name, x, y, w, h, options = {}) {
    return this.formAnnotation(name, 'text', x, y, w, h, options);
  },
  formPushButton(name, x, y, w, h, options = {}) {
    return this.formAnnotation(name, 'pushButton', x, y, w, h, options);
  },
  formCombo(name, x, y, w, h, options = {}) {
    return this.formAnnotation(name, 'combo', x, y, w, h, options);
  },
  formList(name, x, y, w, h, options = {}) {
    return this.formAnnotation(name, 'list', x, y, w, h, options);
  },
  formRadioButton(name, x, y, w, h, options = {}) {
    return this.formAnnotation(name, 'radioButton', x, y, w, h, options);
  },
  formCheckbox(name, x, y, w, h, options = {}) {
    return this.formAnnotation(name, 'checkbox', x, y, w, h, options);
  },
  _addToParent(fieldRef) {
    let parent = fieldRef.data.Parent;
    if (parent) {
      if (!parent.data.Kids) {
        parent.data.Kids = [];
      }
      parent.data.Kids.push(fieldRef);
    } else {
      this._root.data.AcroForm.data.Fields.push(fieldRef);
    }
    return this;
  },
  _fieldDict(name, type, options = {}) {
    if (!this._acroform) {
      throw new Error('Call document.initForm() method before adding form elements to document');
    }
    let opts = Object.assign({}, options);
    if (type !== null) {
      opts = this._resolveType(type, options);
    }
    opts = this._resolveFlags(opts);
    opts = this._resolveJustify(opts);
    opts = this._resolveFont(opts);
    opts = this._resolveStrings(opts);
    opts = this._resolveColors(opts);
    opts = this._resolveFormat(opts);
    opts.T = new String(name);
    if (opts.parent) {
      opts.Parent = opts.parent;
      delete opts.parent;
    }
    return opts;
  },
  _resolveType(type, opts) {
    if (type === 'text') {
      opts.FT = 'Tx';
    } else if (type === 'pushButton') {
      opts.FT = 'Btn';
      opts.pushButton = true;
    } else if (type === 'radioButton') {
      opts.FT = 'Btn';
      opts.radioButton = true;
    } else if (type === 'checkbox') {
      opts.FT = 'Btn';
    } else if (type === 'combo') {
      opts.FT = 'Ch';
      opts.combo = true;
    } else if (type === 'list') {
      opts.FT = 'Ch';
    } else {
      throw new Error(`Invalid form annotation type '${type}'`);
    }
    return opts;
  },
  _resolveFormat(opts) {
    const f = opts.format;
    if (f && f.type) {
      let fnKeystroke;
      let fnFormat;
      let params = '';
      if (FORMAT_SPECIAL[f.type] !== undefined) {
        fnKeystroke = `AFSpecial_Keystroke`;
        fnFormat = `AFSpecial_Format`;
        params = FORMAT_SPECIAL[f.type];
      } else {
        let format = f.type.charAt(0).toUpperCase() + f.type.slice(1);
        fnKeystroke = `AF${format}_Keystroke`;
        fnFormat = `AF${format}_Format`;
        if (f.type === 'date') {
          fnKeystroke += 'Ex';
          params = String(f.param);
        } else if (f.type === 'time') {
          params = String(f.param);
        } else if (f.type === 'number') {
          let p = Object.assign({}, FORMAT_DEFAULT.number, f);
          params = String([String(p.nDec), p.sepComma ? '0' : '1', '"' + p.negStyle + '"', 'null', '"' + p.currency + '"', String(p.currencyPrepend)].join(','));
        } else if (f.type === 'percent') {
          let p = Object.assign({}, FORMAT_DEFAULT.percent, f);
          params = String([String(p.nDec), p.sepComma ? '0' : '1'].join(','));
        }
      }
      opts.AA = opts.AA ? opts.AA : {};
      opts.AA.K = {
        S: 'JavaScript',
        JS: new String(`${fnKeystroke}(${params});`)
      };
      opts.AA.F = {
        S: 'JavaScript',
        JS: new String(`${fnFormat}(${params});`)
      };
    }
    delete opts.format;
    return opts;
  },
  _resolveColors(opts) {
    let color = this._normalizeColor(opts.backgroundColor);
    if (color) {
      if (!opts.MK) {
        opts.MK = {};
      }
      opts.MK.BG = color;
    }
    color = this._normalizeColor(opts.borderColor);
    if (color) {
      if (!opts.MK) {
        opts.MK = {};
      }
      opts.MK.BC = color;
    }
    delete opts.backgroundColor;
    delete opts.borderColor;
    return opts;
  },
  _resolveFlags(options) {
    let result = 0;
    Object.keys(options).forEach(key => {
      if (FIELD_FLAGS[key]) {
        if (options[key]) {
          result |= FIELD_FLAGS[key];
        }
        delete options[key];
      }
    });
    if (result !== 0) {
      options.Ff = options.Ff ? options.Ff : 0;
      options.Ff |= result;
    }
    return options;
  },
  _resolveJustify(options) {
    let result = 0;
    if (options.align !== undefined) {
      if (typeof FIELD_JUSTIFY[options.align] === 'number') {
        result = FIELD_JUSTIFY[options.align];
      }
      delete options.align;
    }
    if (result !== 0) {
      options.Q = result;
    }
    return options;
  },
  _resolveFont(options) {
    if (this._acroform.fonts[this._font.id] == null) {
      this._acroform.fonts[this._font.id] = this._font.ref();
    }
    if (this._acroform.defaultFont !== this._font.name) {
      options.DR = {
        Font: {}
      };
      const fontSize = options.fontSize || 0;
      options.DR.Font[this._font.id] = this._font.ref();
      options.DA = new String(`/${this._font.id} ${fontSize} Tf 0 g`);
    }
    return options;
  },
  _resolveStrings(options) {
    let select = [];
    function appendChoices(a) {
      if (Array.isArray(a)) {
        for (let idx = 0; idx < a.length; idx++) {
          if (typeof a[idx] === 'string') {
            select.push(new String(a[idx]));
          } else {
            select.push(a[idx]);
          }
        }
      }
    }
    appendChoices(options.Opt);
    if (options.select) {
      appendChoices(options.select);
      delete options.select;
    }
    if (select.length) {
      options.Opt = select;
    }
    Object.keys(VALUE_MAP).forEach(key => {
      if (options[key] !== undefined) {
        options[VALUE_MAP[key]] = options[key];
        delete options[key];
      }
    });
    ['V', 'DV'].forEach(key => {
      if (typeof options[key] === 'string') {
        options[key] = new String(options[key]);
      }
    });
    if (options.MK && options.MK.CA) {
      options.MK.CA = new String(options.MK.CA);
    }
    if (options.label) {
      options.MK = options.MK ? options.MK : {};
      options.MK.CA = new String(options.label);
      delete options.label;
    }
    return options;
  }
};

var AttachmentsMixin = {
  file(src, options = {}) {
    options.name = options.name || src;
    options.relationship = options.relationship || 'Unspecified';
    const refBody = {
      Type: 'EmbeddedFile',
      Params: {}
    };
    let data;
    if (!src) {
      throw new Error('No src specified');
    }
    if (Buffer.isBuffer(src)) {
      data = src;
    } else if (src instanceof ArrayBuffer) {
      data = Buffer.from(new Uint8Array(src));
    } else {
      const match = /^data:(.*?);base64,(.*)$/.exec(src);
      if (match) {
        if (match[1]) {
          refBody.Subtype = escapeName(match[1]);
        }
        data = Buffer.from(match[2], 'base64');
      } else {
        data = fs.readFileSync(src);
        if (!data) {
          throw new Error(`Could not read contents of file at filepath ${src}`);
        }
        const {
          birthtime,
          ctime
        } = fs.statSync(src);
        refBody.Params.CreationDate = birthtime;
        refBody.Params.ModDate = ctime;
      }
    }
    if (options.creationDate instanceof Date) {
      refBody.Params.CreationDate = options.creationDate;
    }
    if (options.modifiedDate instanceof Date) {
      refBody.Params.ModDate = options.modifiedDate;
    }
    if (options.type) {
      refBody.Subtype = escapeName(options.type);
    }
    const checksum = md5Hex(new Uint8Array(data));
    refBody.Params.CheckSum = new String(checksum);
    refBody.Params.Size = data.byteLength;
    let ref;
    if (!this._fileRegistry) this._fileRegistry = {};
    let file = this._fileRegistry[options.name];
    if (file && isEqual(refBody, file)) {
      ref = file.ref;
    } else {
      ref = this.ref(refBody);
      ref.end(data);
      this._fileRegistry[options.name] = {
        ...refBody,
        ref
      };
    }
    const fileSpecBody = {
      Type: 'Filespec',
      AFRelationship: options.relationship,
      F: new String(options.name),
      EF: {
        F: ref
      },
      UF: new String(options.name)
    };
    if (options.description) {
      fileSpecBody.Desc = new String(options.description);
    }
    const filespec = this.ref(fileSpecBody);
    filespec.end();
    if (!options.hidden) {
      this.addNamedEmbeddedFile(options.name, filespec);
    }
    if (this._root.data.AF) {
      this._root.data.AF.push(filespec);
    } else {
      this._root.data.AF = [filespec];
    }
    return filespec;
  }
};
function isEqual(a, b) {
  return a.Subtype === b.Subtype && a.Params.CheckSum.toString() === b.Params.CheckSum.toString() && a.Params.Size === b.Params.Size && a.Params.CreationDate.getTime() === b.Params.CreationDate.getTime() && (a.Params.ModDate === undefined && b.Params.ModDate === undefined || a.Params.ModDate.getTime() === b.Params.ModDate.getTime());
}

var PDFA = {
  initPDFA(pSubset) {
    if (pSubset.charAt(pSubset.length - 3) === '-') {
      this.subset_conformance = pSubset.charAt(pSubset.length - 1).toUpperCase();
      this.subset = parseInt(pSubset.charAt(pSubset.length - 2));
    } else {
      this.subset_conformance = 'B';
      this.subset = parseInt(pSubset.charAt(pSubset.length - 1));
    }
  },
  endSubset() {
    this._addPdfaMetadata();
    this._addColorOutputIntent();
  },
  _addColorOutputIntent() {
    const iccProfile = fs.readFileSync(`${__dirname}/data/sRGB_IEC61966_2_1.icc`);
    const colorProfileRef = this.ref({
      Length: iccProfile.length,
      N: 3
    });
    colorProfileRef.write(iccProfile);
    colorProfileRef.end();
    const intentRef = this.ref({
      Type: 'OutputIntent',
      S: 'GTS_PDFA1',
      Info: new String('sRGB IEC61966-2.1'),
      OutputConditionIdentifier: new String('sRGB IEC61966-2.1'),
      DestOutputProfile: colorProfileRef
    });
    intentRef.end();
    this._root.data.OutputIntents = [intentRef];
  },
  _getPdfaid() {
    return `
        <rdf:Description xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/" rdf:about="">
            <pdfaid:part>${this.subset}</pdfaid:part>
            <pdfaid:conformance>${this.subset_conformance}</pdfaid:conformance>
        </rdf:Description>
        `;
  },
  _addPdfaMetadata() {
    this.appendXML(this._getPdfaid());
  }
};

var PDFUA = {
  initPDFUA() {
    this.subset = 1;
  },
  endSubset() {
    this._addPdfuaMetadata();
  },
  _addPdfuaMetadata() {
    this.appendXML(this._getPdfuaid());
  },
  _getPdfuaid() {
    return `
        <rdf:Description xmlns:pdfuaid="http://www.aiim.org/pdfua/ns/id/" rdf:about="">
            <pdfuaid:part>${this.subset}</pdfuaid:part>
        </rdf:Description>
        `;
  }
};

var SubsetMixin = {
  _importSubset(subset) {
    Object.assign(this, subset);
  },
  initSubset(options) {
    switch (options.subset) {
      case 'PDF/A-1':
      case 'PDF/A-1a':
      case 'PDF/A-1b':
      case 'PDF/A-2':
      case 'PDF/A-2a':
      case 'PDF/A-2b':
      case 'PDF/A-3':
      case 'PDF/A-3a':
      case 'PDF/A-3b':
        this._importSubset(PDFA);
        this.initPDFA(options.subset);
        break;
      case 'PDF/UA':
        this._importSubset(PDFUA);
        this.initPDFUA();
        break;
    }
  }
};

const ROW_FIELDS = ['height', 'minHeight', 'maxHeight'];
const COLUMN_FIELDS = ['width', 'minWidth', 'maxWidth'];
function memoize(fn, maxSize) {
  const cache = new Map();
  return function (...args) {
    const key = args[0];
    if (!cache.has(key)) {
      cache.set(key, fn(...args));
      if (cache.size > maxSize) cache.delete(cache.keys().next());
    }
    return cache.get(key);
  };
}
function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}
function deepMerge(target, ...sources) {
  if (!isObject(target)) return target;
  target = deepClone(target);
  for (const source of sources) {
    if (isObject(source)) {
      for (const key in source) {
        if (isObject(source[key])) {
          if (!(key in target)) target[key] = {};
          target[key] = deepMerge(target[key], source[key]);
        } else if (source[key] !== undefined) {
          target[key] = deepClone(source[key]);
        }
      }
    }
  }
  return target;
}
function deepClone(obj) {
  let result = obj;
  if (obj && typeof obj == 'object') {
    result = Array.isArray(obj) ? [] : {};
    for (const key in obj) result[key] = deepClone(obj[key]);
  }
  return result;
}

function normalizedDefaultStyle(defaultStyleInternal) {
  let defaultStyle = defaultStyleInternal;
  if (typeof defaultStyle !== 'object') defaultStyle = {
    text: defaultStyle
  };
  const defaultRowStyle = Object.fromEntries(Object.entries(defaultStyle).filter(([k]) => ROW_FIELDS.includes(k)));
  const defaultColStyle = Object.fromEntries(Object.entries(defaultStyle).filter(([k]) => COLUMN_FIELDS.includes(k)));
  defaultStyle.padding = normalizeSides(defaultStyle.padding);
  defaultStyle.border = normalizeSides(defaultStyle.border);
  defaultStyle.borderColor = normalizeSides(defaultStyle.borderColor);
  defaultStyle.align = normalizeAlignment(defaultStyle.align);
  return {
    defaultStyle,
    defaultRowStyle,
    defaultColStyle
  };
}
function normalizedRowStyle(defaultRowStyle, rowStyleInternal, i) {
  let rowStyle = rowStyleInternal(i);
  if (rowStyle == null || typeof rowStyle !== 'object') {
    rowStyle = {
      height: rowStyle
    };
  }
  rowStyle.padding = normalizeSides(rowStyle.padding);
  rowStyle.border = normalizeSides(rowStyle.border);
  rowStyle.borderColor = normalizeSides(rowStyle.borderColor);
  rowStyle.align = normalizeAlignment(rowStyle.align);
  rowStyle = deepMerge(defaultRowStyle, rowStyle);
  const document = this.document;
  const page = document.page;
  const contentHeight = page.contentHeight;
  if (rowStyle.height == null || rowStyle.height === 'auto') {
    rowStyle.height = 'auto';
  } else {
    rowStyle.height = document.sizeToPoint(rowStyle.height, 0, page, contentHeight);
  }
  rowStyle.minHeight = document.sizeToPoint(rowStyle.minHeight, 0, page, contentHeight);
  rowStyle.maxHeight = document.sizeToPoint(rowStyle.maxHeight, 0, page, contentHeight);
  return rowStyle;
}
function normalizedColumnStyle(defaultColStyle, colStyleInternal, i) {
  let colStyle = colStyleInternal(i);
  if (colStyle == null || typeof colStyle !== 'object') {
    colStyle = {
      width: colStyle
    };
  }
  colStyle.padding = normalizeSides(colStyle.padding);
  colStyle.border = normalizeSides(colStyle.border);
  colStyle.borderColor = normalizeSides(colStyle.borderColor);
  colStyle.align = normalizeAlignment(colStyle.align);
  colStyle = deepMerge(defaultColStyle, colStyle);
  if (colStyle.width == null || colStyle.width === '*') {
    colStyle.width = '*';
  } else {
    colStyle.width = this.document.sizeToPoint(colStyle.width, 0, this.document.page, this._maxWidth);
  }
  colStyle.minWidth = this.document.sizeToPoint(colStyle.minWidth, 0, this.document.page, this._maxWidth);
  colStyle.maxWidth = this.document.sizeToPoint(colStyle.maxWidth, 0, this.document.page, this._maxWidth);
  return colStyle;
}
function normalizeAlignment(align) {
  return align == null || typeof align === 'string' ? {
    x: align,
    y: align
  } : align;
}

function normalizeTable() {
  const doc = this.document;
  const opts = this.opts;
  let index = doc._tableIndex++;
  this._id = new String(opts.id ?? `table-${index}`);
  this._position = {
    x: doc.sizeToPoint(opts.position?.x, doc.x),
    y: doc.sizeToPoint(opts.position?.y, doc.y)
  };
  this._maxWidth = doc.sizeToPoint(opts.maxWidth, doc.page.width - doc.page.margins.right - this._position.x);
  const {
    defaultStyle,
    defaultColStyle,
    defaultRowStyle
  } = normalizedDefaultStyle(opts.defaultStyle);
  this._defaultStyle = defaultStyle;
  let colStyle;
  if (opts.columnStyles) {
    if (Array.isArray(opts.columnStyles)) {
      colStyle = i => opts.columnStyles[i];
    } else if (typeof opts.columnStyles === 'function') {
      colStyle = memoize(i => opts.columnStyles(i), Infinity);
    } else if (typeof opts.columnStyles === 'object') {
      colStyle = () => opts.columnStyles;
    }
  }
  if (!colStyle) colStyle = () => ({});
  this._colStyle = normalizedColumnStyle.bind(this, defaultColStyle, colStyle);
  let rowStyle;
  if (opts.rowStyles) {
    if (Array.isArray(opts.rowStyles)) {
      rowStyle = i => opts.rowStyles[i];
    } else if (typeof opts.rowStyles === 'function') {
      rowStyle = memoize(i => opts.rowStyles(i), 10);
    } else if (typeof opts.rowStyles === 'object') {
      rowStyle = () => opts.rowStyles;
    }
  }
  if (!rowStyle) rowStyle = () => ({});
  this._rowStyle = normalizedRowStyle.bind(this, defaultRowStyle, rowStyle);
}
function normalizeText(text) {
  if (text != null) text = `${text}`;
  return text;
}
function normalizeCell(cell, rowIndex, colIndex) {
  const colStyle = this._colStyle(colIndex);
  let rowStyle = this._rowStyle(rowIndex);
  const font = deepMerge({}, colStyle.font, rowStyle.font, cell.font);
  const customFont = Object.values(font).filter(v => v != null).length > 0;
  const doc = this.document;
  const rollbackFont = doc._fontSource;
  const rollbackFontSize = doc._fontSize;
  const rollbackFontFamily = doc._fontFamily;
  if (customFont) {
    if (font.src) doc.font(font.src, font.family);
    if (font.size) doc.fontSize(font.size);
    rowStyle = this._rowStyle(rowIndex);
  }
  cell.padding = normalizeSides(cell.padding);
  cell.border = normalizeSides(cell.border);
  cell.borderColor = normalizeSides(cell.borderColor);
  const config = deepMerge(this._defaultStyle, colStyle, rowStyle, cell);
  config.rowIndex = rowIndex;
  config.colIndex = colIndex;
  config.font = font ?? {};
  config.customFont = customFont;
  config.text = normalizeText(config.text);
  config.rowSpan = config.rowSpan ?? 1;
  config.colSpan = config.colSpan ?? 1;
  config.padding = normalizeSides(config.padding, '0.25em', x => doc.sizeToPoint(x, '0.25em'));
  config.border = normalizeSides(config.border, 1, x => doc.sizeToPoint(x, 1));
  config.borderColor = normalizeSides(config.borderColor, 'black', x => x ?? 'black');
  config.align = normalizeAlignment(config.align);
  config.align.x = config.align.x ?? 'left';
  config.align.y = config.align.y ?? 'top';
  config.textStroke = doc.sizeToPoint(config.textStroke, 0);
  config.textStrokeColor = config.textStrokeColor ?? 'black';
  config.textColor = config.textColor ?? 'black';
  config.textOptions = config.textOptions ?? {};
  config.id = new String(config.id ?? `${this._id}-${rowIndex}-${colIndex}`);
  config.type = config.type?.toUpperCase() === 'TH' ? 'TH' : 'TD';
  if (config.scope) {
    config.scope = config.scope.toLowerCase();
    if (config.scope === 'row') config.scope = 'Row';else if (config.scope === 'both') config.scope = 'Both';else if (config.scope === 'column') config.scope = 'Column';
  }
  if (typeof this.opts.debug === 'boolean') config.debug = this.opts.debug;
  if (customFont) doc.font(rollbackFont, rollbackFontFamily, rollbackFontSize);
  return config;
}
function normalizeRow(row, rowIndex) {
  if (!this._cellClaim) this._cellClaim = new Set();
  let colIndex = 0;
  return row.map(cell => {
    if (cell == null || typeof cell !== 'object') cell = {
      text: cell
    };
    while (this._cellClaim.has(`${rowIndex},${colIndex}`)) {
      colIndex++;
    }
    cell = normalizeCell.call(this, cell, rowIndex, colIndex);
    for (let i = 0; i < cell.rowSpan; i++) {
      for (let j = 0; j < cell.colSpan; j++) {
        this._cellClaim.add(`${rowIndex + i},${colIndex + j}`);
      }
    }
    colIndex += cell.colSpan;
    return cell;
  });
}

function ensure(row) {
  this._columnWidths = [];
  ensureColumnWidths.call(this, row.reduce((a, cell) => a + cell.colSpan, 0));
  this._rowHeights = [];
  this._rowYPos = [this._position.y];
  this._rowBuffer = new Set();
}
function ensureColumnWidths(numCols) {
  let starColumnIndexes = [];
  let starMinAcc = 0;
  let unclaimedWidth = this._maxWidth;
  for (let i = 0; i < numCols; i++) {
    let col = this._colStyle(i);
    if (col.width === '*') {
      starColumnIndexes[i] = col;
      starMinAcc += col.minWidth;
    } else {
      unclaimedWidth -= col.width;
      this._columnWidths[i] = col.width;
    }
  }
  let starColCount = starColumnIndexes.reduce(x => x + 1, 0);
  if (starMinAcc >= unclaimedWidth) {
    starColumnIndexes.forEach((cell, i) => {
      this._columnWidths[i] = cell.minWidth;
    });
  } else if (starColCount > 0) {
    starColumnIndexes.forEach((col, i) => {
      let starSize = unclaimedWidth / starColCount;
      this._columnWidths[i] = Math.max(starSize, col.minWidth);
      if (col.maxWidth > 0) {
        this._columnWidths[i] = Math.min(this._columnWidths[i], col.maxWidth);
      }
      unclaimedWidth -= this._columnWidths[i];
      starColCount--;
    });
  }
  let tempX = this._position.x;
  this._columnXPos = Array.from(this._columnWidths, v => {
    const t = tempX;
    tempX += v;
    return t;
  });
}
function measure(row, rowIndex) {
  row.forEach(cell => this._rowBuffer.add(cell));
  if (rowIndex > 0) {
    this._rowYPos[rowIndex] = this._rowYPos[rowIndex - 1] + this._rowHeights[rowIndex - 1];
  }
  const rowStyle = this._rowStyle(rowIndex);
  let toRender = [];
  this._rowBuffer.forEach(cell => {
    if (cell.rowIndex + cell.rowSpan - 1 === rowIndex) {
      toRender.push(measureCell.call(this, cell, rowStyle.height));
      this._rowBuffer.delete(cell);
    }
  });
  let rowHeight = rowStyle.height;
  if (rowHeight === 'auto') {
    rowHeight = toRender.reduce((acc, cell) => {
      let minHeight = cell.textBounds.height + cell.padding.top + cell.padding.bottom;
      for (let i = 0; i < cell.rowSpan - 1; i++) {
        minHeight -= this._rowHeights[cell.rowIndex + i];
      }
      return Math.max(acc, minHeight);
    }, 0);
  }
  rowHeight = Math.max(rowHeight, rowStyle.minHeight);
  if (rowStyle.maxHeight > 0) {
    rowHeight = Math.min(rowHeight, rowStyle.maxHeight);
  }
  this._rowHeights[rowIndex] = rowHeight;
  let newPage = false;
  if (rowHeight > this.document.page.contentHeight) {
    console.warn(new Error(`Row ${rowIndex} requested more than the safe page height, row has been clamped`).stack.slice(7));
    this._rowHeights[rowIndex] = this.document.page.maxY() - this._rowYPos[rowIndex];
  } else if (this._rowYPos[rowIndex] + rowHeight >= this.document.page.maxY()) {
    this._rowYPos[rowIndex] = this.document.page.margins.top;
    newPage = true;
  }
  return {
    newPage,
    toRender: toRender.map(cell => measureCell.call(this, cell, rowHeight))
  };
}
function measureCell(cell, rowHeight) {
  let cellWidth = 0;
  for (let i = 0; i < cell.colSpan; i++) {
    cellWidth += this._columnWidths[cell.colIndex + i];
  }
  let cellHeight = rowHeight;
  if (cellHeight === 'auto') {
    cellHeight = this.document.page.contentHeight;
  } else {
    for (let i = 0; i < cell.rowSpan - 1; i++) {
      cellHeight += this._rowHeights[cell.rowIndex + i];
    }
  }
  const textAllocatedWidth = cellWidth - cell.padding.left - cell.padding.right;
  const textAllocatedHeight = cellHeight - cell.padding.top - cell.padding.bottom;
  const rotation = cell.textOptions.rotation ?? 0;
  const {
    width: textMaxWidth,
    height: textMaxHeight
  } = computeBounds(rotation, textAllocatedWidth, textAllocatedHeight);
  const textOptions = {
    align: cell.align.x,
    ellipsis: true,
    stroke: cell.textStroke > 0,
    fill: true,
    width: textMaxWidth,
    height: textMaxHeight,
    rotation,
    ...cell.textOptions
  };
  let textBounds = {
    x: 0,
    y: 0,
    width: 0,
    height: 0
  };
  if (cell.text) {
    const rollbackFont = this.document._fontSource;
    const rollbackFontSize = this.document._fontSize;
    const rollbackFontFamily = this.document._fontFamily;
    if (cell.font?.src) this.document.font(cell.font.src, cell.font?.family);
    if (cell.font?.size) this.document.fontSize(cell.font.size);
    const unRotatedTextBounds = this.document.boundsOfString(cell.text, 0, 0, {
      ...textOptions,
      rotation: 0
    });
    textOptions.width = unRotatedTextBounds.width;
    textOptions.height = unRotatedTextBounds.height;
    textBounds = this.document.boundsOfString(cell.text, 0, 0, textOptions);
    this.document.font(rollbackFont, rollbackFontFamily, rollbackFontSize);
  }
  return {
    ...cell,
    textOptions,
    x: this._columnXPos[cell.colIndex],
    y: this._rowYPos[cell.rowIndex],
    textX: this._columnXPos[cell.colIndex] + cell.padding.left,
    textY: this._rowYPos[cell.rowIndex] + cell.padding.top,
    width: cellWidth,
    height: cellHeight,
    textAllocatedHeight,
    textAllocatedWidth,
    textBounds
  };
}
function computeBounds(rotation, allocWidth, allocHeight) {
  let textMaxWidth, textMaxHeight;
  const cos = cosine(rotation);
  const sin = sine(rotation);
  if (rotation === 0 || rotation === 180) {
    textMaxWidth = allocWidth;
    textMaxHeight = allocHeight;
  } else if (rotation === 90 || rotation === 270) {
    textMaxWidth = allocHeight;
    textMaxHeight = allocWidth;
  } else if (rotation < 90 || rotation > 180 && rotation < 270) {
    textMaxWidth = allocWidth / (2 * cos);
    textMaxHeight = allocWidth / (2 * sin);
  } else {
    textMaxHeight = allocWidth / (2 * cos);
    textMaxWidth = allocWidth / (2 * sin);
  }
  const EF = sin * textMaxWidth;
  const FG = cos * textMaxHeight;
  if (EF + FG > allocHeight) {
    const denominator = cos * cos - sin * sin;
    if (rotation === 0 || rotation === 180) {
      textMaxWidth = allocWidth;
      textMaxHeight = allocHeight;
    } else if (rotation === 90 || rotation === 270) {
      textMaxWidth = allocHeight;
      textMaxHeight = allocWidth;
    } else if (rotation < 90 || rotation > 180 && rotation < 270) {
      textMaxWidth = (allocWidth * cos - allocHeight * sin) / denominator;
      textMaxHeight = (allocHeight * cos - allocWidth * sin) / denominator;
    } else {
      textMaxHeight = (allocWidth * cos - allocHeight * sin) / denominator;
      textMaxWidth = (allocHeight * cos - allocWidth * sin) / denominator;
    }
  }
  return {
    width: Math.abs(textMaxWidth),
    height: Math.abs(textMaxHeight)
  };
}

function accommodateTable() {
  const structParent = this.opts.structParent;
  if (structParent) {
    this._tableStruct = this.document.struct('Table');
    this._tableStruct.dictionary.data.ID = this._id;
    if (structParent instanceof PDFStructureElement) {
      structParent.add(this._tableStruct);
    } else if (structParent instanceof PDFDocument) {
      structParent.addStructure(this._tableStruct);
    }
    this._headerRowLookup = {};
    this._headerColumnLookup = {};
  }
}
function accommodateCleanup() {
  if (this._tableStruct) this._tableStruct.end();
}
function accessibleRow(row, rowIndex, renderCell) {
  const rowStruct = this.document.struct('TR');
  rowStruct.dictionary.data.ID = new String(`${this._id}-${rowIndex}`);
  this._tableStruct.add(rowStruct);
  row.forEach(cell => renderCell(cell, rowStruct));
  rowStruct.end();
}
function accessibleCell(cell, rowStruct, callback) {
  const doc = this.document;
  const cellStruct = doc.struct(cell.type, {
    title: cell.title
  });
  cellStruct.dictionary.data.ID = cell.id;
  rowStruct.add(cellStruct);
  const padding = cell.padding;
  const border = cell.border;
  const attributes = {
    O: 'Table',
    Width: cell.width,
    Height: cell.height,
    Padding: [padding.top, padding.bottom, padding.left, padding.right],
    RowSpan: cell.rowSpan > 1 ? cell.rowSpan : undefined,
    ColSpan: cell.colSpan > 1 ? cell.colSpan : undefined,
    BorderThickness: [border.top, border.bottom, border.left, border.right]
  };
  if (cell.type === 'TH') {
    if (cell.scope === 'Row' || cell.scope === 'Both') {
      for (let i = 0; i < cell.rowSpan; i++) {
        if (!this._headerRowLookup[cell.rowIndex + i]) {
          this._headerRowLookup[cell.rowIndex + i] = [];
        }
        this._headerRowLookup[cell.rowIndex + i].push(cell.id);
      }
      attributes.Scope = cell.scope;
    }
    if (cell.scope === 'Column' || cell.scope === 'Both') {
      for (let i = 0; i < cell.colSpan; i++) {
        if (!this._headerColumnLookup[cell.colIndex + i]) {
          this._headerColumnLookup[cell.colIndex + i] = [];
        }
        this._headerColumnLookup[cell.colIndex + i].push(cell.id);
      }
      attributes.Scope = cell.scope;
    }
  }
  const Headers = new Set([...Array.from({
    length: cell.colSpan
  }, (_, i) => this._headerColumnLookup[cell.colIndex + i]).flat(), ...Array.from({
    length: cell.rowSpan
  }, (_, i) => this._headerRowLookup[cell.rowIndex + i]).flat()].filter(Boolean));
  if (Headers.size) attributes.Headers = Array.from(Headers);
  const normalizeColor = doc._normalizeColor;
  if (cell.backgroundColor != null) {
    attributes.BackgroundColor = normalizeColor(cell.backgroundColor);
  }
  const hasBorder = [border.top, border.bottom, border.left, border.right];
  if (hasBorder.some(x => x)) {
    const borderColor = cell.borderColor;
    attributes.BorderColor = [hasBorder[0] ? normalizeColor(borderColor.top) : null, hasBorder[1] ? normalizeColor(borderColor.bottom) : null, hasBorder[2] ? normalizeColor(borderColor.left) : null, hasBorder[3] ? normalizeColor(borderColor.right) : null];
  }
  Object.keys(attributes).forEach(key => attributes[key] === undefined && delete attributes[key]);
  cellStruct.dictionary.data.A = doc.ref(attributes);
  cellStruct.add(callback);
  cellStruct.end();
  cellStruct.dictionary.data.A.end();
}

function renderRow(row, rowIndex) {
  if (this._tableStruct) {
    accessibleRow.call(this, row, rowIndex, renderCell.bind(this));
  } else {
    row.forEach(cell => renderCell.call(this, cell));
  }
  return this._rowYPos[rowIndex] + this._rowHeights[rowIndex];
}
function renderCell(cell, rowStruct) {
  const cellRenderer = () => {
    if (cell.backgroundColor != null) {
      this.document.save().fillColor(cell.backgroundColor).rect(cell.x, cell.y, cell.width, cell.height).fill().restore();
    }
    renderBorder.call(this, cell.border, cell.borderColor, cell.x, cell.y, cell.width, cell.height);
    if (cell.debug) {
      this.document.save();
      this.document.dash(1, {
        space: 1
      }).lineWidth(1).strokeOpacity(0.3);
      this.document.rect(cell.x, cell.y, cell.width, cell.height).stroke('green');
      this.document.restore();
    }
    if (cell.text) renderCellText.call(this, cell);
  };
  if (rowStruct) accessibleCell.call(this, cell, rowStruct, cellRenderer);else cellRenderer();
}
function renderCellText(cell) {
  const doc = this.document;
  const rollbackFont = doc._fontSource;
  const rollbackFontSize = doc._fontSize;
  const rollbackFontFamily = doc._fontFamily;
  if (cell.customFont) {
    if (cell.font.src) doc.font(cell.font.src, cell.font.family);
    if (cell.font.size) doc.fontSize(cell.font.size);
  }
  const x = cell.textX;
  const y = cell.textY;
  const Ah = cell.textAllocatedHeight;
  const Aw = cell.textAllocatedWidth;
  const Cw = cell.textBounds.width;
  const Ch = cell.textBounds.height;
  const Ox = -cell.textBounds.x;
  const Oy = -cell.textBounds.y;
  const PxScale = cell.align.x === 'right' ? 1 : cell.align.x === 'center' ? 0.5 : 0;
  const Px = (Aw - Cw) * PxScale;
  const PyScale = cell.align.y === 'bottom' ? 1 : cell.align.y === 'center' ? 0.5 : 0;
  const Py = (Ah - Ch) * PyScale;
  const dx = Px + Ox;
  const dy = Py + Oy;
  if (cell.debug) {
    doc.save();
    doc.dash(1, {
      space: 1
    }).lineWidth(1).strokeOpacity(0.3);
    if (cell.text) {
      doc.moveTo(x + Px, y).lineTo(x + Px, y + Ah).moveTo(x + Px + Cw, y).lineTo(x + Px + Cw, y + Ah).stroke('blue').moveTo(x, y + Py).lineTo(x + Aw, y + Py).moveTo(x, y + Py + Ch).lineTo(x + Aw, y + Py + Ch).stroke('green');
    }
    doc.rect(x, y, Aw, Ah).stroke('orange');
    doc.restore();
  }
  doc.save().rect(x, y, Aw, Ah).clip();
  doc.fillColor(cell.textColor).strokeColor(cell.textStrokeColor);
  if (cell.textStroke > 0) doc.lineWidth(cell.textStroke);
  doc.text(cell.text, x + dx, y + dy, cell.textOptions);
  doc.restore();
  if (cell.font) doc.font(rollbackFont, rollbackFontFamily, rollbackFontSize);
}
function renderBorder(border, borderColor, x, y, width, height, mask) {
  border = Object.fromEntries(Object.entries(border).map(([k, v]) => [k, mask && !mask[k] ? 0 : v]));
  const doc = this.document;
  if ([border.right, border.bottom, border.left].every(val => val === border.top)) {
    if (border.top > 0) {
      doc.save().lineWidth(border.top).strokeColor(borderColor.top).rect(x, y, width, height).stroke().restore();
    }
  } else {
    if (border.top > 0) {
      doc.save().lineWidth(border.top).moveTo(x, y).strokeColor(borderColor.top).lineTo(x + width, y).stroke().restore();
    }
    if (border.right > 0) {
      doc.save().lineWidth(border.right).moveTo(x + width, y).strokeColor(borderColor.right).lineTo(x + width, y + height).stroke().restore();
    }
    if (border.bottom > 0) {
      doc.save().lineWidth(border.bottom).moveTo(x + width, y + height).strokeColor(borderColor.bottom).lineTo(x, y + height).stroke().restore();
    }
    if (border.left > 0) {
      doc.save().lineWidth(border.left).moveTo(x, y + height).strokeColor(borderColor.left).lineTo(x, y).stroke().restore();
    }
  }
}

class PDFTable {
  constructor(document, opts = {}) {
    this.document = document;
    this.opts = Object.freeze(opts);
    normalizeTable.call(this);
    accommodateTable.call(this);
    this._currRowIndex = 0;
    this._ended = false;
    if (opts.data) {
      for (const row of opts.data) this.row(row);
      return this.end();
    }
  }
  row(row, lastRow = false) {
    if (this._ended) {
      throw new Error(`Table was marked as ended on row ${this._currRowIndex}`);
    }
    row = Array.from(row);
    row = normalizeRow.call(this, row, this._currRowIndex);
    if (this._currRowIndex === 0) ensure.call(this, row);
    const {
      newPage,
      toRender
    } = measure.call(this, row, this._currRowIndex);
    if (newPage) this.document.continueOnNewPage();
    const yPos = renderRow.call(this, toRender, this._currRowIndex);
    this.document.x = this._position.x;
    this.document.y = yPos;
    if (lastRow) return this.end();
    this._currRowIndex++;
    return this;
  }
  end() {
    while (this._rowBuffer?.size) this.row([]);
    this._ended = true;
    accommodateCleanup.call(this);
    return this.document;
  }
}

var TableMixin = {
  initTables() {
    this._tableIndex = 0;
  },
  table(opts) {
    return new PDFTable(this, opts);
  }
};

class PDFMetadata {
  constructor() {
    this._metadata = `
        <?xpacket begin="\ufeff" id="W5M0MpCehiHzreSzNTczkc9d"?>
            <x:xmpmeta xmlns:x="adobe:ns:meta/">
                <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
        `;
  }
  _closeTags() {
    this._metadata = this._metadata.concat(`
                </rdf:RDF>
            </x:xmpmeta>
        <?xpacket end="w"?>
        `);
  }
  append(xml, newline = true) {
    this._metadata = this._metadata.concat(xml);
    if (newline) this._metadata = this._metadata.concat('\n');
  }
  getXML() {
    return this._metadata;
  }
  getLength() {
    return this._metadata.length;
  }
  end() {
    this._closeTags();
    this._metadata = this._metadata.trim();
  }
}

var MetadataMixin = {
  initMetadata() {
    this.metadata = new PDFMetadata();
  },
  appendXML(xml, newline = true) {
    this.metadata.append(xml, newline);
  },
  _addInfo() {
    this.appendXML(`
        <rdf:Description rdf:about="" xmlns:xmp="http://ns.adobe.com/xap/1.0/">
            <xmp:CreateDate>${this.info.CreationDate.toISOString().split('.')[0] + 'Z'}</xmp:CreateDate>
            <xmp:CreatorTool>${this.info.Creator}</xmp:CreatorTool>
        </rdf:Description>
        `);
    if (this.info.Title || this.info.Author || this.info.Subject) {
      this.appendXML(`
            <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">
            `);
      if (this.info.Title) {
        this.appendXML(`
                <dc:title>
                    <rdf:Alt>
                        <rdf:li xml:lang="x-default">${this.info.Title}</rdf:li>
                    </rdf:Alt>
                </dc:title>
                `);
      }
      if (this.info.Author) {
        this.appendXML(`
                <dc:creator>
                    <rdf:Seq>
                        <rdf:li>${this.info.Author}</rdf:li>
                    </rdf:Seq>
                </dc:creator>
                `);
      }
      if (this.info.Subject) {
        this.appendXML(`
                <dc:description>
                    <rdf:Alt>
                        <rdf:li xml:lang="x-default">${this.info.Subject}</rdf:li>
                    </rdf:Alt>
                </dc:description>
                `);
      }
      this.appendXML(`
            </rdf:Description>
            `);
    }
    this.appendXML(`
        <rdf:Description rdf:about="" xmlns:pdf="http://ns.adobe.com/pdf/1.3/">
            <pdf:Producer>${this.info.Producer}</pdf:Producer>`, false);
    if (this.info.Keywords) {
      this.appendXML(`
            <pdf:Keywords>${this.info.Keywords}</pdf:Keywords>`, false);
    }
    this.appendXML(`
        </rdf:Description>
        `);
  },
  endMetadata() {
    this._addInfo();
    this.metadata.end();
    if (this.version != 1.3) {
      this.metadataRef = this.ref({
        length: this.metadata.getLength(),
        Type: 'Metadata',
        Subtype: 'XML'
      });
      this.metadataRef.compress = false;
      this.metadataRef.write(Buffer.from(this.metadata.getXML(), 'utf-8'));
      this.metadataRef.end();
      this._root.data.Metadata = this.metadataRef;
    }
  }
};

class PDFDocument extends stream.Readable {
  constructor(options = {}) {
    super(options);
    this.options = options;
    switch (options.pdfVersion) {
      case '1.4':
        this.version = 1.4;
        break;
      case '1.5':
        this.version = 1.5;
        break;
      case '1.6':
        this.version = 1.6;
        break;
      case '1.7':
      case '1.7ext3':
        this.version = 1.7;
        break;
      default:
        this.version = 1.3;
        break;
    }
    this.compress = this.options.compress != null ? this.options.compress : true;
    this._pageBuffer = [];
    this._pageBufferStart = 0;
    this._offsets = [];
    this._waiting = 0;
    this._ended = false;
    this._offset = 0;
    const Pages = this.ref({
      Type: 'Pages',
      Count: 0,
      Kids: []
    });
    const Names = this.ref({
      Dests: new PDFNameTree()
    });
    this._root = this.ref({
      Type: 'Catalog',
      Pages,
      Names
    });
    if (this.options.lang) {
      this._root.data.Lang = new String(this.options.lang);
    }
    if (this.options.pageLayout) {
      const layout = this.options.pageLayout;
      this._root.data.PageLayout = layout.charAt(0).toUpperCase() + layout.slice(1);
    }
    this.page = null;
    this.initMetadata();
    this.initColor();
    this.initVector();
    this.initFonts(options.font);
    this.initText();
    this.initImages();
    this.initOutline();
    this.initMarkings(options);
    this.initTables();
    this.initSubset(options);
    this.info = {
      Producer: 'PDFKit',
      Creator: 'PDFKit',
      CreationDate: new Date()
    };
    if (this.options.info) {
      for (let key in this.options.info) {
        const val = this.options.info[key];
        this.info[key] = val;
      }
    }
    if (this.options.displayTitle) {
      this._root.data.ViewerPreferences = this.ref({
        DisplayDocTitle: true
      });
    }
    this._id = PDFSecurity.generateFileID(this.info);
    this._security = PDFSecurity.create(this, options);
    this._write(`%PDF-${this.version}`);
    this._write('%\xFF\xFF\xFF\xFF');
    if (this.options.autoFirstPage !== false) {
      this.addPage();
    }
  }
  addPage(options) {
    if (options == null) {
      ({
        options
      } = this);
    }
    if (!this.options.bufferPages) {
      this.flushPages();
    }
    this.page = new PDFPage(this, options);
    this._pageBuffer.push(this.page);
    const pages = this._root.data.Pages.data;
    pages.Kids.push(this.page.dictionary);
    pages.Count++;
    this.x = this.page.margins.left;
    this.y = this.page.margins.top;
    this._ctm = [1, 0, 0, 1, 0, 0];
    this.transform(1, 0, 0, -1, 0, this.page.height);
    this.emit('pageAdded');
    return this;
  }
  continueOnNewPage(options) {
    const pageMarkings = this.endPageMarkings(this.page);
    this.addPage(options ?? this.page._options);
    this.initPageMarkings(pageMarkings);
    return this;
  }
  bufferedPageRange() {
    return {
      start: this._pageBufferStart,
      count: this._pageBuffer.length
    };
  }
  switchToPage(n) {
    let page;
    if (!(page = this._pageBuffer[n - this._pageBufferStart])) {
      throw new Error(`switchToPage(${n}) out of bounds, current buffer covers pages ${this._pageBufferStart} to ${this._pageBufferStart + this._pageBuffer.length - 1}`);
    }
    return this.page = page;
  }
  flushPages() {
    const pages = this._pageBuffer;
    this._pageBuffer = [];
    this._pageBufferStart += pages.length;
    for (let page of pages) {
      this.endPageMarkings(page);
      page.end();
    }
  }
  addNamedDestination(name, ...args) {
    if (args.length === 0) {
      args = ['XYZ', null, null, null];
    }
    if (args[0] === 'XYZ' && args[2] !== null) {
      args[2] = this.page.height - args[2];
    }
    args.unshift(this.page.dictionary);
    this._root.data.Names.data.Dests.add(name, args);
  }
  addNamedEmbeddedFile(name, ref) {
    if (!this._root.data.Names.data.EmbeddedFiles) {
      this._root.data.Names.data.EmbeddedFiles = new PDFNameTree({
        limits: false
      });
    }
    this._root.data.Names.data.EmbeddedFiles.add(name, ref);
  }
  addNamedJavaScript(name, js) {
    if (!this._root.data.Names.data.JavaScript) {
      this._root.data.Names.data.JavaScript = new PDFNameTree();
    }
    let data = {
      JS: new String(js),
      S: 'JavaScript'
    };
    this._root.data.Names.data.JavaScript.add(name, data);
  }
  ref(data) {
    const ref = new PDFReference(this, this._offsets.length + 1, data);
    this._offsets.push(null);
    this._waiting++;
    return ref;
  }
  _read() {}
  _write(data) {
    if (!Buffer.isBuffer(data)) {
      data = Buffer.from(data + '\n', 'binary');
    }
    this.push(data);
    this._offset += data.length;
  }
  addContent(data) {
    this.page.write(data);
    return this;
  }
  _refEnd(ref) {
    this._offsets[ref.id - 1] = ref.offset;
    if (--this._waiting === 0 && this._ended) {
      this._finalize();
      this._ended = false;
    }
  }
  end() {
    this.flushPages();
    this._info = this.ref();
    for (let key in this.info) {
      let val = this.info[key];
      if (typeof val === 'string') {
        val = new String(val);
      }
      let entry = this.ref(val);
      entry.end();
      this._info.data[key] = entry;
    }
    this._info.end();
    for (let name in this._fontFamilies) {
      const font = this._fontFamilies[name];
      font.finalize();
    }
    this.endOutline();
    this.endMarkings();
    if (this.subset) {
      this.endSubset();
    }
    this.endMetadata();
    this._root.end();
    this._root.data.Pages.end();
    this._root.data.Names.end();
    this.endAcroForm();
    if (this._root.data.ViewerPreferences) {
      this._root.data.ViewerPreferences.end();
    }
    if (this._security) {
      this._security.end();
    }
    if (this._waiting === 0) {
      this._finalize();
    } else {
      this._ended = true;
    }
  }
  _finalize() {
    const xRefOffset = this._offset;
    this._write('xref');
    this._write(`0 ${this._offsets.length + 1}`);
    this._write('0000000000 65535 f ');
    for (let offset of this._offsets) {
      offset = `0000000000${offset}`.slice(-10);
      this._write(offset + ' 00000 n ');
    }
    const trailer = {
      Size: this._offsets.length + 1,
      Root: this._root,
      Info: this._info,
      ID: [this._id, this._id]
    };
    if (this._security) {
      trailer.Encrypt = this._security.dictionary;
    }
    this._write('trailer');
    this._write(PDFObject.convert(trailer));
    this._write('startxref');
    this._write(`${xRefOffset}`);
    this._write('%%EOF');
    this.push(null);
  }
  toString() {
    return '[object PDFDocument]';
  }
}
const mixin = methods => {
  Object.assign(PDFDocument.prototype, methods);
};
mixin(MetadataMixin);
mixin(ColorMixin);
mixin(VectorMixin);
mixin(FontsMixin);
mixin(TextMixin);
mixin(ImagesMixin);
mixin(AnnotationsMixin);
mixin(OutlineMixin);
mixin(MarkingsMixin);
mixin(AcroFormMixin);
mixin(AttachmentsMixin);
mixin(SubsetMixin);
mixin(TableMixin);
PDFDocument.LineWrapper = LineWrapper;

module.exports = PDFDocument;
//# sourceMappingURL=pdfkit.js.map
