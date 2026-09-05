import type { Bookmark, Highlight } from '../types';

export interface TextSegment {
  text: string;
  highlighted: boolean;
}

/**
 * 将高亮的绝对字符区间映射到当前页内的相对区间（裁剪并排序）。
 * @param pageStart 当前页在全文中的起始字符偏移
 * @param pageLen 当前页文本长度
 */
export function pageHighlightRanges(
  highlights: Highlight[],
  pageStart: number,
  pageLen: number,
): Array<[number, number]> {
  const pageEnd = pageStart + pageLen;
  const ranges: Array<[number, number]> = [];
  for (const h of highlights) {
    const s = Math.max(h.start, pageStart);
    const e = Math.min(h.end, pageEnd);
    if (e > s) ranges.push([s - pageStart, e - pageStart]);
  }
  ranges.sort((a, b) => a[0] - b[0]);
  return ranges;
}

/** 按相对区间切分文本，合并重叠/相邻区间，产出带高亮标记的文本段。 */
export function splitByHighlightRanges(
  text: string,
  ranges: Array<[number, number]>,
): TextSegment[] {
  if (!text) return [];

  const merged: Array<[number, number]> = [];
  for (const [s, e] of ranges) {
    const last = merged[merged.length - 1];
    if (last && s <= last[1]) {
      last[1] = Math.max(last[1], e);
    } else {
      merged.push([s, e]);
    }
  }

  if (merged.length === 0) return text ? [{ text, highlighted: false }] : [];

  const segments: TextSegment[] = [];
  let cursor = 0;
  for (const [s, e] of merged) {
    if (s > cursor) segments.push({ text: text.slice(cursor, s), highlighted: false });
    if (e > s) segments.push({ text: text.slice(s, e), highlighted: true });
    cursor = Math.max(cursor, e);
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), highlighted: false });
  return segments;
}

/** 返回指定字符偏移处已存在的书签（用于切换显示态）。 */
export function bookmarkAtOffset(bookmarks: Bookmark[], offset: number): Bookmark | undefined {
  return bookmarks.find((b) => b.offset === offset);
}
