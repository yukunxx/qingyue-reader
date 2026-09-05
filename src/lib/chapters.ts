import type { Chapter } from '../types';

/** 匹配「第X章」/「序章」/「楔子」/「番外」等行首章节标题。 */
const CHAPTER_HEADING_RE =
  /^[ \t]*((?:第[0-9零一二三四五六七八九十百千万两]+[章卷节回部集篇]|序章|序言|楔子|前言|后记|尾声|番外)[^\r\n]*?)[ \t]*$/gm;

/**
 * 从纯文本中按行首正则识别章节标题，返回章节列表（按出现顺序）。
 * 支持 UTF-8 / GBK 解码后的任意行尾（\n 或 \r\n）。
 */
export function parseChapters(text: string): Chapter[] {
  const chapters: Chapter[] = [];
  for (const m of text.matchAll(CHAPTER_HEADING_RE)) {
    const title = (m[1] ?? '').trim();
    if (title) chapters.push({ title, start: m.index ?? 0 });
  }
  return chapters;
}

/**
 * 返回字符偏移 offset 所在的章节下标（最后一个 start <= offset 的章节）。
 * 若在第一个章节之前，返回 -1。
 */
export function chapterIndexAt(chapters: Chapter[], offset: number): number {
  let lo = 0;
  let hi = chapters.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (chapters[mid].start <= offset) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}
