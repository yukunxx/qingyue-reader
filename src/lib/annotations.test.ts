import { describe, expect, it } from 'vitest';
import { bookmarkAtOffset, pageHighlightRanges, splitByHighlightRanges } from './annotations';
import type { Bookmark, Highlight } from '../types';

const hl = (id: string, start: number, end: number): Highlight => ({
  id,
  bookId: 'b1',
  start,
  end,
  createdAt: 0,
});

describe('pageHighlightRanges', () => {
  it('映射并裁剪到当前页', () => {
    const ranges = pageHighlightRanges([hl('h1', 10, 30)], 20, 100); // 页 [20,120)
    expect(ranges).toEqual([[0, 10]]);
  });

  it('仅返回与当前页相交的区间', () => {
    const highlights = [hl('a', 0, 5), hl('b', 40, 80)];
    // 页 [20,50)：a 在前不重叠，b 相交 → 映射为 [20,30]
    expect(pageHighlightRanges(highlights, 20, 30)).toEqual([[20, 30]]);
  });

  it('空高亮返回空数组', () => {
    expect(pageHighlightRanges([], 0, 10)).toEqual([]);
  });
});

describe('splitByHighlightRanges', () => {
  it('无区间时整段为未高亮', () => {
    expect(splitByHighlightRanges('abcdef', [])).toEqual([{ text: 'abcdef', highlighted: false }]);
  });

  it('中间一段高亮', () => {
    expect(splitByHighlightRanges('abcdef', [[2, 4]])).toEqual([
      { text: 'ab', highlighted: false },
      { text: 'cd', highlighted: true },
      { text: 'ef', highlighted: false },
    ]);
  });

  it('重叠区间合并', () => {
    expect(
      splitByHighlightRanges('abcdefgh', [
        [1, 4],
        [3, 6],
      ]),
    ).toEqual([
      { text: 'a', highlighted: false },
      { text: 'bcdef', highlighted: true },
      { text: 'gh', highlighted: false },
    ]);
  });

  it('从头高亮到末尾', () => {
    expect(splitByHighlightRanges('abcd', [[0, 4]])).toEqual([{ text: 'abcd', highlighted: true }]);
  });

  it('空文本返回空数组', () => {
    expect(splitByHighlightRanges('', [[0, 1]])).toEqual([]);
  });
});

describe('bookmarkAtOffset', () => {
  const bookmarks: Bookmark[] = [
    { id: 'k1', bookId: 'b1', offset: 0, createdAt: 1 },
    { id: 'k2', bookId: 'b1', offset: 720, createdAt: 2 },
  ];

  it('命中已有书签', () => {
    expect(bookmarkAtOffset(bookmarks, 720)?.id).toBe('k2');
  });

  it('未命中返回 undefined', () => {
    expect(bookmarkAtOffset(bookmarks, 100)).toBeUndefined();
  });
});
