import type { Encoding } from '../types';

const BOM_UTF8 = [0xef, 0xbb, 0xbf];
const BOM_UTF16LE = [0xff, 0xfe];
const BOM_UTF16BE = [0xfe, 0xff];

function hasBom(bytes: Uint8Array, bom: number[]): boolean {
  if (bytes.length < bom.length) return false;
  for (let i = 0; i < bom.length; i += 1) {
    if (bytes[i] !== bom[i]) return false;
  }
  return true;
}

/**
 * 探测文本编码：优先 BOM，其次 UTF-8（fatal 严格解码），失败回退 GB18030。
 * GB18030 是 GBK 超集，覆盖简体中文；Big5 繁体不在 MVP 范围内。
 */
export function detectEncoding(bytes: Uint8Array): Encoding {
  if (hasBom(bytes, BOM_UTF8)) return 'utf-8';
  if (hasBom(bytes, BOM_UTF16LE)) return 'utf-16le';
  if (hasBom(bytes, BOM_UTF16BE)) return 'utf-16be';

  try {
    new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return 'utf-8';
  } catch {
    return 'gb18030';
  }
}

/** 按探测到的编码解码为字符串，并剥离 BOM。 */
export function decodeText(bytes: Uint8Array): { text: string; encoding: Encoding } {
  if (hasBom(bytes, BOM_UTF8)) {
    return { text: new TextDecoder('utf-8').decode(bytes.subarray(3)), encoding: 'utf-8' };
  }
  if (hasBom(bytes, BOM_UTF16LE)) {
    return { text: new TextDecoder('utf-16le').decode(bytes.subarray(2)), encoding: 'utf-16le' };
  }
  if (hasBom(bytes, BOM_UTF16BE)) {
    return { text: new TextDecoder('utf-16be').decode(bytes.subarray(2)), encoding: 'utf-16be' };
  }

  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return { text, encoding: 'utf-8' };
  } catch {
    return { text: new TextDecoder('gb18030').decode(bytes), encoding: 'gb18030' };
  }
}
