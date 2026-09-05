export interface SearchResult {
  /** 匹配项在全文中的字符偏移 */
  index: number;
  /** 带上下文的片段（已折叠空白，首尾可能带省略号） */
  snippet: string;
}

export interface SearchOptions {
  /** 最多返回的匹配数 */
  limit?: number;
  /** 匹配项两侧各保留的上下文字符数 */
  context?: number;
}

/**
 * 在全文内做大小写不敏感的子串搜索，返回匹配偏移与上下文片段。
 * 使用 indexOf 顺序扫描，O(n)，可处理 MB 级文本。
 */
export function searchText(text: string, query: string, options: SearchOptions = {}): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const limit = options.limit ?? 200;
  const context = options.context ?? 24;
  const lower = text.toLowerCase();
  const results: SearchResult[] = [];
  let from = 0;

  while (results.length < limit) {
    const idx = lower.indexOf(q, from);
    if (idx === -1) break;

    const start = Math.max(0, idx - context);
    const end = Math.min(text.length, idx + q.length + context);
    let snippet = text.slice(start, end);
    if (start > 0) snippet = '…' + snippet;
    if (end < text.length) snippet += '…';
    snippet = snippet.replace(/\s+/g, ' ');

    results.push({ index: idx, snippet });
    from = idx + q.length;
  }

  return results;
}
