import { gunzipSync, gzipSync } from 'node:zlib';

// Minimal tar.gz writer for fixtures: regular files only.
function header(name: string, size: number, type: string): Buffer {
  const h = Buffer.alloc(512);
  h.write(name, 0);
  h.write('0000644\0', 100);
  h.write('0000000\0', 108);
  h.write('0000000\0', 116);
  h.write(size.toString(8).padStart(11, '0') + '\0', 124);
  h.write('00000000000\0', 136);
  h.write('        ', 148);
  h.write(type, 156);
  h.write('ustar\0', 257);
  h.write('00', 263);
  let sum = 0;
  for (const b of h) sum += b;
  h.write(sum.toString(8).padStart(6, '0') + '\0 ', 148);
  return h;
}

// pax record: "<len> key=value\n" where len counts the whole record including its own digits.
export function paxRecord(key: string, value: string): string {
  const body = ` ${key}=${value}\n`;
  let len = body.length + 1;
  while (String(len).length + body.length !== len) len = String(len).length + body.length;
  return `${len}${body}`;
}

// Same as GitHub codeload: a leading pax global header (typeflag 'g') with the given records.
export function tgzWithGlobalHeader(files: Record<string, string>, records: Record<string, string>): Buffer {
  const text = Buffer.from(Object.entries(records).map(([k, v]) => paxRecord(k, v)).join(''));
  const head = Buffer.concat([header('pax_global_header', text.length, 'g'), text, Buffer.alloc((512 - (text.length % 512)) % 512)]);
  return gzipSync(Buffer.concat([head, gunzipSync(tgzOf(files))]));
}

export function tgzOf(files: Record<string, string>): Buffer {
  const parts: Buffer[] = [];
  for (const [name, text] of Object.entries(files)) {
    const data = Buffer.from(text);
    const h = Buffer.alloc(512);
    h.write(name, 0);
    h.write('0000644\0', 100);
    h.write('0000000\0', 108);
    h.write('0000000\0', 116);
    h.write(data.length.toString(8).padStart(11, '0') + '\0', 124);
    h.write('00000000000\0', 136);
    h.write('        ', 148);
    h.write('0', 156);
    h.write('ustar\0', 257);
    h.write('00', 263);
    let sum = 0;
    for (const b of h) sum += b;
    h.write(sum.toString(8).padStart(6, '0') + '\0 ', 148);
    parts.push(h, data, Buffer.alloc((512 - (data.length % 512)) % 512));
  }
  parts.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(parts));
}
