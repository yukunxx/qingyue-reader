import { useEffect, useMemo, useRef, useState } from 'react';
import { useBookStore } from '../../store/bookStore';
import { CHARS_PER_PAGE, pageAt, totalPages } from '../../lib/pagination';
import { chapterIndexAt, parseChapters } from '../../lib/chapters';
import {
  bookmarkAtOffset,
  pageHighlightRanges,
  splitByHighlightRanges,
} from '../../lib/annotations';
import SettingsPanel from '../Settings/SettingsPanel';
import ReaderNav, { type NavTab } from './ReaderNav';
import SearchPanel from './SearchPanel';
import type { Theme } from '../../types';
import styles from './Reader.module.css';

const THEME_ORDER: Theme[] = ['day', 'sepia', 'night'];

interface Selecting {
  start: number;
  end: number;
  x: number;
  y: number;
}

export default function Reader() {
  const book = useBookStore((s) => s.books.find((b) => b.id === s.currentId));
  const currentPage = useBookStore((s) => s.currentPage);
  const settings = useBookStore((s) => s.settings);
  const bookmarks = useBookStore((s) => s.bookmarks);
  const highlights = useBookStore((s) => s.highlights);
  const gotoPage = useBookStore((s) => s.gotoPage);
  const closeBook = useBookStore((s) => s.closeBook);
  const setTheme = useBookStore((s) => s.setTheme);
  const addBookmark = useBookStore((s) => s.addBookmark);
  const removeBookmark = useBookStore((s) => s.removeBookmark);
  const addHighlight = useBookStore((s) => s.addHighlight);
  const removeHighlight = useBookStore((s) => s.removeHighlight);
  const addReadingTime = useBookStore((s) => s.addReadingTime);

  const [panelOpen, setPanelOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [navTab, setNavTab] = useState<NavTab>('catalog');
  const [selecting, setSelecting] = useState<Selecting | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  // 书籍内容导入后不可变，按 book.id 缓存章节解析，避免翻页时重复扫描全文
  const chapters = useMemo(() => (book ? parseChapters(book.content) : []), [book?.id]);

  const total = book ? totalPages(book.content) : 1;
  const pageText = book ? pageAt(book.content, currentPage) : '';

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [currentPage]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        gotoPage(currentPage - 1);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        gotoPage(currentPage + 1);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [currentPage, gotoPage]);

  // 阅读时长：打开阅读器期间按 15s 间隔累计，关闭时结算剩余时长
  useEffect(() => {
    if (!book) return;
    const bookId = book.id;
    let lastReport = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - lastReport) / 1000);
      if (elapsed > 0) addReadingTime(bookId, elapsed);
      lastReport = now;
    }, 15000);
    return () => {
      clearInterval(timer);
      const elapsed = Math.floor((Date.now() - lastReport) / 1000);
      if (elapsed > 0) addReadingTime(bookId, elapsed);
    };
  }, [book?.id, addReadingTime]);

  if (!book) return null;

  const pageStart = currentPage * CHARS_PER_PAGE;
  const currentOffset = pageStart;
  const currentChapterIndex = chapterIndexAt(chapters, currentOffset);
  const currentChapterTitle = currentChapterIndex >= 0 ? chapters[currentChapterIndex].title : '';

  const bookBookmarks = bookmarks.filter((b) => b.bookId === book.id);
  const bookHighlights = highlights.filter((h) => h.bookId === book.id);
  const currentBookmark = bookmarkAtOffset(bookBookmarks, currentOffset);

  const ranges = pageHighlightRanges(bookHighlights, pageStart, pageText.length);
  const segments = splitByHighlightRanges(pageText, ranges);

  function goToChapter(idx: number) {
    const ch = chapters[idx];
    if (!ch) return;
    gotoPage(Math.floor(ch.start / CHARS_PER_PAGE));
  }

  function goPrevChapter() {
    if (currentChapterIndex > 0) goToChapter(currentChapterIndex - 1);
  }

  function goNextChapter() {
    if (currentChapterIndex >= 0 && currentChapterIndex < chapters.length - 1) {
      goToChapter(currentChapterIndex + 1);
    }
  }

  const toggleBookmark = () => {
    if (currentBookmark) removeBookmark(currentBookmark.id);
    else addBookmark(book.id, currentOffset);
  };

  function handleSelectionEnd() {
    const root = pageRef.current;
    if (!root) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      setSelecting(null);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
      setSelecting(null);
      return;
    }
    const pre = range.cloneRange();
    pre.selectNodeContents(root);
    pre.setEnd(range.startContainer, range.startOffset);
    const start = pre.toString().length;
    const full = range.cloneRange();
    full.selectNodeContents(root);
    full.setEnd(range.endContainer, range.endOffset);
    const end = full.toString().length;
    if (end <= start) {
      setSelecting(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    setSelecting({ start, end, x: rect.left + rect.width / 2, y: rect.top });
  }

  const confirmHighlight = () => {
    if (!selecting) return;
    addHighlight(book.id, pageStart + selecting.start, pageStart + selecting.end);
    window.getSelection()?.removeAllRanges();
    setSelecting(null);
  };

  function cycleTheme() {
    const i = THEME_ORDER.indexOf(settings.theme);
    setTheme(THEME_ORDER[(i + 1) % THEME_ORDER.length]);
  }

  const pct = Math.round(((currentPage + 1) / total) * 100);

  return (
    <div className={`${styles.reader} theme-${settings.theme}`}>
      <div className={styles.top}>
        <button className={styles.iconBtn} onClick={closeBook} title="返回书架">
          ←
        </button>
        <span className={styles.title}>{book.title}</span>
        <button
          className={currentBookmark ? `${styles.iconBtn} ${styles.iconBtnOn}` : styles.iconBtn}
          onClick={toggleBookmark}
          title={currentBookmark ? '取消书签' : '添加书签'}
        >
          🔖
        </button>
        <button
          className={styles.iconBtn}
          onClick={() => {
            setSearchOpen((v) => !v);
            setPanelOpen(false);
            setNavOpen(false);
          }}
          title="全文搜索"
        >
          🔍
        </button>
        <button
          className={styles.iconBtn}
          onClick={() => {
            setNavOpen((v) => !v);
            setPanelOpen(false);
            setSearchOpen(false);
          }}
          title="目录 / 书签 / 高亮"
        >
          ☰
        </button>
        <button className={styles.iconBtn} onClick={cycleTheme} title="切换主题">
          ◐
        </button>
        <button
          className={styles.iconBtn}
          onClick={() => {
            setPanelOpen((v) => !v);
            setNavOpen(false);
            setSearchOpen(false);
          }}
          title="阅读设置"
        >
          Aa
        </button>
      </div>

      {chapters.length > 0 && (
        <div className={styles.chapterBar}>
          <button
            className={styles.chapterNav}
            onClick={goPrevChapter}
            disabled={currentChapterIndex <= 0}
          >
            « 上一章
          </button>
          <span className={styles.chapterTitle}>{currentChapterTitle || '正文'}</span>
          <button
            className={styles.chapterNav}
            onClick={goNextChapter}
            disabled={currentChapterIndex < 0 || currentChapterIndex >= chapters.length - 1}
          >
            下一章 »
          </button>
        </div>
      )}

      {panelOpen && <SettingsPanel />}

      {searchOpen && (
        <SearchPanel
          content={book.content}
          onJump={(offset) => gotoPage(Math.floor(offset / CHARS_PER_PAGE))}
          onClose={() => setSearchOpen(false)}
        />
      )}

      {navOpen && (
        <ReaderNav
          tab={navTab}
          onTabChange={setNavTab}
          onClose={() => setNavOpen(false)}
          chapters={chapters}
          currentChapterIndex={currentChapterIndex}
          bookmarks={bookBookmarks}
          highlights={bookHighlights}
          bookContent={book.content}
          onJumpToOffset={(offset) => gotoPage(Math.floor(offset / CHARS_PER_PAGE))}
          onRemoveBookmark={removeBookmark}
          onRemoveHighlight={removeHighlight}
        />
      )}

      <div className={styles.body} ref={bodyRef}>
        <div
          ref={pageRef}
          className={styles.page}
          style={{ fontSize: settings.fontSize + 'px', lineHeight: settings.lineHeight }}
          onMouseUp={handleSelectionEnd}
        >
          {segments.map((seg, i) =>
            seg.highlighted ? <mark key={i}>{seg.text}</mark> : seg.text,
          )}
        </div>
      </div>

      {selecting && (
        <button
          className={styles.highlightBtn}
          style={{ left: selecting.x, top: selecting.y }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={confirmHighlight}
        >
          划线
        </button>
      )}

      <div className={styles.bottom}>
        <div className={styles.pager}>
          <button
            className={styles.iconBtn}
            onClick={() => gotoPage(currentPage - 1)}
            disabled={currentPage <= 0}
            title="上一页"
          >
            ‹
          </button>
          <span className={styles.meta}>
            {currentPage + 1} / {total}
          </span>
          <button
            className={styles.iconBtn}
            onClick={() => gotoPage(currentPage + 1)}
            disabled={currentPage >= total - 1}
            title="下一页"
          >
            ›
          </button>
        </div>
        <input
          className={styles.slider}
          type="range"
          min={0}
          max={total - 1}
          value={currentPage}
          onChange={(e) => gotoPage(parseInt(e.target.value, 10))}
        />
        <span className={styles.meta}>{pct}%</span>
      </div>
    </div>
  );
}
