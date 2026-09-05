import { create } from 'zustand';
import type { Book, Bookmark, Highlight, ReaderSettings, Theme } from '../types';
import { decodeText } from '../lib/encoding';
import { totalPages } from '../lib/pagination';
import {
  DEFAULT_SETTINGS,
  deleteBook as dbDeleteBook,
  deleteBookmark,
  deleteHighlight,
  deleteStat,
  getAllBookmarks,
  getAllBooks,
  getAllHighlights,
  getAllStats,
  getSettings,
  putBook,
  putBookmark,
  putHighlight,
  putSettings,
  putStat,
} from '../lib/db';

/** 封面色数量，与实际渐变数组长度保持一致。 */
export const COVER_COUNT = 5;

function genId(prefix: string): string {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

interface BookState {
  books: Book[];
  bookmarks: Bookmark[];
  highlights: Highlight[];
  /** bookId → 累计阅读秒数 */
  stats: Record<string, number>;
  currentId: string | null;
  currentPage: number;
  settings: ReaderSettings;
  loaded: boolean;
  loadAll: () => Promise<void>;
  importFiles: (files: File[] | FileList) => Promise<number>;
  deleteBook: (id: string) => Promise<void>;
  openBook: (id: string) => void;
  closeBook: () => void;
  gotoPage: (page: number) => void;
  setFontSize: (n: number) => void;
  setLineHeight: (n: number) => void;
  setTheme: (t: Theme) => void;
  addBookmark: (bookId: string, offset: number) => Promise<void>;
  removeBookmark: (id: string) => Promise<void>;
  addHighlight: (bookId: string, start: number, end: number) => Promise<void>;
  removeHighlight: (id: string) => Promise<void>;
  addReadingTime: (bookId: string, seconds: number) => Promise<void>;
}

let progressTimer: ReturnType<typeof setTimeout> | null = null;
let settingsTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleProgress(book: Book): void {
  if (progressTimer) clearTimeout(progressTimer);
  progressTimer = setTimeout(() => {
    progressTimer = null;
    putBook(book).catch(() => {});
  }, 300);
}

function flushProgressNow(book: Book): void {
  if (progressTimer) {
    clearTimeout(progressTimer);
    progressTimer = null;
  }
  putBook(book).catch(() => {});
}

function scheduleSettings(settings: ReaderSettings): void {
  if (settingsTimer) clearTimeout(settingsTimer);
  settingsTimer = setTimeout(() => {
    settingsTimer = null;
    putSettings(settings).catch(() => {});
  }, 300);
}

export const useBookStore = create<BookState>((set, get) => ({
  books: [],
  bookmarks: [],
  highlights: [],
  stats: {},
  currentId: null,
  currentPage: 0,
  settings: DEFAULT_SETTINGS,
  loaded: false,

  loadAll: async () => {
    const [books, settings, bookmarks, highlights, stats] = await Promise.all([
      getAllBooks(),
      getSettings(),
      getAllBookmarks(),
      getAllHighlights(),
      getAllStats(),
    ]);
    books.sort((a, b) => b.lastAt - a.lastAt);
    const statsMap: Record<string, number> = {};
    for (const s of stats) statsMap[s.bookId] = s.seconds;
    set({ books, settings: settings ?? DEFAULT_SETTINGS, bookmarks, highlights, stats: statsMap, loaded: true });
  },

  importFiles: async (files) => {
    const list = Array.from(files).filter(
      (f) => /\.txt$/i.test(f.name) || f.type === 'text/plain',
    );
    const newBooks: Book[] = [];

    for (const file of list) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { text, encoding } = decodeText(bytes);
      if (!text.trim()) continue;

      const book: Book = {
        id: genId('b'),
        title: file.name.replace(/\.txt$/i, ''),
        author: '本地导入',
        content: text,
        size: file.size,
        encoding,
        cover: String(Math.floor(Math.random() * COVER_COUNT)),
        createdAt: Date.now(),
        lastAt: Date.now(),
        lastPage: 0,
      };
      newBooks.push(book);
    }

    if (newBooks.length > 0) {
      await Promise.all(newBooks.map((b) => putBook(b)));
      set((s) => ({
        books: [...newBooks, ...s.books].sort((a, b) => b.lastAt - a.lastAt),
      }));
    }

    return newBooks.length;
  },

  deleteBook: async (id) => {
    await dbDeleteBook(id);
    await deleteStat(id);
    const bms = get().bookmarks.filter((b) => b.bookId === id);
    const hls = get().highlights.filter((h) => h.bookId === id);
    if (bms.length || hls.length) {
      await Promise.all([
        ...bms.map((b) => deleteBookmark(b.id)),
        ...hls.map((h) => deleteHighlight(h.id)),
      ]);
    }
    set((s) => {
      const isCurrent = s.currentId === id;
      const stats = { ...s.stats };
      delete stats[id];
      return {
        books: s.books.filter((b) => b.id !== id),
        bookmarks: s.bookmarks.filter((b) => b.bookId !== id),
        highlights: s.highlights.filter((h) => h.bookId !== id),
        stats,
        currentId: isCurrent ? null : s.currentId,
        currentPage: isCurrent ? 0 : s.currentPage,
      };
    });
  },

  openBook: (id) => {
    const book = get().books.find((b) => b.id === id);
    if (!book) return;
    const total = totalPages(book.content);
    const page = Math.max(0, Math.min(book.lastPage, total - 1));
    set({ currentId: id, currentPage: page });
  },

  closeBook: () => {
    const { currentId, currentPage, books } = get();
    const book = currentId ? books.find((b) => b.id === currentId) : undefined;
    if (book) {
      const updated: Book = { ...book, lastPage: currentPage, lastAt: Date.now() };
      set((s) => ({
        books: s.books.map((b) => (b.id === currentId ? updated : b)).sort((a, b) => b.lastAt - a.lastAt),
      }));
      flushProgressNow(updated);
    }
    set({ currentId: null });
  },

  gotoPage: (page) => {
    const { currentId, books } = get();
    if (!currentId) return;
    const book = books.find((b) => b.id === currentId);
    if (!book) return;

    const total = totalPages(book.content);
    const clamped = Math.max(0, Math.min(total - 1, Math.floor(page)));
    const updated: Book = { ...book, lastPage: clamped, lastAt: Date.now() };

    set((s) => ({
      currentPage: clamped,
      books: s.books.map((b) => (b.id === currentId ? updated : b)),
    }));
    scheduleProgress(updated);
  },

  setFontSize: (n) => {
    const settings = { ...get().settings, fontSize: n };
    set({ settings });
    scheduleSettings(settings);
  },

  setLineHeight: (n) => {
    const settings = { ...get().settings, lineHeight: n };
    set({ settings });
    scheduleSettings(settings);
  },

  setTheme: (t) => {
    const settings = { ...get().settings, theme: t };
    set({ settings });
    scheduleSettings(settings);
  },

  addBookmark: async (bookId, offset) => {
    const bookmark: Bookmark = { id: genId('bk'), bookId, offset, createdAt: Date.now() };
    await putBookmark(bookmark);
    set((s) => ({ bookmarks: [bookmark, ...s.bookmarks] }));
  },

  removeBookmark: async (id) => {
    await deleteBookmark(id);
    set((s) => ({ bookmarks: s.bookmarks.filter((b) => b.id !== id) }));
  },

  addHighlight: async (bookId, start, end) => {
    if (end <= start) return;
    const highlight: Highlight = { id: genId('hl'), bookId, start, end, createdAt: Date.now() };
    await putHighlight(highlight);
    set((s) => ({ highlights: [highlight, ...s.highlights] }));
  },

  removeHighlight: async (id) => {
    await deleteHighlight(id);
    set((s) => ({ highlights: s.highlights.filter((h) => h.id !== id) }));
  },

  addReadingTime: async (bookId, seconds) => {
    if (seconds <= 0) return;
    const next = (get().stats[bookId] ?? 0) + Math.floor(seconds);
    set((s) => ({ stats: { ...s.stats, [bookId]: next } }));
    await putStat({ bookId, seconds: next });
  },
}));
