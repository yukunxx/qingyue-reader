/** 每页固定字数（文档选定「最快方式」——按固定字符数切片）。 */
export const CHARS_PER_PAGE = 720;

/** 总页数，空文本视为 1 页。 */
export function totalPages(text: string): number {
  if (!text) return 1;
  return Math.max(1, Math.ceil(text.length / CHARS_PER_PAGE));
}

/** 第 page 页的文本（页下标越界自动钳制到合法范围）。 */
export function pageAt(text: string, page: number): string {
  const total = totalPages(text);
  const idx = Math.max(0, Math.min(total - 1, Math.floor(page)));
  const start = idx * CHARS_PER_PAGE;
  return text.slice(start, start + CHARS_PER_PAGE);
}
