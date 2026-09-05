import { describe, expect, it } from 'vitest';
import { decodeText, detectEncoding } from './encoding';

// 固定字节样本（避免依赖运行时 TextEncoder 只支持 UTF-8）。
const UTF8_BOM = [0xef, 0xbb, 0xbf];
const UTF8_你好 = [0xe4, 0xbd, 0xa0, 0xe5, 0xa5, 0xbd]; // "你好"
const GBK_你好 = [0xc4, 0xe3, 0xba, 0xc3]; // GBK: 你=C4E3 好=BAC3
const UTF16LE_BOM = [0xff, 0xfe];
const UTF16LE_你好 = [0x60, 0x4f, 0x7d, 0x59]; // "你好" UTF-16 LE
const UTF16BE_BOM = [0xfe, 0xff];
const UTF16BE_你好 = [0x4f, 0x60, 0x59, 0x7d]; // "你好" UTF-16 BE

function bytesOf(arr: number[]): Uint8Array {
  return new Uint8Array(arr);
}

describe('detectEncoding', () => {
  it('识别 UTF-8 BOM', () => {
    expect(detectEncoding(bytesOf([...UTF8_BOM, ...UTF8_你好]))).toBe('utf-8');
  });

  it('识别 UTF-16 LE BOM', () => {
    expect(detectEncoding(bytesOf([...UTF16LE_BOM, ...UTF16LE_你好]))).toBe('utf-16le');
  });

  it('识别 UTF-16 BE BOM', () => {
    expect(detectEncoding(bytesOf([...UTF16BE_BOM, ...UTF16BE_你好]))).toBe('utf-16be');
  });

  it('无 BOM 且为合法 UTF-8 时识别为 utf-8', () => {
    expect(detectEncoding(bytesOf(UTF8_你好))).toBe('utf-8');
  });

  it('无 BOM 且非法 UTF-8 时回退为 gb18030', () => {
    expect(detectEncoding(bytesOf(GBK_你好))).toBe('gb18030');
  });

  it('空字节视为 utf-8', () => {
    expect(detectEncoding(bytesOf([]))).toBe('utf-8');
  });
});

describe('decodeText', () => {
  it('UTF-8 BOM：剥离 BOM 并解码', () => {
    const { text, encoding } = decodeText(bytesOf([...UTF8_BOM, ...UTF8_你好]));
    expect(encoding).toBe('utf-8');
    expect(text).toBe('你好');
  });

  it('UTF-8 无 BOM', () => {
    const { text, encoding } = decodeText(bytesOf(UTF8_你好));
    expect(encoding).toBe('utf-8');
    expect(text).toBe('你好');
  });

  it('GBK（无 BOM）回退解码', () => {
    const { text, encoding } = decodeText(bytesOf(GBK_你好));
    expect(encoding).toBe('gb18030');
    expect(text).toBe('你好');
  });

  it('UTF-16 LE BOM：剥离 BOM 并解码', () => {
    const { text, encoding } = decodeText(bytesOf([...UTF16LE_BOM, ...UTF16LE_你好]));
    expect(encoding).toBe('utf-16le');
    expect(text).toBe('你好');
  });

  it('UTF-16 BE BOM：剥离 BOM 并解码', () => {
    const { text, encoding } = decodeText(bytesOf([...UTF16BE_BOM, ...UTF16BE_你好]));
    expect(encoding).toBe('utf-16be');
    expect(text).toBe('你好');
  });

  it('空字节解码为空字符串', () => {
    const { text, encoding } = decodeText(bytesOf([]));
    expect(encoding).toBe('utf-8');
    expect(text).toBe('');
  });
});
