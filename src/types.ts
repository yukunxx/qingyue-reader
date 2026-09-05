export type Encoding = 'utf-8' | 'utf-16le' | 'utf-16be' | 'gb18030';

export type Theme = 'day' | 'sepia' | 'night';

export interface Chapter {
  /** 章节标题 */
  title: string;
  /** 章节在正文中的字符偏移 */
  start: number;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  content: string;
  size: number;
  encoding: Encoding;
  /** 封面色 key（用于渐变配色） */
  cover: string;
  createdAt: number;
  /** 最近阅读时间戳（书架排序依据） */
  lastAt: number;
  /** 阅读进度（页下标） */
  lastPage: number;
  /** 显式章节（EPUB 等结构化来源）；TXT 未设置时由正则识别 */
  chapters?: Chapter[];
}

export interface ReaderSettings {
  fontSize: number;
  lineHeight: number;
  theme: Theme;
}

export interface Bookmark {
  id: string;
  bookId: string;
  /** 书签所在字符偏移 */
  offset: number;
  createdAt: number;
}

export interface Highlight {
  id: string;
  bookId: string;
  /** 高亮起始字符偏移（含） */
  start: number;
  /** 高亮结束字符偏移（不含） */
  end: number;
  createdAt: number;
}

export interface ReadingStat {
  bookId: string;
  /** 累计阅读秒数 */
  seconds: number;
}
