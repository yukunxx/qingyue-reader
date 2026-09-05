import { create } from 'zustand';
import type { Book, ReaderSettings, Theme } from '../types';
import { decodeText } from '../lib/encoding';
import { totalPages } from '../lib/pagination';
import {
  DEFAULT_SETTINGS,
  deleteBook as dbDeleteBook,
  getAllBooks,
  getSettings,
  putBook,
  putSettings,
} from '../lib/db';

/** 封面色数量，与实际渐变数组长度保持一致。 */
export const COVER_COUNT = 5;

interface BookState {
  books: Book[];
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
  currentId: null,
  currentPage: 0,
  settings: DEFAULT_SETTINGS,
  loaded: false,

  loadAll: async () => {
    const [books, settings] = await Promise.all([getAllBooks(), getSettings()]);
    books.sort((a, b) => b.lastAt - a.lastAt);
    set({ books, settings: settings ?? DEFAULT_SETTINGS, loaded: true });
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
        id: 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
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
    set((s) => {
      const isCurrent = s.currentId === id;
      return {
        books: s.books.filter((b) => b.id !== id),
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
}));
