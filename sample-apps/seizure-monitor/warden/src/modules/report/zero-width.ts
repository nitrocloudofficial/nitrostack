/**
 * A tiny steganography scheme used to plant (and detect) instructions
 * hidden entirely inside invisible zero-width Unicode characters.
 *
 *   U+FEFF (ZWNBSP)  -> start marker
 *   U+200B (ZWSP)    -> bit 0
 *   U+200C (ZWNJ)    -> bit 1
 *
 * Every character of the hidden message is packed as 8 bits. Because all
 * three code points render with zero width, the encoded payload is
 * completely invisible in a normal browser or text preview — but it is
 * still literal text in the DOM, which is exactly what makes it dangerous
 * to feed to a model.
 */

const START_MARKER = "﻿";
const ZERO = "​";
const ONE = "‌";
export const ZERO_WIDTH_CHARS = [START_MARKER, ZERO, ONE, "‍"];

export function encodeZeroWidthMessage(message: string): string {
  let bits = "";
  for (let i = 0; i < message.length; i++) {
    bits += message.charCodeAt(i).toString(2).padStart(8, "0");
  }
  let out = START_MARKER;
  for (const bit of bits) out += bit === "0" ? ZERO : ONE;
  return out;
}

export function decodeZeroWidthMessage(text: string): string | null {
  const markerIdx = text.indexOf(START_MARKER);
  if (markerIdx === -1) return null;
  let bits = "";
  let i = markerIdx + 1;
  while (i < text.length && (text[i] === ZERO || text[i] === ONE)) {
    bits += text[i] === ZERO ? "0" : "1";
    i++;
  }
  if (bits.length < 8) return null;
  let decoded = "";
  for (let j = 0; j + 8 <= bits.length; j += 8) {
    const code = parseInt(bits.slice(j, j + 8), 2);
    if (code < 32 || code > 126) {
      // Not printable ASCII — likely not our payload, stop decoding.
      if (decoded.length === 0) return null;
      break;
    }
    decoded += String.fromCharCode(code);
  }
  return decoded || null;
}
