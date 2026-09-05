import { openDB, type IDBPDatabase, type DBSchema } from 'idb';
import type { Book, Bookmark, Highlight, ReaderSettings } from '../types';

export const DB_NAME = 'qingyue-db';
export const DB_VERSION = 2;
export const SETTINGS_KEY = 'reader';

export const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 19,
  lineHeight: 1.9,
  theme: 'day',
};

interface SettingsRecord extends ReaderSettings {
  key: string;
}

interface QingyueDB extends DBSchema {
  books: {
    key: string;
    value: Book;
  };
  settings: {
    key: string;
    value: SettingsRecord;
  };
  bookmarks: {
    key: string;
    value: Bookmark;
  };
  highlights: {
    key: string;
    value: Highlight;
  };
}

let dbPromise: Promise<IDBPDatabase<QingyueDB>> | null = null;

function getDB(): Promise<IDBPDatabase<QingyueDB>> {
  if (!dbPromise) {
    dbPromise = openDB<QingyueDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('books')) {
          db.createObjectStore('books', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('bookmarks')) {
          db.createObjectStore('bookmarks', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('highlights')) {
          db.createObjectStore('highlights', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function getAllBooks(): Promise<Book[]> {
  const db = await getDB();
  return db.getAll('books');
}

export async function putBook(book: Book): Promise<void> {
  const db = await getDB();
  await db.put('books', book);
}

export async function deleteBook(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('books', id);
}

export async function getSettings(): Promise<ReaderSettings | undefined> {
  const db = await getDB();
  const rec = await db.get('settings', SETTINGS_KEY);
  if (!rec) return undefined;
  return { fontSize: rec.fontSize, lineHeight: rec.lineHeight, theme: rec.theme };
}

export async function putSettings(settings: ReaderSettings): Promise<void> {
  const db = await getDB();
  await db.put('settings', { key: SETTINGS_KEY, ...settings });
}

export async function getAllBookmarks(): Promise<Bookmark[]> {
  const db = await getDB();
  return db.getAll('bookmarks');
}

export async function putBookmark(bookmark: Bookmark): Promise<void> {
  const db = await getDB();
  await db.put('bookmarks', bookmark);
}

export async function deleteBookmark(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('bookmarks', id);
}

export async function getAllHighlights(): Promise<Highlight[]> {
  const db = await getDB();
  return db.getAll('highlights');
}

export async function putHighlight(highlight: Highlight): Promise<void> {
  const db = await getDB();
  await db.put('highlights', highlight);
}

export async function deleteHighlight(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('highlights', id);
}
