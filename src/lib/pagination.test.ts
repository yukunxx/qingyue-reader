import { describe, expect, it } from 'vitest';
import { CHARS_PER_PAGE, pageAt, readingProgress, totalPages } from './pagination';

function repeat(s: string, n: number): string {
  return Array.from({ length: n }, () => s).join('');
}

describe('totalPages', () => {
  it('空文本视为 1 页', () => {
    expect(totalPages('')).toBe(1);
  });

  it('恰好整页', () => {
    expect(totalPages(repeat('a', CHARS_PER_PAGE))).toBe(1);
  });

  it('超出一个字符则多一页', () => {
    expect(totalPages(repeat('a', CHARS_PER_PAGE + 1))).toBe(2);
  });

  it('末页不满', () => {
    expect(totalPages(repeat('a', CHARS_PER_PAGE * 3 - 1))).toBe(3);
  });
});

describe('pageAt', () => {
  it('返回第 0 页的前 CHARS_PER_PAGE 个字符', () => {
    const text = repeat('a', CHARS_PER_PAGE + 5);
    expect(pageAt(text, 0).length).toBe(CHARS_PER_PAGE);
  });

  it('末页不满时返回剩余字符', () => {
    const text = repeat('a', CHARS_PER_PAGE + 5);
    expect(pageAt(text, 1).length).toBe(5);
  });

  it('空文本返回空字符串', () => {
    expect(pageAt('', 0)).toBe('');
  });

  it('负页下标钳制到第 0 页', () => {
    const text = repeat('a', CHARS_PER_PAGE + 5);
    expect(pageAt(text, -3)).toBe(pageAt(text, 0));
  });

  it('越界页下标钳制到最后一页', () => {
    const text = repeat('a', CHARS_PER_PAGE + 5);
    expect(pageAt(text, 999)).toBe(pageAt(text, 1));
  });

  it('不同页内容正确切片', () => {
    const text = repeat('x', CHARS_PER_PAGE) + 'TAIL';
    expect(pageAt(text, 1)).toBe('TAIL');
  });
});

describe('readingProgress', () => {
  it('未开始（page 为 0）返回 0%', () => {
    expect(readingProgress(0, 5)).toBe(0);
  });

  it('负页下标视为未开始返回 0%', () => {
    expect(readingProgress(-3, 5)).toBe(0);
  });

  it('第 2 页（下标 1）/ 共 5 页返回 40%', () => {
    expect(readingProgress(1, 5)).toBe(40);
  });

  it('最后一页返回 100%', () => {
    expect(readingProgress(4, 5)).toBe(100);
  });

  it('单页书未开始返回 0%，不出现除零', () => {
    expect(readingProgress(0, 1)).toBe(0);
  });
});
