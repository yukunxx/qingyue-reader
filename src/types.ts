export type Encoding = 'utf-8' | 'utf-16le' | 'utf-16be' | 'gb18030';

export type Theme = 'day' | 'sepia' | 'night';

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
}

export interface ReaderSettings {
  fontSize: number;
  lineHeight: number;
  theme: Theme;
}
